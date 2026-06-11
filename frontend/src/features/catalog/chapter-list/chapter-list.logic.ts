import type { ChapterSummary, ReadingProgress } from "@/types";
import type { ChapterCollapseState, ChapterListMetadata, ChapterListState, ChapterState, ChapterVolumeGroup, SortMode } from "./chapter-list.types";

export const CHAPTER_COLLAPSE_THRESHOLD = 30;
export const CHAPTER_COLLAPSE_LIMIT = 20;

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
  return sortChapters(filterChapters(chapters, state), state.sortMode);
}

export function filterChapters(chapters: ChapterSummary[], state: ChapterListState) {
  const needle = state.chapterSearch.trim().toLowerCase();
  return chapters
    .reduce<ChapterSummary[]>((result, chapter) => {
      const matchesSearch =
        !needle ||
        [chapter.chapter, chapter.title, chapter.scanlationGroup].some((value) => {
          return Boolean(value?.toLowerCase().includes(needle));
        });
      const matchesGroup = !state.selectedScanlationGroups.length || Boolean(chapter.scanlationGroup && state.selectedScanlationGroups.includes(chapter.scanlationGroup));
      if (matchesSearch && matchesGroup) result.push(chapter);
      return result;
    }, []);
}

export function sortChapters(chapters: ChapterSummary[], sortMode: SortMode) {
  return chapters.toSorted((a, b) => compareChapters(a, b, sortMode));
}

export function dedupeChapters(
  chapters: ChapterSummary[],
  preferences: { languagePriority: string[]; selectedScanlationGroups: string[] }
) {
  const selected = new Map<string, ChapterSummary>();
  for (const chapter of chapters) {
    const key = chapter.chapter?.trim() ? `chapter:${chapter.chapter.trim()}` : `id:${chapter.id}`;
    const existing = selected.get(key);
    if (!existing || compareDedupePreference(chapter, existing, preferences) < 0) {
      selected.set(key, chapter);
    }
  }
  return [...selected.values()];
}

export function getCollapsedChapters(
  chapters: ChapterSummary[],
  state: Pick<ChapterListState, "chapterSearch" | "isExpanded">,
  options: { threshold?: number; limit?: number } = {}
): ChapterCollapseState {
  const threshold = options.threshold ?? CHAPTER_COLLAPSE_THRESHOLD;
  const limit = options.limit ?? CHAPTER_COLLAPSE_LIMIT;
  const isSearching = state.chapterSearch.trim().length > 0;
  const isCollapsible = chapters.length > threshold && !isSearching;
  const isCollapsed = isCollapsible && !state.isExpanded;
  const visibleChapters = isCollapsed ? chapters.slice(0, limit) : chapters;

  return {
    chapters: visibleChapters,
    isCollapsible,
    isCollapsed,
    totalCount: chapters.length,
    visibleCount: visibleChapters.length
  };
}

export function groupChaptersByVolume(chapters: ChapterSummary[], sortMode: SortMode): ChapterVolumeGroup[] {
  const groups = new Map<string, ChapterSummary[]>();
  for (const chapter of chapters) {
    const volume = chapter.volume?.trim();
    const key = volume ? volume : "";
    groups.set(key, [...(groups.get(key) ?? []), chapter]);
  }

  return [...groups.entries()]
    .toSorted(([volumeA], [volumeB]) => compareVolumeKeys(volumeA, volumeB, sortMode))
    .map(([volume, volumeChapters]) => ({
      id: volume ? `volume:${volume}` : "volume:none",
      title: volume ? `Volume ${volume}` : "No Volume",
      chapters: volumeChapters
    }));
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

function compareDedupePreference(
  a: ChapterSummary,
  b: ChapterSummary,
  preferences: { languagePriority: string[]; selectedScanlationGroups: string[] }
) {
  return (
    languageRank(a.translatedLanguage, preferences.languagePriority) - languageRank(b.translatedLanguage, preferences.languagePriority) ||
    scanlationRank(a.scanlationGroup, preferences.selectedScanlationGroups) - scanlationRank(b.scanlationGroup, preferences.selectedScanlationGroups) ||
    new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime() ||
    a.id.localeCompare(b.id)
  );
}

function languageRank(language: string, priority: string[]) {
  const index = priority.indexOf(language);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function scanlationRank(group: string | undefined, selectedGroups: string[]) {
  if (!selectedGroups.length) return 0;
  if (!group) return Number.MAX_SAFE_INTEGER;
  const index = selectedGroups.indexOf(group);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function compareVolumeKeys(a: string, b: string, sortMode: SortMode) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const numericA = Number.parseFloat(a);
  const numericB = Number.parseFloat(b);
  const direction = sortMode === "oldest" ? 1 : -1;
  if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
    return (numericA - numericB) * direction;
  }
  return a.localeCompare(b, undefined, { numeric: true }) * direction;
}
