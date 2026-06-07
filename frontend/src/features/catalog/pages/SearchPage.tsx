import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { SearchControls } from "@/features/catalog/search/SearchControls";
import { SearchResults } from "@/features/catalog/search/SearchResults";
import { getDefaultSort, getDiscoveryPreset } from "@/features/catalog/search/search.logic";
import { useMangaDiscovery } from "@/features/catalog/search/useMangaDiscovery";
import type { DiscoveryPreset, MangaDiscoverySort } from "@/features/catalog/search/search.types";

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
      <SearchResults result={discovery.result} manga={discovery.manga} source={discovery.source} hasFilters={discovery.hasFilters} hasTagFilters={discovery.hasTagFilters} />
    </div>
  );
}
