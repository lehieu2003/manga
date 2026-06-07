import type { ChapterSummary } from "@/types";

export type ReaderChapterNavItem = ChapterSummary & {
  state: "read" | "current" | "new";
  isCurrent: boolean;
};

export type ReaderQuality = "data-saver";
export type ReaderMode = "vertical" | "paged";
export type ReaderFit = "width" | "contain";
