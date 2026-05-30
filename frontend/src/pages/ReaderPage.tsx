import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Columns2, Maximize2, Rows3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, assetUrl } from "../lib/api";
import { useAuth } from "../state/auth";
import type { ChapterSummary } from "../types";

type ReaderChapterNavItem = ChapterSummary & {
  state: "read" | "current" | "new";
  isCurrent: boolean;
};

type ReaderQuality = "data-saver";

export function ReaderPage() {
  const { chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mangaId = params.get("mangaId") ?? "";
  const { user } = useAuth();
  const [mode, setMode] = useState<"vertical" | "paged">("vertical");
  const [fit, setFit] = useState<"width" | "contain">("width");
  const [quality] = useState<ReaderQuality>("data-saver");
  const [pageIndex, setPageIndex] = useState(0);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);
  const progressSnapshotRef = useRef<{ chapterId: string; mangaId: string; pageIndex: number; completed: boolean } | null>(null);
  const reader = useQuery({ queryKey: ["reader", chapterId], queryFn: () => api.getReader(chapterId), enabled: Boolean(chapterId) });
  const chapters = useInfiniteQuery({
    queryKey: ["reader-chapters", mangaId],
    queryFn: ({ pageParam }) => api.getChapters(mangaId, { limit: 100, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(mangaId)
  });
  const progress = useQuery({
    queryKey: ["progress", "manga", mangaId],
    queryFn: () => api.getMangaProgress(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const hasMoreChapters = Boolean(chapters.hasNextPage);
  const isFetchingMoreChapters = chapters.isFetchingNextPage;
  const fetchMoreChapters = chapters.fetchNextPage;
  const { mutate: saveProgress } = useMutation({
    mutationFn: (input: { chapterId: string; mangaId: string; pageIndex: number; completed: boolean }) =>
      api.saveProgress(input.chapterId, { mangaId: input.mangaId, pageIndex: input.pageIndex, completed: input.completed })
  });

  const pages = useMemo(() => {
    const urls = quality === "data-saver" ? reader.data?.dataSaverPageUrls : reader.data?.dataSaverPageUrls;
    return urls?.map(assetUrl).filter((page): page is string => Boolean(page)) ?? [];
  }, [quality, reader.data]);
  const visiblePage = pages[pageIndex];
  const imageClass = fit === "contain" ? "max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain" : "";
  const chapterItems = useMemo(() => chapters.data?.pages.flatMap((page) => page.data) ?? [], [chapters.data]);
  const sortedChapters = useMemo(() => [...chapterItems].sort(compareChapters), [chapterItems]);
  const currentChapterIndex = sortedChapters.findIndex((chapter) => chapter.id === chapterId);
  const previousChapter = currentChapterIndex > 0 ? sortedChapters[currentChapterIndex - 1] : undefined;
  const nextChapter = currentChapterIndex >= 0 ? sortedChapters[currentChapterIndex + 1] : undefined;
  const navigationUnavailable = !mangaId;
  const currentChapterLoaded = currentChapterIndex >= 0;
  const navItems = useMemo<ReaderChapterNavItem[]>(() => {
    const currentSortValue = chapterSortValue(sortedChapters[currentChapterIndex]);
    return sortedChapters.map((chapter) => {
      const isCurrent = chapter.id === chapterId;
      const explicitProgress = progress.data?.chaptersProgress.find((item) => item.chapterId === chapter.id);
      const isReadByProgress = Boolean(explicitProgress?.completed);
      const isReadByOrder = Number.isFinite(currentSortValue) && chapterSortValue(chapter) < currentSortValue;
      return {
        ...chapter,
        isCurrent,
        state: isCurrent ? "current" : isReadByProgress || isReadByOrder ? "read" : "new"
      };
    });
  }, [chapterId, currentChapterIndex, progress.data?.chaptersProgress, sortedChapters]);

  const goToChapter = (id: string) => {
    if (!id || id === chapterId) return;
    navigate(`/read/${id}?mangaId=${mangaId}`);
  };

  useEffect(() => {
    setPageIndex(0);
    imageRefs.current = [];
  }, [chapterId]);

  useEffect(() => {
    if (!progress.data?.progress || progress.data.progress.chapterId !== chapterId) return;
    setPageIndex(progress.data.progress.pageIndex);
  }, [chapterId, progress.data?.progress]);

  useEffect(() => {
    if (!mangaId || currentChapterLoaded || !hasMoreChapters || isFetchingMoreChapters) return;
    void fetchMoreChapters();
  }, [currentChapterLoaded, fetchMoreChapters, hasMoreChapters, isFetchingMoreChapters, mangaId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode !== "paged") return;
      if (event.key === "ArrowRight") setPageIndex((value) => Math.min(value + 1, Math.max(pages.length - 1, 0)));
      if (event.key === "ArrowLeft") setPageIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, pages.length]);

  useEffect(() => {
    if (mode !== "vertical" || !pages.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextIndex = Number(visibleEntry?.target.getAttribute("data-page-index"));
        if (Number.isFinite(nextIndex)) setPageIndex(nextIndex);
      },
      { rootMargin: "-18% 0px -45% 0px", threshold: [0.35, 0.55, 0.75] }
    );
    for (const image of imageRefs.current) {
      if (image) observer.observe(image);
    }
    return () => observer.disconnect();
  }, [mode, pages.length]);

  useEffect(() => {
    if (mode !== "paged" || !pages.length) return;
    for (const page of pages.slice(pageIndex + 1, pageIndex + 3)) {
      const image = new Image();
      image.src = page;
    }
  }, [mode, pageIndex, pages]);

  useEffect(() => {
    if (!nextChapter?.id) return;
    void queryClient.prefetchQuery({
      queryKey: ["reader", nextChapter.id],
      queryFn: () => api.getReader(nextChapter.id)
    });
  }, [nextChapter?.id, queryClient]);

  useEffect(() => {
    if (!user || !mangaId || !pages.length) return;
    const timer = window.setTimeout(() => {
      saveProgress({ chapterId, mangaId, pageIndex, completed: pageIndex >= pages.length - 1 });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [chapterId, user, mangaId, pages.length, pageIndex, saveProgress]);

  useEffect(() => {
    progressSnapshotRef.current =
      user && mangaId && pages.length ? { chapterId, mangaId, pageIndex, completed: pageIndex >= pages.length - 1 } : null;
  }, [chapterId, user, mangaId, pages.length, pageIndex]);

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

  if (reader.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Preparing reader...</div>;
  if (reader.isError)
    return (
      <div className="surface space-y-4 rounded-lg p-6">
        <p className="text-[var(--danger)]">{reader.error.message}</p>
        <button className="btn btn-primary" onClick={() => reader.refetch()}>
          Retry
        </button>
      </div>
    );

  return (
    <div className="reader-page -mx-4 md:mx-0">
      <div className="reader-toolbar sticky top-16 z-30 mb-4 border-y px-4 py-3 backdrop-blur-xl md:rounded-lg md:border">
        <div className="container-x flex items-center justify-between gap-3 px-0">
          <Link className="btn min-h-9" to={mangaId ? `/manga/${mangaId}` : "/search"}>
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="text-sm text-[var(--muted)]">
            Page {Math.min(pageIndex + 1, pages.length)} / {pages.length}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button className="btn min-h-9 px-2" disabled={!previousChapter} onClick={() => previousChapter && goToChapter(previousChapter.id)} aria-label="Previous chapter">
              <ChevronLeft size={17} />
              <span className="hidden lg:inline">Prev Chapter</span>
            </button>
            <label className="min-w-[12rem] flex-1 sm:flex-none">
              <span className="sr-only">Select chapter</span>
              <select
                className="control min-h-9 w-full rounded-lg px-3 text-sm"
                value={currentChapterLoaded ? chapterId : ""}
                disabled={navigationUnavailable || !currentChapterLoaded}
                onChange={(event) => goToChapter(event.target.value)}
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
              <button className="btn min-h-9 px-2 text-sm" disabled={isFetchingMoreChapters} onClick={() => fetchMoreChapters()} type="button">
                {isFetchingMoreChapters ? "Loading..." : "Load more"}
              </button>
            ) : null}
            <button className="btn min-h-9 px-2" disabled={!nextChapter} onClick={() => nextChapter && goToChapter(nextChapter.id)} aria-label="Next chapter">
              <span className="hidden lg:inline">Next Chapter</span>
              <ChevronRight size={17} />
            </button>
            <div className="flex rounded-lg border border-[var(--line)] p-1">
              <button className={`btn min-h-8 border-0 px-2 ${mode === "vertical" ? "bg-[var(--surface-strong)]" : ""}`} onClick={() => setMode("vertical")} aria-label="Vertical mode">
                <Rows3 size={17} />
              </button>
              <button className={`btn min-h-8 border-0 px-2 ${mode === "paged" ? "bg-[var(--surface-strong)]" : ""}`} onClick={() => setMode("paged")} aria-label="Paged mode">
                <Columns2 size={17} />
              </button>
              <button className={`btn min-h-8 border-0 px-2 ${fit === "contain" ? "bg-[var(--surface-strong)]" : ""}`} onClick={() => setFit((value) => (value === "width" ? "contain" : "width"))} aria-label="Toggle image fit">
                <Maximize2 size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === "vertical" ? (
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
      ) : (
        <div className="grid min-h-[70vh] place-items-center">
          {visiblePage ? <img className={imageClass} src={visiblePage} alt={`Page ${pageIndex + 1}`} /> : null}
          <div className="mt-4 flex gap-3">
            <button className="btn" onClick={() => setPageIndex((value) => Math.max(value - 1, 0))}>
              Previous
            </button>
            <button className="btn btn-primary" onClick={() => setPageIndex((value) => Math.min(value + 1, pages.length - 1))}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function compareChapters(a: ChapterSummary, b: ChapterSummary) {
  const byChapter = chapterSortValue(a) - chapterSortValue(b);
  const byDate = new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
  return byChapter || byDate || a.id.localeCompare(b.id);
}

function chapterSortValue(chapter: ChapterSummary | undefined) {
  if (!chapter) return Number.NaN;
  const parsed = Number.parseFloat(chapter.chapter ?? "");
  if (Number.isFinite(parsed)) return parsed;
  const published = new Date(chapter.publishAt).getTime();
  return Number.isFinite(published) ? published / 1000000000000 : Number.NaN;
}
