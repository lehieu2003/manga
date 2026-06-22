import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore, type Dispatch } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api, getAuthTokenSnapshot, subscribeAuthTokens } from "@/api";
import { SearchControls } from "@/features/catalog/search/SearchControls";
import { SearchResults } from "@/features/catalog/search/SearchResults";
import { getDefaultSort, getDiscoveryPreset } from "@/features/catalog/search/search.logic";
import { useMangaDiscovery } from "@/features/catalog/search/useMangaDiscovery";
import type { DiscoveryAction } from "@/features/catalog/search/search.types";
import type { DiscoveryPreset, MangaDiscoverySort } from "@/features/catalog/search/search.types";
import type { SearchHistoryItem } from "@/types";

export function SearchPage() {
  const { genre } = useParams();
  const location = useLocation();
  const preset = getDiscoveryPreset(location.pathname);
  const routeGenre = useMemo(() => (genre ? decodeURIComponent(genre) : ""), [genre]);
  const defaultSort = getDefaultSort(preset);

  return <SearchPageContent key={`${preset}:${routeGenre}`} preset={preset} routeGenre={routeGenre} defaultSort={defaultSort} />;
}

function SearchPageContent({ preset, routeGenre, defaultSort }: { preset: DiscoveryPreset; routeGenre: string; defaultSort: MangaDiscoverySort }) {
  const discovery = useMangaDiscovery({ preset, routeGenre, defaultSort });
  const isAuthenticated = useSyncExternalStore(subscribeAuthTokens, getAuthTokenSnapshot, () => false);

  return (
    <div className="space-y-6">
      <SearchControls
        preset={preset}
        routeGenre={routeGenre}
        defaultSort={defaultSort}
        state={discovery.state}
        genres={discovery.genres}
        hasFilters={discovery.hasFilters}
        validYear={discovery.validYear}
        dispatch={discovery.dispatch}
      />
      {isAuthenticated ? <RecentSearches dispatch={discovery.dispatch} /> : null}
      <SearchResults result={discovery.result} manga={discovery.manga} source={discovery.source} hasFilters={discovery.hasFilters} hasTagFilters={discovery.hasTagFilters} />
    </div>
  );
}

function RecentSearches({ dispatch }: { dispatch: Dispatch<DiscoveryAction> }) {
  const queryClient = useQueryClient();
  const history = useQuery({ queryKey: ["search-history"], queryFn: () => api.getSearchHistory({ limit: 8 }), retry: false });
  const clear = useMutation({
    mutationFn: api.clearSearchHistory,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["search-history"] })
  });
  const rows = history.data?.data ?? [];

  if (history.isLoading) {
    return (
      <section className="surface rounded-lg p-4" aria-label="Recent searches">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="h-9 w-28 animate-pulse rounded-full border border-[var(--line)] bg-[var(--surface-strong)]" />
          ))}
        </div>
      </section>
    );
  }

  if (!rows.length) return null;

  return (
    <section className="surface rounded-lg p-4" aria-label="Recent searches">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History size={17} color="var(--accent)" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[var(--muted)]">Recent searches</h2>
        </div>
        <button className="btn min-h-9 text-sm" type="button" onClick={() => clear.mutate()} disabled={clear.isPending}>
          <Trash2 size={16} />
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {dedupeRecentSearches(rows).map((item) => (
          <button key={item.id} className="genre-chip" type="button" onClick={() => dispatch({ type: "queryChanged", value: item.query })}>
            {item.query}
          </button>
        ))}
      </div>
    </section>
  );
}

function dedupeRecentSearches(rows: SearchHistoryItem[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.query.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
