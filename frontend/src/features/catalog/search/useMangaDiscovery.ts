import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useReducer } from "react";
import { api } from "@/api";
import type { MangaSummary, Paginated } from "@/types";
import { hasActiveDiscoveryFilters, parseDiscoveryYear } from "./search.logic";
import { createDiscoveryState, discoveryReducer } from "./search.reducer";
import type { DiscoveryPreset, MangaDiscoverySort } from "./search.types";

export function useMangaDiscovery({
  preset,
  routeGenre,
  defaultSort
}: {
  preset: DiscoveryPreset;
  routeGenre: string;
  defaultSort: MangaDiscoverySort;
}) {
  const [state, dispatch] = useReducer(discoveryReducer, createDiscoveryState(routeGenre, defaultSort));
  const deferredQuery = useDeferredValue(state.query);
  const genres = useQuery({ queryKey: ["genres"], queryFn: api.getGenres });
  const validYear = parseDiscoveryYear(state.year);
  const result = useInfiniteQuery<Paginated<MangaSummary>, Error, { pages: Array<Paginated<MangaSummary>>; pageParams: unknown[] }, unknown[], number>({
    queryKey: [
      "manga",
      "discovery",
      preset,
      deferredQuery,
      state.includedTags,
      state.excludedTags,
      state.contentRating,
      state.status,
      validYear,
      state.sort
    ],
    queryFn: ({ pageParam }) =>
      api.searchManga({
        q: deferredQuery,
        includedTags: state.includedTags,
        excludedTags: state.excludedTags,
        contentRating: state.contentRating,
        status: state.status,
        year: validYear,
        sort: state.sort,
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
  const hasFilters = hasActiveDiscoveryFilters(state, defaultSort, validYear);

  return {
    state,
    dispatch,
    genres,
    result,
    manga,
    source,
    validYear,
    hasFilters,
    hasTagFilters: state.includedTags.length > 0 || state.excludedTags.length > 0
  };
}
