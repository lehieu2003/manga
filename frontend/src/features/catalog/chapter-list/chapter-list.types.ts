import type { ChapterSummary, ReadingProgress } from "@/types";

export type SortMode = "newest" | "oldest";

export type ChapterListProps = {
  chapters: ChapterSummary[];
  mangaId: string;
  currentProgress?: ReadingProgress | null;
  chaptersProgress?: ReadingProgress[];
  selectedLanguages: string[];
  onSelectedLanguagesChange: (languages: string[]) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

export type ChapterListState = {
  sortMode: SortMode;
  chapterSearch: string;
  selectedScanlationGroups: string[];
};

export type ChapterListMetadata = {
  progressByChapterId: Map<string, ReadingProgress>;
  currentProgress?: ReadingProgress | null;
  currentSortValue: number;
  latestChapterNumber: string | null;
  scanlationGroups: string[];
};

export type ChapterState = "read" | "current" | "new";
