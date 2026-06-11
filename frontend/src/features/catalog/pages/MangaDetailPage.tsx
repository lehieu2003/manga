import { useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/stores/auth.store";
import { ChapterSection } from "@/features/catalog/detail/ChapterSection";
import { ContinueReadingPanel } from "@/features/catalog/detail/ContinueReadingPanel";
import { MangaHero } from "@/features/catalog/detail/MangaHero";
import { getMangaDetailChapterView } from "@/features/catalog/detail/detail.logic";
import { useMangaDetail } from "@/features/catalog/detail/useMangaDetail";
import { useToast } from "@/stores/toast.store";

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const detail = useMangaDetail({ mangaId, user, showToast });

  if (detail.manga.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading manga...</div>;
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
    </div>
  );
}
