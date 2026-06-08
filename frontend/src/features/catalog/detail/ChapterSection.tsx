import { ChapterList } from "@/features/catalog/components/ChapterList";
import type { ChapterSummary, MangaProgressPayload } from "@/types";

export function ChapterSection({
  mangaId,
  chapterItems,
  chapterTotal,
  visibleLanguageCount,
  languages,
  latestPublishAt,
  selectedLanguages,
  onSelectedLanguagesChange,
  progress,
  chapters,
  needsSync
}: {
  mangaId: string;
  chapterItems: ChapterSummary[];
  chapterTotal: number;
  visibleLanguageCount: number;
  languages: number;
  latestPublishAt: number;
  selectedLanguages: string[];
  onSelectedLanguagesChange: (languages: string[]) => void;
  progress?: MangaProgressPayload;
  chapters: {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };
  needsSync?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black">Chapters</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{chapterTotal} Chapters</span>
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{chapterItems.length} Loaded</span>
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{visibleLanguageCount} Selected Languages</span>
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{languages || 0} Loaded Languages</span>
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1">Last updated {Number.isFinite(latestPublishAt) ? new Date(latestPublishAt).toLocaleDateString() : "unknown"}</span>
          </div>
        </div>
      </div>
      {!selectedLanguages.length ? (
        <ChapterList
          chapters={[]}
          mangaId={mangaId}
          currentProgress={progress?.progress}
          chaptersProgress={progress?.chaptersProgress}
          selectedLanguages={selectedLanguages}
          onSelectedLanguagesChange={onSelectedLanguagesChange}
        />
      ) : chapters.isLoading ? (
        <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading chapters...</div>
      ) : chapters.isError ? (
        <div className="surface rounded-lg p-6 text-[var(--danger)]">{chapters.error?.message}</div>
      ) : (
        <ChapterList
          chapters={chapterItems}
          mangaId={mangaId}
          currentProgress={progress?.progress}
          chaptersProgress={progress?.chaptersProgress}
          selectedLanguages={selectedLanguages}
          onSelectedLanguagesChange={onSelectedLanguagesChange}
          needsSync={needsSync}
          hasMore={chapters.hasNextPage}
          isLoadingMore={chapters.isFetchingNextPage}
          onLoadMore={() => chapters.fetchNextPage()}
        />
      )}
    </section>
  );
}
