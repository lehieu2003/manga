import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { MangaCard } from "../components/MangaCard";
import { api } from "../lib/api";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const result = useInfiniteQuery({
    queryKey: ["manga", "search", deferredQuery],
    queryFn: ({ pageParam }) => api.searchManga({ q: deferredQuery, limit: 24, offset: pageParam }),
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

  return (
    <div className="space-y-6">
      <section className="surface rounded-lg p-5">
        <label className="mb-2 block text-sm font-bold text-[var(--muted)]" htmlFor="manga-search">
          Search MangaDex
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[#0d1116] px-3">
          <Search size={20} color="var(--accent)" />
          <input
            id="manga-search"
            className="min-h-12 flex-1 bg-transparent outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, author, or keyword"
          />
        </div>
      </section>

      {result.isError ? (
        <div className="surface rounded-lg p-6 text-[var(--danger)]">{result.error.message}</div>
      ) : result.isLoading ? (
        <div className="surface rounded-lg p-6 text-[var(--muted)]">Searching...</div>
      ) : (
        <div className="space-y-5">
          {source === "cache" ? <div className="surface rounded-lg p-4 text-sm text-[var(--accent)]">Showing cached data while MangaDex is unavailable.</div> : null}
          {manga.length ? (
            <div className="manga-grid">{manga.map((item) => <MangaCard key={item.id} manga={item} />)}</div>
          ) : (
            <div className="surface rounded-lg p-8 text-center text-[var(--muted)]">No manga found. Try another title or sync more MangaDex data.</div>
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
