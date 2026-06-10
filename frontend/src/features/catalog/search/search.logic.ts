import type { DiscoveryPreset, DiscoveryState, MangaDiscoverySort } from "./search.types";

export function getDiscoveryPreset(pathname: string): DiscoveryPreset {
  if (pathname.includes("/discover/latest")) return "latest";
  if (pathname.includes("/discover/popular")) return "popular";
  return "search";
}

export function getDefaultSort(preset: DiscoveryPreset): MangaDiscoverySort {
  if (preset === "latest") return "latest";
  if (preset === "popular") return "followed";
  return "relevance";
}

export function getDiscoveryTitle(preset: DiscoveryPreset, routeGenre: string) {
  if (routeGenre) return `Browse ${routeGenre}`;
  if (preset === "popular") return "Popular manga";
  if (preset === "latest") return "Latest updates";
  return "Search MangaDex";
}

export function parseDiscoveryYear(year: string) {
  const parsedYear = year.trim() ? Number(year) : undefined;
  return parsedYear && Number.isInteger(parsedYear) ? parsedYear : undefined;
}

export function hasActiveDiscoveryFilters(state: DiscoveryState, defaultSort: MangaDiscoverySort, validYear: number | undefined) {
  return (
    state.includedTags.length > 0 ||
    state.excludedTags.length > 0 ||
    state.status.length > 0 ||
    Boolean(validYear) ||
    state.contentRating.length !== 2 ||
    state.sort !== defaultSort ||
    state.query.trim().length > 0 ||
    state.author.trim().length > 0 ||
    state.artist.trim().length > 0
  );
}
