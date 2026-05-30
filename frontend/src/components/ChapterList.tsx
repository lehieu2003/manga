import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ChapterSummary, ReadingProgress } from "../types";

type SortMode = "newest" | "oldest";

export function ChapterList({
  chapters,
  mangaId,
  currentProgress,
  chaptersProgress,
  hasMore,
  isLoadingMore,
  onLoadMore
}: {
  chapters: ChapterSummary[];
  mangaId: string;
  currentProgress?: ReadingProgress | null;
  chaptersProgress?: ReadingProgress[];
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [chapterSearch, setChapterSearch] = useState("");
  const progressByChapterId = useMemo(() => new Map((chaptersProgress ?? []).map((progress) => [progress.chapterId, progress])), [chaptersProgress]);
  const currentChapter = useMemo(() => chapters.find((chapter) => chapter.id === currentProgress?.chapterId), [chapters, currentProgress?.chapterId]);
  const currentSortValue = chapterSortValue(currentChapter);
  const latestSortValue = Math.max(...chapters.map(chapterSortValue).filter(Number.isFinite));
  const latestChapterNumber = chapters.find((chapter) => chapterSortValue(chapter) === latestSortValue)?.chapter ?? null;

  const visibleChapters = useMemo(() => {
    const needle = chapterSearch.trim().toLowerCase();
    return [...chapters]
      .filter((chapter) => {
        if (!needle) return true;
        return [chapter.chapter, chapter.title].filter(Boolean).some((value) => value!.toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const byChapter = chapterSortValue(a) - chapterSortValue(b);
        const byDate = new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
        const direction = sortMode === "oldest" ? 1 : -1;
        return (byChapter || byDate || a.id.localeCompare(b.id)) * direction;
      });
  }, [chapters, chapterSearch, sortMode]);

  if (!chapters.length) {
    return <div className="surface rounded-lg p-6 text-[var(--muted)]">No Vietnamese or English chapters were found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="surface rounded-lg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
            <span className="chapter-legend">✓ Read</span>
            <span className="chapter-legend">▶ Current</span>
            <span className="chapter-legend">● New</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button className="btn min-h-10 text-sm" onClick={() => setSortMode((value) => (value === "newest" ? "oldest" : "newest"))} type="button">
              {sortMode === "newest" ? "↓ Newest First" : "↑ Oldest First"}
            </button>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[#0d1116] px-3">
              <Search size={16} color="var(--accent)" />
              <input
                className="w-full min-w-[13rem] bg-transparent text-sm outline-none"
                value={chapterSearch}
                onChange={(event) => setChapterSearch(event.target.value)}
                placeholder="Search chapter..."
              />
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--line)]">
        {visibleChapters.length ? (
          visibleChapters.map((chapter) => {
            const state = getChapterState(chapter, progressByChapterId, currentProgress, currentSortValue);
            const isCurrent = state === "current";
            const isLatest = latestChapterNumber !== null && chapter.chapter === latestChapterNumber;
            return (
              <Link
                key={chapter.id}
                to={`/read/${chapter.id}?mangaId=${mangaId}`}
                className={`chapter-row ${isCurrent ? "chapter-row-current" : ""}`}
              >
                <span className={`chapter-state chapter-state-${state}`} aria-label={state}>
                  {state === "read" ? "✓" : state === "current" ? "▶" : "●"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="chapter-number">Chapter {chapter.chapter ?? "?"}</span>
                    {isCurrent ? <span className="chapter-current-badge">Current Reading</span> : null}
                    {isLatest ? <span className="chapter-new-badge">NEW</span> : null}
                  </span>
                  {chapter.title ? <span className="mt-1 block truncate text-sm text-[var(--text)]">{chapter.title}</span> : null}
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="language-badge">[{chapter.translatedLanguage.toUpperCase()}]</span>
                    <span>{chapter.pages} pages</span>
                    <span>{estimateReadingTime(chapter.pages)}</span>
                    {chapter.scanlationGroup ? <span>{chapter.scanlationGroup}</span> : null}
                  </span>
                </span>
                <ChevronRight className="shrink-0 text-[var(--accent)]" size={18} />
              </Link>
            );
          })
        ) : (
          <div className="bg-[rgba(17,21,26,0.72)] p-6 text-center text-[var(--muted)]">No chapter matches your search.</div>
        )}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <button className="btn btn-primary" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading..." : "Load more chapters"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getChapterState(chapter: ChapterSummary, progressByChapterId: Map<string, ReadingProgress>, currentProgress?: ReadingProgress | null, currentSortValue?: number) {
  if (chapter.id === currentProgress?.chapterId) return "current";
  const explicitProgress = progressByChapterId.get(chapter.id);
  if (explicitProgress?.completed) return "read";
  if (currentSortValue !== undefined && Number.isFinite(currentSortValue)) {
    const sortValue = chapterSortValue(chapter);
    if (Number.isFinite(sortValue) && sortValue < currentSortValue) return "read";
  }
  return "new";
}

function chapterSortValue(chapter: ChapterSummary | undefined) {
  if (!chapter) return Number.NaN;
  const parsed = Number.parseFloat(chapter.chapter ?? "");
  if (Number.isFinite(parsed)) return parsed;
  const published = new Date(chapter.publishAt).getTime();
  return Number.isFinite(published) ? published / 1000000000000 : Number.NaN;
}

function estimateReadingTime(pages: number) {
  return `~${Math.max(1, Math.ceil(pages / 6))} mins`;
}
