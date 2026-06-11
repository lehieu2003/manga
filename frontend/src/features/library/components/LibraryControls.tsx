import { Search } from "lucide-react";
import { libraryTabs } from "../library.constants";
import { sortLabel } from "../library.logic";
import type { LibrarySortMode, LibraryTab } from "../library.types";

export function LibraryTabs({ tab, onTabChange }: { tab: LibraryTab; onTabChange: (tab: LibraryTab) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {libraryTabs.map((item) => (
        <button key={item.value} className={`btn min-h-9 text-sm ${tab === item.value ? "bg-[var(--surface-strong)] text-[var(--accent)]" : ""}`} onClick={() => onTabChange(item.value)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function LibraryControls({
  tab,
  query,
  sortMode,
  shownCount,
  hasActiveFilters,
  onQueryChange,
  onSortModeChange,
  onClearFilters
}: {
  tab: LibraryTab;
  query: string;
  sortMode: LibrarySortMode;
  shownCount: number;
  hasActiveFilters: boolean;
  onQueryChange: (query: string) => void;
  onSortModeChange: (sortMode: LibrarySortMode) => void;
  onClearFilters: () => void;
}) {
  return (
    <section className="surface rounded-lg p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
        <label className="control flex min-h-11 items-center gap-2 rounded-lg px-3">
          <Search size={17} color="var(--accent)" />
          <input className="w-full bg-transparent text-sm outline-none" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search title, tag, or status..." />
        </label>
        <select className="control min-h-11 rounded-lg px-3 text-sm" value={sortMode} onChange={(event) => onSortModeChange(event.target.value as LibrarySortMode)} aria-label="Sort library">
          <option value="lastRead">Last read</option>
          <option value="updated">Recently updated</option>
          <option value="title">Title A-Z</option>
          <option value="status">Status</option>
          <option value="favorite">Favorite first</option>
        </select>
        {hasActiveFilters ? (
          <button className="btn min-h-11 text-sm" onClick={onClearFilters} type="button">
            Clear filters
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
        <span className="chapter-legend">{libraryTabs.find((item) => item.value === tab)?.label ?? tab}</span>
        <span className="chapter-legend">{shownCount} shown</span>
        <span className="chapter-legend">{sortLabel(sortMode)}</span>
        {query.trim() ? <span className="chapter-legend">Search: {query.trim()}</span> : null}
      </div>
    </section>
  );
}
