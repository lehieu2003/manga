import { useCallback, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { ReaderCanvas } from "@/features/catalog/reader/ReaderCanvas";
import { ReaderToolbar } from "@/features/catalog/reader/ReaderToolbar";
import {
  useReaderChapterAutoLoad,
  useReaderChapterReset,
  useReaderInitialProgress,
  useReaderKeyboardNavigation,
  useReaderNextChapterPrefetch,
  useReaderProgressPersistence,
  useVisibleReaderPage
} from "@/features/catalog/reader/reader.effects";
import { preloadPages } from "@/features/catalog/reader/reader.logic";
import type { ReaderFit, ReaderMode, ReaderQuality } from "@/features/catalog/reader/reader.types";
import { useReaderData } from "@/features/catalog/reader/useReaderData";

export function ReaderPage() {
  const { chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mangaId = params.get("mangaId") ?? "";
  const { user } = useAuth();
  const [mode, setMode] = useState<ReaderMode>("vertical");
  const [fit, setFit] = useState<ReaderFit>("width");
  const [quality] = useState<ReaderQuality>("data-saver");
  const [pageIndex, setPageIndex] = useState(0);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const data = useReaderData({ chapterId, mangaId, user, quality });

  const goToChapter = (id: string) => {
    if (!id || id === chapterId) return;
    navigate(`/read/${id}?mangaId=${mangaId}`);
  };

  const goToPage = useCallback(
    (getNextIndex: (value: number) => number) => {
      setPageIndex((value) => {
        const nextIndex = getNextIndex(value);
        preloadPages(data.pages, nextIndex);
        return nextIndex;
      });
    },
    [data.pages]
  );

  const switchToPagedMode = useCallback(() => {
    setMode("paged");
    preloadPages(data.pages, pageIndex);
  }, [data.pages, pageIndex]);

  useReaderChapterReset({ chapterId, imageRefs, setPageIndex });
  useReaderInitialProgress({
    chapterId,
    progressChapterId: data.progress.data?.progress?.chapterId,
    progressPageIndex: data.progress.data?.progress?.pageIndex,
    setPageIndex
  });
  useReaderChapterAutoLoad({
    mangaId,
    currentChapterLoaded: data.currentChapterLoaded,
    hasMoreChapters: data.hasMoreChapters,
    isFetchingMoreChapters: data.isFetchingMoreChapters,
    fetchMoreChapters: data.fetchMoreChapters
  });
  useReaderKeyboardNavigation({ mode, pagesLength: data.pages.length, goToPage });
  useVisibleReaderPage({ mode, pagesLength: data.pages.length, imageRefs, setPageIndex });
  useReaderNextChapterPrefetch({ nextChapterId: data.nextChapter?.id, queryClient: data.queryClient });
  useReaderProgressPersistence({
    user,
    mangaId,
    pagesLength: data.pages.length,
    chapterId,
    pageIndex,
    saveProgress: data.saveProgress
  });

  if (data.reader.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Preparing reader...</div>;
  if (data.reader.isError)
    return (
      <div className="surface space-y-4 rounded-lg p-6">
        <p className="text-[var(--danger)]">{data.reader.error.message}</p>
        <button className="btn btn-primary" onClick={() => data.reader.refetch()} type="button">
          Retry
        </button>
      </div>
    );

  return (
    <div className="reader-page -mx-4 md:mx-0">
      <ReaderToolbar
        mangaId={mangaId}
        pageIndex={pageIndex}
        pagesLength={data.pages.length}
        previousChapter={data.previousChapter}
        nextChapter={data.nextChapter}
        navigationUnavailable={data.navigationUnavailable}
        currentChapterLoaded={data.currentChapterLoaded}
        chapterId={chapterId}
        navItems={data.navItems}
        hasMoreChapters={data.hasMoreChapters}
        isFetchingMoreChapters={data.isFetchingMoreChapters}
        mode={mode}
        fit={fit}
        onGoToChapter={goToChapter}
        onFetchMoreChapters={data.fetchMoreChapters}
        onModeChange={setMode}
        onSwitchToPagedMode={switchToPagedMode}
        onFitToggle={() => setFit((value) => (value === "width" ? "contain" : "width"))}
      />
      <ReaderCanvas mode={mode} fit={fit} pages={data.pages} pageIndex={pageIndex} imageRefs={imageRefs} onGoToPage={goToPage} />
    </div>
  );
}
