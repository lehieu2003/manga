import { useRef, type PointerEvent, type RefObject } from "react";
import type { ReaderFit, ReaderMode } from "./reader.types";

const SWIPE_THRESHOLD_PX = 48;

export function ReaderCanvas({
  mode,
  fit,
  pages,
  pageIndex,
  imageRefs,
  onGoToPage,
  onRevealControls
}: {
  mode: ReaderMode;
  fit: ReaderFit;
  pages: string[];
  pageIndex: number;
  imageRefs: RefObject<Array<HTMLImageElement | null>>;
  onGoToPage: (getNextIndex: (value: number) => number) => void;
  onRevealControls: () => void;
}) {
  const visiblePage = pages[pageIndex];
  const imageClass = fit === "contain" ? "max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain" : "";
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const goToPreviousPage = () => onGoToPage((value) => Math.max(value - 1, 0));
  const goToNextPage = () => onGoToPage((value) => Math.min(value + 1, Math.max(pages.length - 1, 0)));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "paged") return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== "paged" || !pointerStartRef.current) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    pointerStartRef.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    if (deltaX < 0) goToNextPage();
    if (deltaX > 0) goToPreviousPage();
  };

  if (mode === "vertical") {
    return (
      <div className="reader-pages" onClick={onRevealControls}>
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
    <div className="reader-paged-canvas" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      {visiblePage ? <img className={imageClass} src={visiblePage} alt={`Page ${pageIndex + 1}`} /> : null}
      <div className="reader-tap-zones">
        <button className="reader-tap-zone reader-tap-zone-left" disabled={!pages.length} onClick={goToPreviousPage} aria-label="Previous page tap zone" type="button" />
        <button className="reader-tap-zone reader-tap-zone-center" disabled={!pages.length} onClick={onRevealControls} aria-label="Show reader controls" type="button" />
        <button className="reader-tap-zone reader-tap-zone-right" disabled={!pages.length} onClick={goToNextPage} aria-label="Next page tap zone" type="button" />
      </div>
      <div className="mt-4 flex gap-3">
        <button className="btn" onClick={goToPreviousPage} type="button">
          Previous
        </button>
        <button className="btn btn-primary" onClick={goToNextPage} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
