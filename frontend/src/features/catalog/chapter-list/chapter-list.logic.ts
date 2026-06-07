import type { ChapterSummary, ReadingProgress } from "@/types";
import type { ChapterListMetadata, ChapterListState, ChapterState, SortMode } from "./chapter-list.types";

export function createChapterListMetadata(chapters: ChapterSummary[], currentProgress?: ReadingProgress | null, chaptersProgress?: ReadingProgress[]): ChapterListMetadata {
  const progressByChapterId = new Map((chaptersProgress ?? []).map((progress) => [progress.chapterId, progress]));
  const currentChapter = chapters.find((chapter) => chapter.id === currentProgress?.chapterId);
  const currentSortValue = chapterSortValue(currentChapter);
  const latestSortValue = Math.max(
    ...chapters.reduce<number[]>((values, chapter) => {
      const sortValue = chapterSortValue(chapter);
      if (Number.isFinite(sortValue)) values.push(sortValue);
      return values;
    }, [])
  );
  const latestChapterNumber = chapters.find((chapter) => chapterSortValue(chapter) === latestSortValue)?.chapter ?? null;
  const scanlationGroups = chapters
    .reduce<string[]>((groups, chapter) => {
      if (chapter.scanlationGroup && !groups.includes(chapter.scanlationGroup)) groups.push(chapter.scanlationGroup);
      return groups;
    }, [])
    .toSorted((a, b) => a.localeCompare(b));
  return { progressByChapterId, currentProgress, currentSortValue, latestChapterNumber, scanlationGroups };
}

export function filterAndSortChapters(chapters: ChapterSummary[], state: ChapterListState) {
  const needle = state.chapterSearch.trim().toLowerCase();
  return chapters
    .reduce<ChapterSummary[]>((result, chapter) => {
      const matchesSearch =
        !needle ||
        [chapter.chapter, chapter.title].some((value) => {
          return Boolean(value?.toLowerCase().includes(needle));
        });
      const matchesGroup = !state.selectedScanlationGroups.length || Boolean(chapter.scanlationGroup && state.selectedScanlationGroups.includes(chapter.scanlationGroup));
      if (matchesSearch && matchesGroup) result.push(chapter);
      return result;
    }, [])
    .toSorted((a, b) => compareChapters(a, b, state.sortMode));
}

export function shouldLoadMoreForSearch(
  search: string,
  chapters: ChapterSummary[],
  selectedScanlationGroups: string[],
  sortMode: SortMode,
  hasMore?: boolean,
  isLoadingMore?: boolean,
  onLoadMore?: () => void
) {
  if (!search.trim() || !hasMore || isLoadingMore || !onLoadMore) return false;
  const visible = filterAndSortChapters(chapters, { chapterSearch: search, selectedScanlationGroups, sortMode });
  return visible.length === 0;
}

export function compareChapters(a: ChapterSummary, b: ChapterSummary, sortMode: SortMode) {
  const byChapter = chapterSortValue(a) - chapterSortValue(b);
  const byDate = new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
  const direction = sortMode === "oldest" ? 1 : -1;
  return (byChapter || byDate || a.id.localeCompare(b.id)) * direction;
}

export function getChapterState(chapter: ChapterSummary, progressByChapterId: Map<string, ReadingProgress>, currentProgress?: ReadingProgress | null, currentSortValue?: number): ChapterState {
  if (chapter.id === currentProgress?.chapterId) return "current";
  const explicitProgress = progressByChapterId.get(chapter.id);
  if (explicitProgress?.completed) return "read";
  if (currentSortValue !== undefined && Number.isFinite(currentSortValue)) {
    const sortValue = chapterSortValue(chapter);
    if (Number.isFinite(sortValue) && sortValue < currentSortValue) return "read";
  }
  return "new";
}

export function chapterSortValue(chapter: ChapterSummary | undefined) {
  if (!chapter) return Number.NaN;
  const parsed = Number.parseFloat(chapter.chapter ?? "");
  if (Number.isFinite(parsed)) return parsed;
  const published = new Date(chapter.publishAt).getTime();
  return Number.isFinite(published) ? published / 1000000000000 : Number.NaN;
}

export function estimateReadingTime(pages: number) {
  return `~${Math.max(1, Math.ceil(pages / 6))} mins`;
}
