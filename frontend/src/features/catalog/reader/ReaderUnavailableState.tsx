import { ArrowLeft, BookOpen, RefreshCw, RotateCcw, ServerCrash } from "lucide-react";
import type { ChapterSummary } from "@/types";

type ReaderUnavailableStateProps = {
  errorMessage: string;
  fallbackChapter?: ChapterSummary;
  hasMangaContext: boolean;
  isRetrying: boolean;
  onBackToChapters: () => void;
  onOpenFallback: () => void;
  onRetry: () => void;
};

export function ReaderUnavailableState({
  errorMessage,
  fallbackChapter,
  hasMangaContext,
  isRetrying,
  onBackToChapters,
  onOpenFallback,
  onRetry
}: ReaderUnavailableStateProps) {
  return (
    <section className="reader-unavailable surface" aria-labelledby="reader-unavailable-title">
      <div className="reader-unavailable-icon" aria-hidden="true">
        <ServerCrash size={28} />
      </div>
      <div className="reader-unavailable-copy">
        <p className="reader-unavailable-kicker">Reader source unavailable</p>
        <h1 id="reader-unavailable-title">This chapter source cannot be opened right now.</h1>
        <p>
          The chapter metadata is in your local catalog, but MangaDex no longer returns image data for this source. Choose another source if one is available, or go back to the chapter list.
        </p>
      </div>

      <div className="reader-unavailable-actions">
        {fallbackChapter ? (
          <button className="btn btn-primary" onClick={onOpenFallback} type="button">
            <BookOpen size={18} />
            Open another source
          </button>
        ) : null}
        {hasMangaContext ? (
          <button className="btn" onClick={onBackToChapters} type="button">
            <ArrowLeft size={18} />
            Back to chapters
          </button>
        ) : null}
        <button className="btn" disabled={isRetrying} onClick={onRetry} type="button">
          {isRetrying ? <RefreshCw className="reader-spin" size={18} /> : <RotateCcw size={18} />}
          Retry source
        </button>
      </div>

      <details className="reader-unavailable-detail">
        <summary>Why did this happen?</summary>
        <p>{errorMessage}</p>
      </details>
    </section>
  );
}
