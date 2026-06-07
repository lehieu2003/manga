import { useMemo } from "react";
import type { ChapterSummary, ReadingProgress } from "@/types";
import { createChapterListMetadata } from "./chapter-list.logic";

export function useChapterListMetadata(chapters: ChapterSummary[], currentProgress?: ReadingProgress | null, chaptersProgress?: ReadingProgress[]) {
  return useMemo(() => createChapterListMetadata(chapters, currentProgress, chaptersProgress), [chapters, chaptersProgress, currentProgress]);
}
