import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";
import { api } from "@/api";
import type { User } from "@/types";
import type { ReaderMode, ReaderNavigationDirection } from "./reader.types";

type SaveProgress = (input: { chapterId: string; mangaId: string; pageIndex: number; completed: boolean }) => void;

export function useReaderChapterReset({ chapterId, imageRefs, setPageIndex }: { chapterId: string; imageRefs: RefObject<Array<HTMLImageElement | null>>; setPageIndex: (value: number) => void }) {
  useEffect(() => {
    setPageIndex(0);
    imageRefs.current = [];
  }, [chapterId, imageRefs, setPageIndex]);
}

export function useReaderInitialProgress({
  chapterId,
  progressChapterId,
  progressPageIndex,
  setPageIndex
}: {
  chapterId: string;
  progressChapterId?: string;
  progressPageIndex?: number;
  setPageIndex: (value: number) => void;
}) {
  useEffect(() => {
    if (!progressChapterId || progressChapterId !== chapterId || progressPageIndex === undefined) return;
    setPageIndex(progressPageIndex);
  }, [chapterId, progressChapterId, progressPageIndex, setPageIndex]);
}

export function useReaderChapterAutoLoad({
  mangaId,
  currentChapterLoaded,
  hasMoreChapters,
  isFetchingMoreChapters,
  fetchMoreChapters
}: {
  mangaId: string;
  currentChapterLoaded: boolean;
  hasMoreChapters: boolean;
  isFetchingMoreChapters: boolean;
  fetchMoreChapters: () => void;
}) {
  useEffect(() => {
    if (!mangaId || currentChapterLoaded || !hasMoreChapters || isFetchingMoreChapters) return;
    void fetchMoreChapters();
  }, [currentChapterLoaded, fetchMoreChapters, hasMoreChapters, isFetchingMoreChapters, mangaId]);
}

export function useReaderKeyboardNavigation({
  mode,
  navigationDirection,
  pagesLength,
  goToPage
}: {
  mode: ReaderMode;
  navigationDirection: ReaderNavigationDirection;
  pagesLength: number;
  goToPage: (getNextIndex: (value: number) => number) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode !== "paged") return;
      const nextPage = () => goToPage((value) => Math.min(value + 1, Math.max(pagesLength - 1, 0)));
      const previousPage = () => goToPage((value) => Math.max(value - 1, 0));
      if (event.key === "ArrowRight") {
        if (navigationDirection === "rtl") previousPage();
        else nextPage();
      }
      if (event.key === "ArrowLeft") {
        if (navigationDirection === "rtl") nextPage();
        else previousPage();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToPage, mode, navigationDirection, pagesLength]);
}

export function useVisibleReaderPage({
  mode,
  pagesLength,
  imageRefs,
  setPageIndex
}: {
  mode: ReaderMode;
  pagesLength: number;
  imageRefs: RefObject<Array<HTMLImageElement | null>>;
  setPageIndex: (value: number) => void;
}) {
  useEffect(() => {
    if (mode !== "vertical" || !pagesLength || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        let visibleEntry: IntersectionObserverEntry | undefined;
        for (const entry of entries) {
          if (entry.isIntersecting && (!visibleEntry || entry.intersectionRatio > visibleEntry.intersectionRatio)) visibleEntry = entry;
        }
        const nextIndex = Number(visibleEntry?.target.getAttribute("data-page-index"));
        if (Number.isFinite(nextIndex)) setPageIndex(nextIndex);
      },
      { rootMargin: "-18% 0px -45% 0px", threshold: [0.35, 0.55, 0.75] }
    );
    for (const image of imageRefs.current) {
      if (image) observer.observe(image);
    }
    return () => observer.disconnect();
  }, [imageRefs, mode, pagesLength, setPageIndex]);
}

export function useReaderNextChapterPrefetch({ nextChapterId, queryClient }: { nextChapterId?: string; queryClient: QueryClient }) {
  useEffect(() => {
    if (!nextChapterId) return;
    void queryClient.prefetchQuery({
      queryKey: ["reader", nextChapterId],
      queryFn: () => api.getReader(nextChapterId)
    });
  }, [nextChapterId, queryClient]);
}

export function useReaderProgressPersistence({
  user,
  mangaId,
  pagesLength,
  chapterId,
  pageIndex,
  saveProgress
}: {
  user?: User | null;
  mangaId: string;
  pagesLength: number;
  chapterId: string;
  pageIndex: number;
  saveProgress: SaveProgress;
}) {
  const progressSnapshotRef = useRef<{ chapterId: string; mangaId: string; pageIndex: number; completed: boolean } | null>(null);

  useEffect(() => {
    if (!user || !mangaId || !pagesLength) return;
    const timer = window.setTimeout(() => {
      saveProgress({ chapterId, mangaId, pageIndex, completed: pageIndex >= pagesLength - 1 });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [chapterId, user, mangaId, pagesLength, pageIndex, saveProgress]);

  useEffect(() => {
    progressSnapshotRef.current = user && mangaId && pagesLength ? { chapterId, mangaId, pageIndex, completed: pageIndex >= pagesLength - 1 } : null;
  }, [chapterId, user, mangaId, pagesLength, pageIndex]);

  useEffect(() => {
    const save = () => {
      const snapshot = progressSnapshotRef.current;
      if (!snapshot) return;
      saveProgress(snapshot);
    };
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, [saveProgress]);
}
