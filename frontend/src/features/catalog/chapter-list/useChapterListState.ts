import { useMemo, useState } from "react";
import type { ChapterSummary } from "@/types";
import { DEFAULT_LANGUAGES } from "./chapter-list.constants";
import { dedupeChapters, filterChapters, getCollapsedChapters, groupChaptersByVolume, sortChapters } from "./chapter-list.logic";
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
  const [state, setState] = useState<ChapterListState>({ sortMode: "newest", chapterSearch: "", selectedScanlationGroups: [], isExpanded: false });
  const processedChapters = useMemo(() => {
    const filtered = filterChapters(chapters, state);
    const deduped = dedupeChapters(filtered, { languagePriority: selectedLanguages, selectedScanlationGroups: state.selectedScanlationGroups });
    return sortChapters(deduped, state.sortMode);
  }, [chapters, selectedLanguages, state]);
  const collapsed = useMemo(() => getCollapsedChapters(processedChapters, state), [processedChapters, state]);
  const groupedChapters = useMemo(() => groupChaptersByVolume(collapsed.chapters, state.sortMode), [collapsed.chapters, state.sortMode]);
  const visibleChapters = collapsed.chapters;
  const selectedLanguageKey = selectedLanguages.toSorted().join(",");
  const defaultLanguageKey = DEFAULT_LANGUAGES.toSorted().join(",");
  const hasActiveFilters = state.chapterSearch.trim().length > 0 || state.selectedScanlationGroups.length > 0 || selectedLanguageKey !== defaultLanguageKey;
  const isSearchingMore = Boolean(state.chapterSearch.trim() && !visibleChapters.length && isLoadingMore);

  const updateSearch = (value: string) => {
    setState((current) => ({ ...current, chapterSearch: value, isExpanded: false }));
    onChapterSearchChange?.(value);
  };
  const toggleSort = () => setState((current) => ({ ...current, sortMode: current.sortMode === "newest" ? "oldest" : "newest", isExpanded: false }));
  const toggleScanlationGroup = (group: string) => {
    setState((current) => ({
      ...current,
      isExpanded: false,
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
    setState((current) => ({ ...current, chapterSearch: "", selectedScanlationGroups: [], isExpanded: false }));
    onChapterSearchChange?.("");
    onSelectedLanguagesChange(DEFAULT_LANGUAGES);
  };
  const showAll = () => setState((current) => ({ ...current, isExpanded: true }));
  const showFewer = () => setState((current) => ({ ...current, isExpanded: false }));

  return {
    state,
    visibleChapters,
    groupedChapters,
    collapse: collapsed,
    hasActiveFilters,
    isSearchingMore,
    updateSearch,
    toggleSort,
    toggleScanlationGroup,
    toggleLanguage,
    clearFilters,
    showAll,
    showFewer
  };
}
