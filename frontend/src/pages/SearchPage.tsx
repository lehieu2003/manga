import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type React from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { GenreChips } from "../components/GenreChips";
import { MangaCard } from "../components/MangaCard";
import { api } from "../lib/api";

type MangaDiscoverySort = "relevance" | "latest" | "followed" | "title" | "created" | "updated";
type MangaStatus = "ongoing" | "completed" | "hiatus" | "cancelled";
type ContentRating = "safe" | "suggestive";

const sortOptions: Array<{ value: MangaDiscoverySort; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "latest", label: "Latest update" },
  { value: "followed", label: "Followed count" },
  { value: "title", label: "Title A-Z" },
  { value: "created", label: "Created newest" },
  { value: "updated", label: "Updated newest" }
];

const statusOptions: Array<{ value: MangaStatus; label: string }> = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" }
];

const contentRatingOptions: Array<{ value: ContentRating; label: string }> = [
  { value: "safe", label: "Safe" },
  { value: "suggestive", label: "Suggestive" }
];

export function SearchPage() {
  const { genre } = useParams();
  const location = useLocation();
  const preset = location.pathname.includes("/discover/latest") ? "latest" : location.pathname.includes("/discover/popular") ? "popular" : "search";
  const routeGenre = useMemo(() => (genre ? decodeURIComponent(genre) : ""), [genre]);
  const defaultSort = preset === "latest" ? "latest" : preset === "popular" ? "followed" : "relevance";
  const [query, setQuery] = useState("");
  const [includedTags, setIncludedTags] = useState<string[]>(routeGenre ? [routeGenre] : []);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [contentRating, setContentRating] = useState<ContentRating[]>(["safe", "suggestive"]);
  const [status, setStatus] = useState<MangaStatus[]>([]);
  const [year, setYear] = useState("");
  const [sort, setSort] = useState<MangaDiscoverySort>(defaultSort);
  const deferredQuery = useDeferredValue(query);
  const genres = useQuery({ queryKey: ["genres"], queryFn: api.getGenres });
  const parsedYear = year.trim() ? Number(year) : undefined;
  const validYear = parsedYear && Number.isInteger(parsedYear) ? parsedYear : undefined;

  useEffect(() => {
    setIncludedTags(routeGenre ? [routeGenre] : []);
    setExcludedTags([]);
    setSort(defaultSort);
  }, [defaultSort, routeGenre]);

  const result = useInfiniteQuery({
    queryKey: ["manga", "discovery", preset, deferredQuery, includedTags, excludedTags, contentRating, status, validYear, sort],
    queryFn: ({ pageParam }) =>
      api.searchManga({
        q: deferredQuery,
        includedTags,
        excludedTags,
        contentRating,
        status,
        year: validYear,
        sort,
        limit: 24,
        offset: pageParam
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: deferredQuery.length === 0 || deferredQuery.length >= 2
  });
  const pages = result.data?.pages ?? [];
  const manga = pages.flatMap((page) => page.data);
  const source = pages.find((page) => page.source)?.source;
  const hasFilters = includedTags.length > 0 || excludedTags.length > 0 || status.length > 0 || Boolean(validYear) || contentRating.length !== 2 || sort !== defaultSort || query.trim().length > 0;

  const toggleIncludedTag = (name: string) => {
    setIncludedTags((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setExcludedTags((current) => current.filter((item) => item !== name));
  };
  const toggleExcludedTag = (name: string) => {
    setExcludedTags((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setIncludedTags((current) => current.filter((item) => item !== name));
  };
  const clearAll = () => {
    setQuery("");
    setIncludedTags(routeGenre ? [routeGenre] : []);
    setExcludedTags([]);
    setContentRating(["safe", "suggestive"]);
    setStatus([]);
    setYear("");
    setSort(defaultSort);
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-lg p-5">
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

        <div className="grid gap-3 lg:grid-cols-[1fr_220px_120px] lg:items-end">
          <label>
            <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Title or keyword</span>
            <span className="control flex min-h-12 items-center gap-3 rounded-lg px-3">
              <Search size={20} color="var(--accent)" />
              <input id="manga-search" className="min-h-12 flex-1 bg-transparent outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, author, or keyword" />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Sort</span>
            <select className="control min-h-12 w-full rounded-lg px-3" value={sort} onChange={(event) => setSort(event.target.value as MangaDiscoverySort)} aria-label="Sort manga">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button className="btn min-h-12" onClick={clearAll} type="button">
              <X size={17} />
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <FilterPanel title="Include tags" subtitle="Use these as manga shelf labels.">
            {genres.isLoading ? <ChipSkeleton /> : <GenreChips genres={genres.data?.data ?? []} limit={18} selected={includedTags} onToggle={toggleIncludedTag} />}
          </FilterPanel>
          <FilterPanel title="Exclude tags" subtitle="Hide tags that do not fit the mood.">
            {genres.isLoading ? <ChipSkeleton /> : <GenreChips genres={genres.data?.data ?? []} limit={18} selected={excludedTags} onToggle={toggleExcludedTag} />}
          </FilterPanel>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
          <FilterPanel title="Content rating">
            <ToggleGroup options={contentRatingOptions} values={contentRating} onToggle={(value) => toggleRequiredListValue(setContentRating, value)} />
          </FilterPanel>
          <FilterPanel title="Status">
            <ToggleGroup options={statusOptions} values={status} onToggle={(value) => toggleListValue(setStatus, value)} />
          </FilterPanel>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Year</span>
            <input className="control min-h-12 w-full rounded-lg px-3" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2024" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
          <span className="chapter-legend">{sortOptions.find((option) => option.value === sort)?.label}</span>
          {includedTags.map((tag) => (
            <button key={`include-${tag}`} className="chapter-legend" onClick={() => toggleIncludedTag(tag)} type="button">
              Include: {tag}
            </button>
          ))}
          {excludedTags.map((tag) => (
            <button key={`exclude-${tag}`} className="chapter-legend" onClick={() => toggleExcludedTag(tag)} type="button">
              Exclude: {tag}
            </button>
          ))}
          {status.map((item) => (
            <button key={item} className="chapter-legend" onClick={() => toggleListValue(setStatus, item)} type="button">
              {item}
            </button>
          ))}
          {validYear ? <span className="chapter-legend">Year: {validYear}</span> : null}
        </div>
      </section>

      {result.isError ? (
        <div className="surface rounded-lg p-6 text-[var(--danger)]">{result.error.message}</div>
      ) : result.isLoading ? (
        <div className="surface rounded-lg p-6 text-[var(--muted)]">Searching...</div>
      ) : (
        <div className="space-y-5">
          <SourceBanner source={source} hasTagFilters={includedTags.length > 0 || excludedTags.length > 0} />
          {manga.length ? (
            <div className="manga-grid">{manga.map((item) => <MangaCard key={item.id} manga={item} />)}</div>
          ) : (
            <EmptyDiscoveryState hasFilters={hasFilters} />
          )}
          {result.hasNextPage ? (
            <div className="flex justify-center">
              <button className="btn btn-primary" disabled={result.isFetchingNextPage} onClick={() => result.fetchNextPage()}>
                {result.isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FilterPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[rgba(255,184,107,0.035)] p-4">
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

function SourceBanner({ source, hasTagFilters }: { source: "live" | "cache" | undefined; hasTagFilters: boolean }) {
  if (source !== "cache") return null;
  return (
    <div className="surface rounded-lg p-4 text-sm text-[var(--accent)]">
      {hasTagFilters ? "Showing cached manga for tag filters. Sync more MangaDex data if the shelf feels sparse." : "Showing cached data while MangaDex is unavailable."}
    </div>
  );
}

function EmptyDiscoveryState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">
      {hasFilters ? "No manga matches this discovery mix. Broaden filters, remove excluded tags, or clear the year." : "No manga found. Try another title or sync more MangaDex data."}
    </div>
  );
}

function toggleListValue<T extends string>(setValues: React.Dispatch<React.SetStateAction<T[]>>, value: T) {
  setValues((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
}

function toggleRequiredListValue<T extends string>(setValues: React.Dispatch<React.SetStateAction<T[]>>, value: T) {
  setValues((current) => {
    if (!current.includes(value)) return [...current, value];
    if (current.length === 1) return current;
    return current.filter((item) => item !== value);
  });
}

function getDiscoveryTitle(preset: string, routeGenre: string) {
  if (routeGenre) return `Browse ${routeGenre}`;
  if (preset === "popular") return "Popular manga";
  if (preset === "latest") return "Latest updates";
  return "Search MangaDex";
}
