const DATA_PATH = "./data/gold/";

const numberFormatter = new Intl.NumberFormat("en-US");

const chartPalette = ["#b33d2e", "#176b69", "#c7932f", "#293241", "#7c5f36", "#4f6f52", "#8b5e83"];

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatDuration(seconds) {
  const totalSeconds = Number(seconds || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function shortLabel(value, maxLength = 28) {
  const label = String(value || "Unknown");
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}...`;
}

async function loadJson(fileName, fallback) {
  const response = await fetch(`${DATA_PATH}${fileName}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}: ${response.status}`);
  }
  const payload = await response.json();
  return payload ?? fallback;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderKpis(summary) {
  setText("generatedAt", `Generated ${summary.generated_at || "N/A"}`);
  setText("totalEvents", formatNumber(summary.total_events));
  setText("activeUsers", formatNumber(summary.active_users));
  setText("readingTime", formatDuration(summary.total_reading_seconds));
  setText("topGenre", summary.top_genre?.genre || "-");
  setText("topGenreMeta", `${formatNumber(summary.top_genre?.popularity_score)} popularity score`);
  setText("topManga", summary.top_manga?.manga_title || "-");
  setText("topSearch", summary.top_search_query?.query || "-");
  setText("chapterReads", formatNumber(summary.chapter_reads));
  setText("mangaWithEvents", formatNumber(summary.manga_with_events));
}

function renderBarChart(canvasId, labels, values, label, horizontal = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          borderColor: "#191714",
          borderWidth: 1,
          backgroundColor: labels.map((_, index) => chartPalette[index % chartPalette.length]),
        },
      ],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${label}: ${formatNumber(context.parsed.x ?? context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "rgba(25, 23, 20, 0.08)",
          },
          ticks: {
            color: "#6a6257",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(25, 23, 20, 0.08)",
          },
          ticks: {
            color: "#6a6257",
          },
        },
      },
    },
  });
}

function renderTables(readingDuration, activeUsers) {
  const durationRows = document.getElementById("durationRows");
  const activeRows = document.getElementById("activeRows");

  durationRows.innerHTML = rowsOrEmpty(
    readingDuration.slice(0, 8).map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.manga_title)}</td>
          <td>${formatNumber(row.read_count)}</td>
          <td>${formatNumber(row.reader_count)}</td>
          <td>${formatDuration(row.total_reading_seconds)}</td>
        </tr>
      `
    ),
    4
  );

  activeRows.innerHTML = rowsOrEmpty(
    activeUsers.slice(0, 8).map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.event_date)}</td>
          <td>${String(row.event_hour).padStart(2, "0")}:00</td>
          <td>${formatNumber(row.active_users)}</td>
          <td>${formatNumber(row.event_count)}</td>
        </tr>
      `
    ),
    4
  );
}

function rowsOrEmpty(rows, columnCount) {
  if (rows.length === 0) {
    return `<tr><td class="empty-row" colspan="${columnCount}">No records available</td></tr>`;
  }
  return rows.join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initDashboard() {
  const [summary, trending, activeUsers, readingDuration, genrePopularity, topSearchQueries] = await Promise.all([
    loadJson("summary_kpis.json", {}),
    loadJson("trending_manga.json", []),
    loadJson("active_users.json", []),
    loadJson("reading_duration.json", []),
    loadJson("genre_popularity.json", []),
    loadJson("top_search_queries.json", []),
  ]);

  renderKpis(summary);
  renderBarChart(
    "trendingChart",
    trending.slice(0, 10).map((row) => shortLabel(row.manga_title, 34)),
    trending.slice(0, 10).map((row) => row.trending_score),
    "Trending score",
    true
  );
  renderBarChart(
    "genreChart",
    genrePopularity.slice(0, 8).map((row) => row.genre),
    genrePopularity.slice(0, 8).map((row) => row.popularity_score),
    "Popularity score"
  );
  renderBarChart(
    "searchChart",
    topSearchQueries.slice(0, 8).map((row) => shortLabel(row.query, 18)),
    topSearchQueries.slice(0, 8).map((row) => row.search_count),
    "Search count"
  );
  renderTables(readingDuration, activeUsers);
}

initDashboard().catch((error) => {
  console.error(error);
  setText("generatedAt", "Dashboard data failed to load");
});
