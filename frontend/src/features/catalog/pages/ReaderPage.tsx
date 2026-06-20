import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { ReaderCanvas } from "@/features/catalog/reader/ReaderCanvas";
import { ReaderToolbar } from "@/features/catalog/reader/ReaderToolbar";
import { ReaderUnavailableState } from "@/features/catalog/reader/ReaderUnavailableState";
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
import { readReaderSettings, writeReaderSettings } from "@/features/catalog/reader/readerSettings";
import { useReaderData } from "@/features/catalog/reader/useReaderData";
import { CommentSection } from "@/features/comments/CommentSection";

export function ReaderPage() {
  const { chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mangaId = params.get("mangaId") ?? "";
  const { user } = useAuth();
  const [settings, setSettings] = useState(readReaderSettings);
  const { mode, fit, quality, navigationDirection } = settings;
  const [pageIndex, setPageIndex] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const lastScrollYRef = useRef(0);
  const toolbarTimerRef = useRef<number | null>(null);
  const data = useReaderData({ chapterId, mangaId, user, quality });

  useEffect(() => {
    writeReaderSettings(settings);
  }, [settings]);

  const showToolbarBriefly = useCallback(() => {
    setIsToolbarVisible(true);
    if (toolbarTimerRef.current !== null) window.clearTimeout(toolbarTimerRef.current);
    toolbarTimerRef.current = window.setTimeout(() => setIsToolbarVisible(false), 2600);
  }, []);

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
    setSettings((value) => ({ ...value, mode: "paged" }));
    preloadPages(data.pages, pageIndex);
  }, [data.pages, pageIndex]);

  useEffect(() => {
    showToolbarBriefly();
    return () => {
      if (toolbarTimerRef.current !== null) window.clearTimeout(toolbarTimerRef.current);
    };
  }, [chapterId, showToolbarBriefly]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const scrollingUp = currentY < lastScrollYRef.current;
      lastScrollYRef.current = currentY;
      if (scrollingUp || currentY < 24) {
        showToolbarBriefly();
        return;
      }
      if (currentY > 140) setIsToolbarVisible(false);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.clientY < 150) showToolbarBriefly();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [showToolbarBriefly]);

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
  useReaderKeyboardNavigation({ mode, navigationDirection, pagesLength: data.pages.length, goToPage });
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
      <ReaderUnavailableState
        errorMessage={data.reader.error.message}
        fallbackChapter={data.fallbackChapter}
        hasMangaContext={Boolean(mangaId)}
        isRetrying={data.reader.isFetching}
        onBackToChapters={() => navigate(`/manga/${mangaId}`)}
        onOpenFallback={() => goToChapter(data.fallbackChapter?.id ?? "")}
        onRetry={() => data.reader.refetch()}
      />
    );

  return (
    <div className="reader-page">
      <ReaderToolbar
        isVisible={isToolbarVisible}
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
        quality={quality}
        navigationDirection={navigationDirection}
        onGoToChapter={goToChapter}
        onFetchMoreChapters={data.fetchMoreChapters}
        onModeChange={(nextMode) => setSettings((value) => ({ ...value, mode: nextMode }))}
        onSwitchToPagedMode={switchToPagedMode}
        onFitToggle={() => setSettings((value) => ({ ...value, fit: value.fit === "width" ? "contain" : "width" }))}
        onNavigationDirectionToggle={() => setSettings((value) => ({ ...value, navigationDirection: value.navigationDirection === "ltr" ? "rtl" : "ltr" }))}
        onQualityToggle={() =>
          setSettings((value) => {
            setPageIndex((index) => Math.min(index, Math.max(data.pages.length - 1, 0)));
            return { ...value, quality: value.quality === "data-saver" ? "original" : "data-saver" };
          })
        }
        onReveal={showToolbarBriefly}
      />
      <ReaderCanvas
        mode={mode}
        fit={fit}
        navigationDirection={navigationDirection}
        pages={data.pages}
        pageIndex={pageIndex}
        imageRefs={imageRefs}
        onGoToPage={goToPage}
        onRevealControls={showToolbarBriefly}
      />
      <button className="reader-comment-launcher" onClick={() => setCommentsOpen(true)} type="button" aria-label="Open chapter comments">
        <MessageCircle size={18} />
      </button>
      {commentsOpen ? (
        <div className="reader-comment-drawer" role="dialog" aria-label="Chapter comments">
          <div className="reader-comment-backdrop" onClick={() => setCommentsOpen(false)} />
          <aside className="reader-comment-panel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent)]">Chapter thread</p>
                <h2 className="text-lg font-black text-[var(--text)]">Comments</h2>
              </div>
              <button className="btn reader-icon-button min-h-9" onClick={() => setCommentsOpen(false)} type="button" aria-label="Close comments">
                <X size={17} />
              </button>
            </div>
            <CommentSection targetType="CHAPTER" targetId={chapterId} user={user} compact />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
