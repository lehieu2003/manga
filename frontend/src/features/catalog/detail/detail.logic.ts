import type { ChapterSummary, MangaProgressPayload, Paginated } from "@/types";

export function getMangaDetailChapterView({
  chapterPages,
  progress
}: {
  chapterPages: Array<Paginated<ChapterSummary>>;
  progress?: MangaProgressPayload;
}) {
  const chapterItems = chapterPages.flatMap((page) => page.data);
  const chapterTotal = chapterPages[0]?.total ?? chapterItems.length;
  const continueChapter = chapterItems.find((chapter) => chapter.id === progress?.progress?.chapterId) ?? progress?.chapter;
  const languages = new Set(chapterItems.map((chapter) => chapter.translatedLanguage.toUpperCase())).size;
  const latestPublishAt = Math.max(
    ...chapterItems.reduce<number[]>((times, chapter) => {
      const time = new Date(chapter.publishAt).getTime();
      if (Number.isFinite(time)) times.push(time);
      return times;
    }, [])
  );

  return {
    chapterItems,
    chapterTotal,
    continueChapter,
    languages,
    latestPublishAt
  };
}
