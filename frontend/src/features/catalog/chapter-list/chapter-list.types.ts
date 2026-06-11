import type { ChapterSummary, ReadingProgress } from "@/types";

export type SortMode = "newest" | "oldest";

export type ChapterListProps = {
  chapters: ChapterSummary[];
  mangaId: string;
  currentProgress?: ReadingProgress | null;
  chaptersProgress?: ReadingProgress[];
  selectedLanguages: string[];
  onSelectedLanguagesChange: (languages: string[]) => void;
  onChapterSearchChange?: (search: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  needsSync?: boolean;
};

export type ChapterListState = {
  sortMode: SortMode;
  chapterSearch: string;
  selectedScanlationGroups: string[];
  isExpanded: boolean;
};

export type ChapterListMetadata = {
  progressByChapterId: Map<string, ReadingProgress>;
  currentProgress?: ReadingProgress | null;
  currentSortValue: number;
  latestChapterNumber: string | null;
  scanlationGroups: string[];
};

export type ChapterState = "read" | "current" | "new";

export type ChapterVolumeGroup = {
  id: string;
  title: string;
  chapters: ChapterSummary[];
};

export type ChapterCollapseState = {
  chapters: ChapterSummary[];
  isCollapsible: boolean;
  isCollapsed: boolean;
  totalCount: number;
  visibleCount: number;
};
