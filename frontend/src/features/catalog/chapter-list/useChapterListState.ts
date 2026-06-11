import { useMemo, useState } from "react";
import type { ChapterSummary } from "@/types";
import { DEFAULT_LANGUAGES } from "./chapter-list.constants";
import { filterAndSortChapters } from "./chapter-list.logic";
import type { ChapterListState } from "./chapter-list.types";

export function useChapterListState({
  chapters,
  selectedLanguages,
  onSelectedLanguagesChange,
  isLoadingMore,
  onChapterSearchChange
}: {
  chapters: ChapterSummary[];
  selectedLanguages: string[];
  onSelectedLanguagesChange: (languages: string[]) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onChapterSearchChange?: (search: string) => void;
}) {
  const [state, setState] = useState<ChapterListState>({ sortMode: "newest", chapterSearch: "", selectedScanlationGroups: [] });
  const visibleChapters = useMemo(() => filterAndSortChapters(chapters, state), [chapters, state]);
  const selectedLanguageKey = selectedLanguages.toSorted().join(",");
  const defaultLanguageKey = DEFAULT_LANGUAGES.toSorted().join(",");
  const hasActiveFilters = state.chapterSearch.trim().length > 0 || state.selectedScanlationGroups.length > 0 || selectedLanguageKey !== defaultLanguageKey;
  const isSearchingMore = Boolean(state.chapterSearch.trim() && !visibleChapters.length && isLoadingMore);

  const updateSearch = (value: string) => {
    setState((current) => ({ ...current, chapterSearch: value }));
    onChapterSearchChange?.(value);
  };
  const toggleSort = () => setState((current) => ({ ...current, sortMode: current.sortMode === "newest" ? "oldest" : "newest" }));
  const toggleScanlationGroup = (group: string) => {
    setState((current) => ({
      ...current,
      selectedScanlationGroups: current.selectedScanlationGroups.includes(group)
        ? current.selectedScanlationGroups.filter((item) => item !== group)
        : [...current.selectedScanlationGroups, group]
    }));
  };
  const toggleLanguage = (language: string) => {
    const next = selectedLanguages.includes(language) ? selectedLanguages.filter((item) => item !== language) : [...selectedLanguages, language];
    onSelectedLanguagesChange(next);
  };
  const clearFilters = () => {
    setState((current) => ({ ...current, chapterSearch: "", selectedScanlationGroups: [] }));
    onChapterSearchChange?.("");
    onSelectedLanguagesChange(DEFAULT_LANGUAGES);
  };

  return {
    state,
    visibleChapters,
    hasActiveFilters,
    isSearchingMore,
    updateSearch,
    toggleSort,
    toggleScanlationGroup,
    toggleLanguage,
    clearFilters
  };
}
