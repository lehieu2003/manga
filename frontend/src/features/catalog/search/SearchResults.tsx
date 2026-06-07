import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { MangaCard } from "@/features/catalog/components/MangaCard";
import type { MangaSummary, Paginated } from "@/types";

type SearchResultsProps = {
  result: UseInfiniteQueryResult<{ pages: Array<Paginated<MangaSummary>>; pageParams: unknown[] }, Error>;
  manga: MangaSummary[];
  source: "live" | "cache" | undefined;
  hasFilters: boolean;
  hasTagFilters: boolean;
};

export function SearchResults({ result, manga, source, hasFilters, hasTagFilters }: SearchResultsProps) {
  if (result.isError) return <div className="surface rounded-lg p-6 text-[var(--danger)]">{result.error instanceof Error ? result.error.message : "Unable to search manga."}</div>;
  if (result.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Searching...</div>;
  return (
    <div className="space-y-5">
      <SourceBanner source={source} hasTagFilters={hasTagFilters} />
      {manga.length ? (
        <div className="manga-grid">
          {manga.map((item) => (
            <MangaCard key={item.id} manga={item} />
          ))}
        </div>
      ) : (
        <EmptyDiscoveryState hasFilters={hasFilters} />
      )}
      {result.hasNextPage ? (
        <div className="flex justify-center">
          <button className="btn btn-primary" disabled={result.isFetchingNextPage} onClick={() => result.fetchNextPage()} type="button">
            {result.isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SourceBanner({ source, hasTagFilters }: { source: "live" | "cache" | undefined; hasTagFilters: boolean }) {
  if (source !== "cache") return null;
  return <div className="surface rounded-lg p-4 text-sm text-[var(--accent)]">{hasTagFilters ? "Showing cached manga for tag filters. Sync more MangaDex data if the shelf feels sparse." : "Showing cached data while MangaDex is unavailable."}</div>;
}

function EmptyDiscoveryState({ hasFilters }: { hasFilters: boolean }) {
  return <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">{hasFilters ? "No manga matches this discovery mix. Broaden filters, remove excluded tags, or clear the year." : "No manga found. Try another title or sync more MangaDex data."}</div>;
}
