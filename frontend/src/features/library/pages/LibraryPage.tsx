import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Library, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, assetUrl } from "@/api";
import type { LibraryItem } from "@/types";

type LibrarySortMode = "lastRead" | "updated" | "title" | "status" | "favorite";

const tabs: Array<{ label: string; value: "READING" | "FAVORITES" | "COMPLETED" | "PAUSED" }> = [
  { label: "Reading", value: "READING" },
  { label: "Favorites", value: "FAVORITES" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Paused", value: "PAUSED" }
];

export function LibraryPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("READING");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("lastRead");
  const queryClient = useQueryClient();
  const library = useQuery({ queryKey: ["library"], queryFn: api.getLibrary });
  const updateLibrary = useMutation({
    mutationFn: ({ mangaId, input }: { mangaId: string; input: Partial<Pick<LibraryItem, "status" | "isFavorite">> }) => api.upsertLibrary(mangaId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] })
  });
  const removeLibrary = useMutation({
    mutationFn: api.removeLibrary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] })
  });
  const items = useMemo(() => {
    const all = library.data?.data ?? [];
    const tabbed = tab === "FAVORITES" ? all.filter((item) => item.isFavorite) : all.filter((item) => item.status === tab);
    return sortLibraryItems(filterLibraryItems(tabbed, query), sortMode);
  }, [library.data?.data, query, sortMode, tab]);
  const hasActiveFilters = query.trim().length > 0 || sortMode !== "lastRead";
  const clearFilters = () => {
    setQuery("");
    setSortMode("lastRead");
  };

  if (library.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading library...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Personal shelf</p>
        <h1 className="text-3xl font-black">Library</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button key={item.value} className={`btn min-h-9 text-sm ${tab === item.value ? "bg-[var(--surface-strong)] text-[var(--accent)]" : ""}`} onClick={() => setTab(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <section className="surface rounded-lg p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
          <label className="control flex min-h-11 items-center gap-2 rounded-lg px-3">
            <Search size={17} color="var(--accent)" />
            <input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, tag, or status..." />
          </label>
          <select className="control min-h-11 rounded-lg px-3 text-sm" value={sortMode} onChange={(event) => setSortMode(event.target.value as LibrarySortMode)} aria-label="Sort library">
            <option value="lastRead">Last read</option>
            <option value="updated">Recently updated</option>
            <option value="title">Title A-Z</option>
            <option value="status">Status</option>
            <option value="favorite">Favorite first</option>
          </select>
          {hasActiveFilters ? (
            <button className="btn min-h-11 text-sm" onClick={clearFilters} type="button">
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
          <span className="chapter-legend">{tabs.find((item) => item.value === tab)?.label ?? tab}</span>
          <span className="chapter-legend">{items.length} shown</span>
          <span className="chapter-legend">{sortLabel(sortMode)}</span>
          {query.trim() ? <span className="chapter-legend">Search: {query.trim()}</span> : null}
        </div>
      </section>
      {!library.data?.data.length ? (
        <div className="surface rounded-lg p-8 text-center">
          <Library className="mx-auto mb-3 text-[var(--accent)]" />
          <p className="text-[var(--muted)]">Follow a manga to start building your shelf.</p>
          <Link className="btn btn-primary mt-4" to="/search">
            Find manga
          </Link>
        </div>
      ) : !items.length ? (
        <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">No manga matches this shelf view.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="surface grid grid-cols-[74px_1fr] gap-4 rounded-lg p-3">
              <Link to={`/manga/${item.mangaId}`} className="manga-cover-frame rounded-md">
                {item.manga?.coverUrl ? <img className="h-full w-full object-cover" src={assetUrl(item.manga.coverUrl)} alt={item.manga.title} /> : null}
              </Link>
              <div className="min-w-0 space-y-3">
                <div>
                  <Link to={`/manga/${item.mangaId}`} className="line-clamp-2 font-bold hover:text-[var(--accent)]">
                    {item.manga?.title ?? item.mangaId}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="manga-status-badge">{item.status}</span>
                    {item.isFavorite ? <span className="manga-status-badge">Favorite</span> : null}
                    <span>{formatLibraryDate(item)}</span>
                  </div>
                  {item.readingProgress ? (
                    <Link className="mt-2 inline-block text-sm text-[var(--accent)]" to={`/read/${item.readingProgress.chapterId}?mangaId=${item.mangaId}`}>
                      Continue chapter · page {item.readingProgress.pageIndex + 1}
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn min-h-8 px-2 text-xs" onClick={() => updateLibrary.mutate({ mangaId: item.mangaId, input: { isFavorite: !item.isFavorite, status: item.status } })}>
                    <Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                    Favorite
                  </button>
                  <select
                    className="control min-h-8 rounded-md px-2 text-xs"
                    value={item.status}
                    onChange={(event) => updateLibrary.mutate({ mangaId: item.mangaId, input: { status: event.target.value as LibraryItem["status"], isFavorite: item.isFavorite } })}
                  >
                    <option value="READING">Reading</option>
                    <option value="PLAN_TO_READ">Plan</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DROPPED">Dropped</option>
                  </select>
                  <button className="btn min-h-8 px-2 text-xs text-[var(--danger)]" onClick={() => removeLibrary.mutate(item.mangaId)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function filterLibraryItems(items: LibraryItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    const manga = item.manga;
    return [manga?.title, item.status, manga?.status, ...(manga?.tags ?? [])].filter(Boolean).some((value) => value!.toLowerCase().includes(needle));
  });
}

function sortLibraryItems(items: LibraryItem[], sortMode: LibrarySortMode) {
  return [...items].sort((a, b) => {
    if (sortMode === "title") return getLibraryTitle(a).localeCompare(getLibraryTitle(b));
    if (sortMode === "status") return a.status.localeCompare(b.status) || getLibraryTitle(a).localeCompare(getLibraryTitle(b));
    if (sortMode === "favorite") return Number(b.isFavorite) - Number(a.isFavorite) || getLibraryActivityTime(b) - getLibraryActivityTime(a);
    if (sortMode === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return getLibraryActivityTime(b) - getLibraryActivityTime(a);
  });
}

function getLibraryTitle(item: LibraryItem) {
  return item.manga?.title ?? item.mangaId;
}

function getLibraryActivityTime(item: LibraryItem) {
  return new Date(item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt ?? item.createdAt).getTime();
}

function formatLibraryDate(item: LibraryItem) {
  const time = getLibraryActivityTime(item);
  return Number.isFinite(time) ? `Last read ${new Date(time).toLocaleDateString()}` : "Not started";
}

function sortLabel(sortMode: LibrarySortMode) {
  if (sortMode === "updated") return "Recently updated";
  if (sortMode === "title") return "Title A-Z";
  if (sortMode === "status") return "Status";
  if (sortMode === "favorite") return "Favorite first";
  return "Last read";
}
