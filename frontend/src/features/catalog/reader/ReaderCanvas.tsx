import type { RefObject } from "react";
import type { ReaderFit, ReaderMode } from "./reader.types";

export function ReaderCanvas({
  mode,
  fit,
  pages,
  pageIndex,
  imageRefs,
  onGoToPage
}: {
  mode: ReaderMode;
  fit: ReaderFit;
  pages: string[];
  pageIndex: number;
  imageRefs: RefObject<Array<HTMLImageElement | null>>;
  onGoToPage: (getNextIndex: (value: number) => number) => void;
}) {
  const visiblePage = pages[pageIndex];
  const imageClass = fit === "contain" ? "max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain" : "";

  if (mode === "vertical") {
    return (
      <div className="space-y-2">
        {pages.length ? (
          pages.map((page, index) => (
            <img
              key={page}
              ref={(node) => {
                imageRefs.current[index] = node;
              }}
              className={imageClass}
              src={page}
              alt={`Page ${index + 1}`}
              data-page-index={index}
              loading={index < 2 ? "eager" : "lazy"}
            />
          ))
        ) : (
          <div className="surface rounded-lg p-6 text-[var(--muted)]">No readable pages were returned for this chapter.</div>
        )}
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] place-items-center">
      {visiblePage ? <img className={imageClass} src={visiblePage} alt={`Page ${pageIndex + 1}`} /> : null}
      <div className="mt-4 flex gap-3">
        <button className="btn" onClick={() => onGoToPage((value) => Math.max(value - 1, 0))} type="button">
          Previous
        </button>
        <button className="btn btn-primary" onClick={() => onGoToPage((value) => Math.min(value + 1, pages.length - 1))} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
