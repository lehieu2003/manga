import { ArrowLeft, ChevronLeft, ChevronRight, Columns2, Maximize2, Rows3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChapterSummary } from "@/types";
import type { ReaderChapterNavItem, ReaderFit, ReaderMode } from "./reader.types";

export function ReaderToolbar({
  mangaId,
  pageIndex,
  pagesLength,
  previousChapter,
  nextChapter,
  navigationUnavailable,
  currentChapterLoaded,
  chapterId,
  navItems,
  hasMoreChapters,
  isFetchingMoreChapters,
  mode,
  fit,
  onGoToChapter,
  onFetchMoreChapters,
  onModeChange,
  onSwitchToPagedMode,
  onFitToggle
}: {
  mangaId: string;
  pageIndex: number;
  pagesLength: number;
  previousChapter?: ChapterSummary;
  nextChapter?: ChapterSummary;
  navigationUnavailable: boolean;
  currentChapterLoaded: boolean;
  chapterId: string;
  navItems: ReaderChapterNavItem[];
  hasMoreChapters: boolean;
  isFetchingMoreChapters: boolean;
  mode: ReaderMode;
  fit: ReaderFit;
  onGoToChapter: (id: string) => void;
  onFetchMoreChapters: () => void;
  onModeChange: (mode: ReaderMode) => void;
  onSwitchToPagedMode: () => void;
  onFitToggle: () => void;
}) {
  return (
    <div className="reader-toolbar sticky top-16 z-30 mb-4 border-y px-4 py-3 backdrop-blur-xl md:rounded-lg md:border">
      <div className="container-x flex items-center justify-between gap-3 px-0">
        <Link className="btn min-h-9" to={mangaId ? `/manga/${mangaId}` : "/search"}>
          <ArrowLeft size={17} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="text-sm text-[var(--muted)]">
          Page {Math.min(pageIndex + 1, pagesLength)} / {pagesLength}
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button className="btn min-h-9 px-2" disabled={!previousChapter} onClick={() => previousChapter && onGoToChapter(previousChapter.id)} aria-label="Previous chapter" type="button">
            <ChevronLeft size={17} />
            <span className="hidden lg:inline">Prev Chapter</span>
          </button>
          <label className="min-w-[12rem] flex-1 sm:flex-none">
            <span className="sr-only">Select chapter</span>
            <select
              className="control min-h-9 w-full rounded-lg px-3 text-sm"
              value={currentChapterLoaded ? chapterId : ""}
              disabled={navigationUnavailable || !currentChapterLoaded}
              onChange={(event) => onGoToChapter(event.target.value)}
              aria-label="Select chapter"
            >
              {navigationUnavailable ? <option value="">Chapter navigation unavailable</option> : null}
              {!navigationUnavailable && !currentChapterLoaded ? <option value="">Loading chapter navigation...</option> : null}
              {navItems.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.state === "read" ? "✓" : chapter.state === "current" ? "▶" : "●"} Chapter {chapter.chapter ?? "?"} [{chapter.translatedLanguage.toUpperCase()}]
                  {chapter.title ? ` - ${chapter.title}` : ""}
                </option>
              ))}
            </select>
          </label>
          {hasMoreChapters && currentChapterLoaded ? (
            <button className="btn min-h-9 px-2 text-sm" disabled={isFetchingMoreChapters} onClick={onFetchMoreChapters} type="button">
              {isFetchingMoreChapters ? "Loading..." : "Load more"}
            </button>
          ) : null}
          <button className="btn min-h-9 px-2" disabled={!nextChapter} onClick={() => nextChapter && onGoToChapter(nextChapter.id)} aria-label="Next chapter" type="button">
            <span className="hidden lg:inline">Next Chapter</span>
            <ChevronRight size={17} />
          </button>
          <div className="flex rounded-lg border border-[var(--line)] p-1">
            <button className={`btn min-h-8 border-0 px-2 ${mode === "vertical" ? "bg-[var(--surface-strong)]" : ""}`} onClick={() => onModeChange("vertical")} aria-label="Vertical mode" type="button">
              <Rows3 size={17} />
            </button>
            <button className={`btn min-h-8 border-0 px-2 ${mode === "paged" ? "bg-[var(--surface-strong)]" : ""}`} onClick={onSwitchToPagedMode} aria-label="Paged mode" type="button">
              <Columns2 size={17} />
            </button>
            <button className={`btn min-h-8 border-0 px-2 ${fit === "contain" ? "bg-[var(--surface-strong)]" : ""}`} onClick={onFitToggle} aria-label="Toggle image fit" type="button">
              <Maximize2 size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
