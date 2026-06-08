import type { ChapterSummary, ReadingProgress } from "@/types";
import type { ReaderChapterNavItem } from "./reader.types";

export function createReaderNavItems({
  chapters,
  chapterId,
  currentChapterIndex,
  chaptersProgress
}: {
  chapters: ChapterSummary[];
  chapterId: string;
  currentChapterIndex: number;
  chaptersProgress?: ReadingProgress[];
}): ReaderChapterNavItem[] {
  const currentSortValue = chapterSortValue(chapters[currentChapterIndex]);
  return chapters.map((chapter) => {
    const isCurrent = chapter.id === chapterId;
    const explicitProgress = chaptersProgress?.find((item) => item.chapterId === chapter.id);
    const isReadByProgress = Boolean(explicitProgress?.completed);
    const isReadByOrder = Number.isFinite(currentSortValue) && chapterSortValue(chapter) < currentSortValue;
    return {
      ...chapter,
      isCurrent,
      state: isCurrent ? "current" : isReadByProgress || isReadByOrder ? "read" : "new"
    };
  });
}

export function compareChapters(a: ChapterSummary, b: ChapterSummary) {
  const byChapter = chapterSortValue(a) - chapterSortValue(b);
  const byDate = new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
  return byChapter || byDate || a.id.localeCompare(b.id);
}

export function findReaderFallbackChapter(chapters: ChapterSummary[], chapterId: string) {
  const current = chapters.find((chapter) => chapter.id === chapterId);
  if (!current) return undefined;
  const sameChapter = chapters.filter((chapter) => chapter.id !== chapterId && chapter.chapter === current.chapter);
  return sameChapter.find((chapter) => chapter.translatedLanguage === current.translatedLanguage) ?? sameChapter[0];
}

export function chapterSortValue(chapter: ChapterSummary | undefined) {
  if (!chapter) return Number.NaN;
  const parsed = Number.parseFloat(chapter.chapter ?? "");
  if (Number.isFinite(parsed)) return parsed;
  const published = new Date(chapter.publishAt).getTime();
  return Number.isFinite(published) ? published / 1000000000000 : Number.NaN;
}

export function preloadPages(pages: string[], pageIndex: number) {
  if (!pages.length) return;
  for (const page of pages.slice(pageIndex + 1, pageIndex + 3)) {
    const image = new Image();
    image.src = page;
  }
}
