import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { ChapterSection } from "@/features/catalog/detail/ChapterSection";
import { ContinueReadingPanel } from "@/features/catalog/detail/ContinueReadingPanel";
import { MangaHero } from "@/features/catalog/detail/MangaHero";
import { getMangaDetailChapterView } from "@/features/catalog/detail/detail.logic";
import { useMangaDetail } from "@/features/catalog/detail/useMangaDetail";
import { CommentSection } from "@/features/comments/CommentSection";
import { useToast } from "@/stores/toast.store";

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const detail = useMangaDetail({ mangaId, user, showToast });

  if (detail.manga.isLoading) return <MangaDetailSkeleton />;
  if (detail.manga.isError) return <div className="surface rounded-lg p-6 text-[var(--danger)]">{detail.manga.error.message}</div>;
  if (!detail.manga.data) return null;

  const chapterView = getMangaDetailChapterView({
    chapterPages: detail.chapters.data?.pages ?? [],
    progress: detail.progress.data
  });
  const chaptersNeedSync = Boolean(detail.chapters.data?.pages.some((page) => page.needsSync));

  return (
    <div className="space-y-6">
      <MangaHero manga={detail.manga.data} user={user} isFollowed={detail.isFollowed} follow={detail.follow} unfollow={detail.unfollow} />
      <ContinueReadingPanel mangaId={mangaId} title={detail.manga.data.title} continueChapter={chapterView.continueChapter} progress={detail.progress.data?.progress} />
      <ChapterSection
        mangaId={mangaId}
        chapterItems={chapterView.chapterItems}
        chapterTotal={chapterView.chapterTotal}
        visibleLanguageCount={detail.selectedLanguages.length}
        languages={chapterView.languages}
        latestPublishAt={chapterView.latestPublishAt}
        selectedLanguages={detail.selectedLanguages}
        onSelectedLanguagesChange={detail.setSelectedLanguages}
        onChapterSearchChange={detail.setChapterSearch}
        progress={detail.progress.data}
        chapters={detail.chapters}
        needsSync={chaptersNeedSync}
      />
      <CommentSection targetType="MANGA" targetId={mangaId} user={user} />
    </div>
  );
}

function MangaDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading manga detail">
      <section className="surface manga-hero rounded-lg p-5">
        <div className="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="aspect-[2/3] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] opacity-80 animate-pulse" />
          <div className="grid content-start gap-4">
            <div className="h-3 w-28 rounded bg-[var(--accent-tint)] animate-pulse" />
            <div className="h-9 w-full max-w-xl rounded bg-[var(--surface-strong)] animate-pulse" />
            <div className="grid gap-2">
              <div className="h-4 w-full rounded bg-[var(--surface-strong)] animate-pulse" />
              <div className="h-4 w-11/12 rounded bg-[var(--surface-strong)] animate-pulse" />
              <div className="h-4 w-8/12 rounded bg-[var(--surface-strong)] animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className="h-8 w-20 rounded-md border border-[var(--line)] bg-[var(--accent-soft)] animate-pulse" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="h-10 w-32 rounded-lg bg-[var(--accent-tint)] animate-pulse" />
              <span className="h-10 w-28 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      <section className="surface rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="grid gap-2">
            <div className="h-3 w-32 rounded bg-[var(--accent-tint)] animate-pulse" />
            <div className="h-6 w-64 max-w-full rounded bg-[var(--surface-strong)] animate-pulse" />
          </div>
          <div className="h-10 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
        </div>
      </section>

      <section className="surface overflow-hidden rounded-lg">
        <div className="border-b border-[var(--line)] p-4">
          <div className="h-6 w-44 rounded bg-[var(--surface-strong)] animate-pulse" />
        </div>
        <div className="divide-y divide-[var(--line)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <span className="size-8 rounded-full border border-[var(--line)] bg-[var(--surface-strong)] animate-pulse" />
              <div className="grid flex-1 gap-2">
                <span className="h-4 w-48 max-w-full rounded bg-[var(--surface-strong)] animate-pulse" />
                <span className="h-3 w-32 rounded bg-[var(--accent-soft)] animate-pulse" />
              </div>
              <span className="hidden h-8 w-24 rounded-md bg-[var(--surface-strong)] animate-pulse sm:block" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
