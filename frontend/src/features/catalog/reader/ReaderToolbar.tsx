import { ArrowLeft, ChevronLeft, ChevronRight, Columns2, Maximize2, Rows3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChapterSummary } from "@/types";
import type { ReaderChapterNavItem, ReaderFit, ReaderMode, ReaderQuality } from "./reader.types";

export function ReaderToolbar({
  isVisible,
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
  quality,
  onGoToChapter,
  onFetchMoreChapters,
  onModeChange,
  onSwitchToPagedMode,
  onFitToggle,
  onQualityToggle,
  onReveal
}: {
  isVisible: boolean;
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
  quality: ReaderQuality;
  onGoToChapter: (id: string) => void;
  onFetchMoreChapters: () => void;
  onModeChange: (mode: ReaderMode) => void;
  onSwitchToPagedMode: () => void;
  onFitToggle: () => void;
  onQualityToggle: () => void;
  onReveal: () => void;
}) {
  return (
    <div className={`reader-toolbar ${isVisible ? "reader-toolbar-visible" : "reader-toolbar-hidden"}`} onPointerDown={onReveal} onFocus={onReveal}>
      <div className="reader-toolbar-inner">
        <Link className="btn reader-toolbar-button" to={mangaId ? `/manga/${mangaId}` : "/search"}>
          <ArrowLeft size={17} />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="reader-page-count">
          Page {Math.min(pageIndex + 1, pagesLength)} / {pagesLength}
        </div>
        <div className="reader-toolbar-actions">
          <button className="btn reader-icon-button" disabled={!previousChapter} onClick={() => previousChapter && onGoToChapter(previousChapter.id)} aria-label="Previous chapter" type="button">
            <ChevronLeft size={17} />
          </button>
          <label className="reader-chapter-select">
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
            <button className="btn reader-load-button" disabled={isFetchingMoreChapters} onClick={onFetchMoreChapters} type="button">
              {isFetchingMoreChapters ? "Loading..." : "Load more"}
            </button>
          ) : null}
          <button className="btn reader-icon-button" disabled={!nextChapter} onClick={() => nextChapter && onGoToChapter(nextChapter.id)} aria-label="Next chapter" type="button">
            <ChevronRight size={17} />
          </button>
          <div className="reader-mode-group">
            <button className={`btn reader-icon-button border-0 ${mode === "vertical" ? "bg-[var(--surface-strong)]" : ""}`} onClick={() => onModeChange("vertical")} aria-label="Vertical mode" type="button">
              <Rows3 size={17} />
            </button>
            <button className={`btn reader-icon-button border-0 ${mode === "paged" ? "bg-[var(--surface-strong)]" : ""}`} onClick={onSwitchToPagedMode} aria-label="Paged mode" type="button">
              <Columns2 size={17} />
            </button>
            <button className={`btn reader-icon-button border-0 ${fit === "contain" ? "bg-[var(--surface-strong)]" : ""}`} onClick={onFitToggle} aria-label="Toggle image fit" type="button">
              <Maximize2 size={17} />
            </button>
            <button className="btn min-h-9 px-3 text-xs" onClick={onQualityToggle} aria-label="Toggle reader quality" type="button">
              {quality === "data-saver" ? "Data saver" : "Original"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
