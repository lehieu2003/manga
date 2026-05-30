import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Columns2, Maximize2, Rows3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, assetUrl } from "../lib/api";
import { useAuth } from "../state/auth";

export function ReaderPage() {
  const { chapterId = "" } = useParams();
  const [params] = useSearchParams();
  const mangaId = params.get("mangaId") ?? "";
  const { user } = useAuth();
  const [mode, setMode] = useState<"vertical" | "paged">("vertical");
  const [fit, setFit] = useState<"width" | "contain">("width");
  const [pageIndex, setPageIndex] = useState(0);
  const reader = useQuery({ queryKey: ["reader", chapterId], queryFn: () => api.getReader(chapterId), enabled: Boolean(chapterId) });
  const progress = useQuery({
    queryKey: ["progress", "manga", mangaId],
    queryFn: () => api.getMangaProgress(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const saveProgress = useMutation({
    mutationFn: (input: { pageIndex: number; completed: boolean }) => api.saveProgress(chapterId, { mangaId, ...input })
  });

  const pages = useMemo(() => reader.data?.dataSaverPageUrls.map(assetUrl).filter((page): page is string => Boolean(page)) ?? [], [reader.data]);
  const visiblePage = pages[pageIndex];
  const imageClass = fit === "contain" ? "max-h-[calc(100vh-11rem)] w-auto max-w-full object-contain" : "";

  useEffect(() => {
    if (!progress.data?.progress || progress.data.progress.chapterId !== chapterId) return;
    setPageIndex(progress.data.progress.pageIndex);
  }, [chapterId, progress.data?.progress]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setPageIndex((value) => Math.min(value + 1, Math.max(pages.length - 1, 0)));
      if (event.key === "ArrowLeft") setPageIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  useEffect(() => {
    if (!user || !mangaId || !pages.length) return;
    const timer = window.setTimeout(() => {
      saveProgress.mutate({ pageIndex, completed: pageIndex >= pages.length - 1 });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [user, mangaId, pages.length, pageIndex]);

  useEffect(() => {
    if (!user || !mangaId || !pages.length) return;
    const save = () => saveProgress.mutate({ pageIndex, completed: pageIndex >= pages.length - 1 });
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("beforeunload", save);
      save();
    };
  }, [user, mangaId, pages.length, pageIndex]);

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
      <div className="sticky top-16 z-30 mb-4 border-y border-[var(--line)] bg-[rgba(8,10,13,0.9)] px-4 py-3 backdrop-blur-xl md:rounded-lg md:border">
        <div className="container-x flex items-center justify-between gap-3 px-0">
          <Link className="btn min-h-9" to={mangaId ? `/manga/${mangaId}` : "/search"}>
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="text-sm text-[var(--muted)]">
            Page {Math.min(pageIndex + 1, pages.length)} / {pages.length}
          </div>
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

      {mode === "vertical" ? (
        <div className="space-y-2">
          {pages.length ? (
            pages.map((page, index) => (
              <img key={page} className={imageClass} src={page} alt={`Page ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} onLoad={() => setPageIndex(index)} />
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
