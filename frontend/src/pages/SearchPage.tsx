import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { MangaCard } from "../components/MangaCard";
import { api } from "../lib/api";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const result = useQuery({
    queryKey: ["manga", "search", deferredQuery],
    queryFn: () => api.searchManga({ q: deferredQuery, limit: 30 }),
    enabled: deferredQuery.length === 0 || deferredQuery.length >= 2
  });

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
        <div className="manga-grid">{result.data?.data.map((manga) => <MangaCard key={manga.id} manga={manga} />)}</div>
      )}
    </div>
  );
}
