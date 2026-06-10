import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";
import { GenreChips } from "@/features/catalog/components/GenreChips";
import type { GenreSummary } from "@/types";
import { contentRatingOptions, sortOptions, statusOptions } from "./search.constants";
import { getDiscoveryTitle } from "./search.logic";
import type { ContentRating, DiscoveryAction, DiscoveryPreset, DiscoveryState, MangaDiscoverySort, MangaStatus } from "./search.types";

type SearchControlsProps = {
  preset: DiscoveryPreset;
  routeGenre: string;
  defaultSort: MangaDiscoverySort;
  state: DiscoveryState;
  genres: {
    isLoading: boolean;
    data?: { data: GenreSummary[] };
  };
  hasFilters: boolean;
  validYear: number | undefined;
  dispatch: React.Dispatch<DiscoveryAction>;
};

export function SearchControls(props: SearchControlsProps) {
  const { preset, routeGenre, defaultSort, state, genres, hasFilters, validYear, dispatch } = props;

  return (
    <section className="surface rounded-lg p-5">
      <DiscoveryHeader preset={preset} routeGenre={routeGenre} />
      <SearchSortRow preset={preset} query={state.query} sort={state.sort} hasFilters={hasFilters} dispatch={dispatch} routeGenre={routeGenre} defaultSort={defaultSort} />
      <TagFilters genres={genres} includedTags={state.includedTags} excludedTags={state.excludedTags} dispatch={dispatch} />
      <AttributeFilters contentRating={state.contentRating} status={state.status} year={state.year} dispatch={dispatch} />
      <ActiveDiscoveryChips state={state} validYear={validYear} defaultSort={defaultSort} dispatch={dispatch} />
    </section>
  );
}

function DiscoveryHeader({ preset, routeGenre }: { preset: DiscoveryPreset; routeGenre: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Manga discovery</p>
        <h1 className="text-2xl font-black">{getDiscoveryTitle(preset, routeGenre)}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Search MangaDex, tune the shelf filters, and keep the results focused on readable VI/EN chapters.</p>
      </div>
      <Link className="btn min-h-10 text-sm" to={preset === "popular" ? "/discover/latest" : "/discover/popular"}>
        <SlidersHorizontal size={17} />
        {preset === "popular" ? "Latest updates" : "Popular shelf"}
      </Link>
    </div>
  );
}

function SearchSortRow({
  query,
  sort,
  hasFilters,
  dispatch,
  routeGenre,
  defaultSort
}: {
  preset: DiscoveryPreset;
  query: string;
  sort: MangaDiscoverySort;
  hasFilters: boolean;
  dispatch: React.Dispatch<DiscoveryAction>;
  routeGenre: string;
  defaultSort: MangaDiscoverySort;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px_120px] lg:items-end">
      <label>
        <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Title or keyword</span>
        <span className="control flex min-h-12 items-center gap-3 rounded-lg px-3">
          <Search size={20} color="var(--accent)" />
          <input
            id="manga-search"
            className="min-h-12 flex-1 bg-transparent outline-none"
            value={query}
            onChange={(event) => dispatch({ type: "queryChanged", value: event.target.value })}
            placeholder="Title, author, or keyword"
          />
        </span>
      </label>
      <label>
        <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Sort</span>
        <select className="control min-h-12 w-full rounded-lg px-3" value={sort} onChange={(event) => dispatch({ type: "sortChanged", value: event.target.value as MangaDiscoverySort })} aria-label="Sort manga">
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {hasFilters ? (
        <button className="btn min-h-12" onClick={() => dispatch({ type: "cleared", routeGenre, defaultSort })} type="button">
          <X size={17} />
          Clear
        </button>
      ) : null}
    </div>
  );
}

function TagFilters({
  genres,
  includedTags,
  excludedTags,
  dispatch
}: {
  genres: { isLoading: boolean; data?: { data: GenreSummary[] } };
  includedTags: string[];
  excludedTags: string[];
  dispatch: React.Dispatch<DiscoveryAction>;
}) {
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <FilterPanel title="Include tags" subtitle="Use these as manga shelf labels.">
        {genres.isLoading ? (
          <ChipSkeleton />
        ) : (
          <GenreChips genres={genres.data?.data ?? []} limit={18} selected={includedTags} onToggle={(value) => dispatch({ type: "includedTagToggled", value })} />
        )}
      </FilterPanel>
      <FilterPanel title="Exclude tags" subtitle="Hide tags that do not fit the mood.">
        {genres.isLoading ? (
          <ChipSkeleton />
        ) : (
          <GenreChips genres={genres.data?.data ?? []} limit={18} selected={excludedTags} onToggle={(value) => dispatch({ type: "excludedTagToggled", value })} />
        )}
      </FilterPanel>
    </div>
  );
}

function AttributeFilters({ contentRating, status, year, dispatch }: { contentRating: ContentRating[]; status: MangaStatus[]; year: string; dispatch: React.Dispatch<DiscoveryAction> }) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
      <FilterPanel title="Content rating">
        <ToggleGroup options={contentRatingOptions} values={contentRating} onToggle={(value) => dispatch({ type: "contentRatingToggled", value })} />
      </FilterPanel>
      <FilterPanel title="Status">
        <ToggleGroup options={statusOptions} values={status} onToggle={(value) => dispatch({ type: "statusToggled", value })} />
      </FilterPanel>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Year</span>
        <input
          className="control min-h-12 w-full rounded-lg px-3"
          inputMode="numeric"
          value={year}
          onChange={(event) => dispatch({ type: "yearChanged", value: event.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder="2024"
        />
      </label>
    </div>
  );
}

function ActiveDiscoveryChips({ state, validYear, defaultSort, dispatch }: { state: DiscoveryState; validYear: number | undefined; defaultSort: MangaDiscoverySort; dispatch: React.Dispatch<DiscoveryAction> }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
      <span className="chapter-legend">{sortOptions.find((option) => option.value === state.sort)?.label}</span>
      {state.includedTags.map((tag) => (
        <button key={`include-${tag}`} className="chapter-legend" onClick={() => dispatch({ type: "includedTagToggled", value: tag })} type="button">
          Include: {tag}
        </button>
      ))}
      {state.excludedTags.map((tag) => (
        <button key={`exclude-${tag}`} className="chapter-legend" onClick={() => dispatch({ type: "excludedTagToggled", value: tag })} type="button">
          Exclude: {tag}
        </button>
      ))}
      {state.status.map((item) => (
        <button key={item} className="chapter-legend" onClick={() => dispatch({ type: "statusToggled", value: item })} type="button">
          {item}
        </button>
      ))}
      {validYear ? <span className="chapter-legend">Year: {validYear}</span> : null}
      {state.sort !== defaultSort ? <span className="chapter-legend">Custom sort</span> : null}
    </div>
  );
}

function FilterPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--accent-panel)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Filter size={16} color="var(--accent)" />
        <div>
          <p className="text-sm font-bold">{title}</p>
          {subtitle ? <p className="text-xs text-[var(--muted)]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleGroup<T extends string>({ options, values, onToggle }: { options: Array<{ value: T; label: string }>; values: T[]; onToggle: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button key={option.value} className={`genre-chip ${values.includes(option.value) ? "genre-chip-active" : ""}`} onClick={() => onToggle(option.value)} type="button">
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChipSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <span key={index} className="h-9 w-24 animate-pulse rounded-full border border-[var(--line)] bg-[var(--surface-strong)]" />
      ))}
    </div>
  );
}
