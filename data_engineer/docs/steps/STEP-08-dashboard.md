# STEP-08: HTML/CSS/JS Dashboard

Status: Done

Completion date: 2026-06-05

## Objective

Build a static dashboard report using HTML, CSS, and JavaScript.

## Plan

Create a dashboard that loads exported Gold JSON files and visualizes:

- Total events
- Active users
- Total reading duration
- Top manga
- Genre popularity
- Search query popularity
- Completion rate

Use vanilla HTML, CSS, and JavaScript. Chart.js may be used through CDN for charts.

The dashboard should feel like an analytics report, not a landing page. It should prioritize scanning, comparison, tables, and charts.

## Expected Outputs

- Static dashboard files.
- Dashboard can be served with a simple local HTTP server.
- Charts and tables render from Gold JSON.

## Dashboard Files

- `dashboard/index.html`: report layout, KPI sections, chart canvases, and detail tables.
- `dashboard/styles.css`: responsive report styling for desktop and mobile widths.
- `dashboard/app.js`: loads Gold JSON, renders KPIs, charts, and tables.

## Dashboard Views

- Summary KPIs: total events, active users, reading time, and top genre.
- Top insights: top manga, top search query, chapter reads, and manga count.
- Charts: trending manga, genre popularity, and search demand.
- Tables: reading duration and hourly active user windows.

## Acceptance Criteria

- Dashboard loads without build tooling.
- KPI cards render from `summary_kpis.json`.
- Charts render from Gold JSON files.
- Tables handle empty data without layout breakage.
- UI works on desktop and mobile widths.

## Verification Evidence

- Added static dashboard files under `data_engineer/dashboard`.
- Added README command for serving the dashboard locally.
- Served dashboard locally with:
  `python -m http.server 18083 --bind 127.0.0.1`.
- Verified HTTP responses:
  `http://127.0.0.1:18083/index.html` returned `200`;
  `http://127.0.0.1:18083/data/gold/summary_kpis.json` returned `200`.
- Verified `app.js` syntax with Node `vm.Script`: `app.js syntax ok`.
- Verified dashboard HTML references Chart.js, `app.js`, KPI element IDs, and 3 chart canvases.
- Automated browser rendering could not be run because Playwright is not installed in the current Node REPL environment.
