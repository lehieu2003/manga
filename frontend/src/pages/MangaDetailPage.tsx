import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, Heart, Library, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChapterList } from "../components/ChapterList";
import { api, assetUrl } from "../lib/api";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLanguages, setSelectedLanguages] = useState(["vi", "en"]);
  const manga = useQuery({ queryKey: ["manga", mangaId], queryFn: () => api.getManga(mangaId), enabled: Boolean(mangaId) });
  const chapters = useInfiniteQuery({
    queryKey: ["chapters", mangaId, selectedLanguages],
    queryFn: ({ pageParam }) => api.getChapters(mangaId, { limit: 100, offset: pageParam, translatedLanguage: selectedLanguages }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(mangaId && selectedLanguages.length)
  });
  const progress = useQuery({
    queryKey: ["progress", "manga", mangaId],
    queryFn: () => api.getMangaProgress(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const libraryItem = useQuery({
    queryKey: ["library", mangaId],
    queryFn: () => api.getLibraryItem(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const isFollowed = Boolean(libraryItem.data?.item);
  const follow = useMutation({
    mutationFn: () => api.upsertLibrary(mangaId, { status: "READING", isFavorite: true }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["library"] }), queryClient.invalidateQueries({ queryKey: ["library", mangaId] })]);
      showToast({
        kind: "success",
        title: "Added to library",
        description: `${manga.data?.title ?? "This manga"} is ready on your shelf.`
      });
    },
    onError: (error) => {
      showToast({
        kind: "error",
        title: "Could not follow manga",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });
  const unfollow = useMutation({
    mutationFn: () => api.removeLibrary(mangaId),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["library"] }), queryClient.invalidateQueries({ queryKey: ["library", mangaId] })]);
      showToast({
        kind: "info",
        title: "Removed from library",
        description: `${manga.data?.title ?? "This manga"} was removed from your shelf.`
      });
    },
    onError: (error) => {
      showToast({
        kind: "error",
        title: "Could not remove manga",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  if (manga.isLoading) return <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading manga...</div>;
  if (manga.isError) return <div className="surface rounded-lg p-6 text-[var(--danger)]">{manga.error.message}</div>;
  if (!manga.data) return null;

  const chapterPages = chapters.data?.pages ?? [];
  const chapterItems = chapterPages.flatMap((page) => page.data);
  const chapterTotal = chapterPages[0]?.total ?? chapterItems.length;
  const continueChapter = chapterItems.find((chapter) => chapter.id === progress.data?.progress?.chapterId) ?? progress.data?.chapter;
  const languages = new Set(chapterItems.map((chapter) => chapter.translatedLanguage.toUpperCase())).size;
  const visibleLanguageCount = selectedLanguages.length;
  const latestPublishAt = chapterItems
    .map((chapter) => new Date(chapter.publishAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return (
    <div className="space-y-6">
      <section className="surface grid gap-6 rounded-lg p-5 md:grid-cols-[220px_1fr]">
        <div className="manga-cover-frame rounded-lg">
          {manga.data.coverUrl ? <img className="w-full object-cover" src={assetUrl(manga.data.coverUrl)} alt={manga.data.title} /> : null}
        </div>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">{manga.data.status ?? "Manga"}</p>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">{manga.data.title}</h1>
            {manga.data.altTitles.length ? <p className="mt-2 text-sm text-[var(--muted)]">{manga.data.altTitles.slice(0, 3).join(" · ")}</p> : null}
          </div>
          <p className="max-w-4xl text-sm leading-7 text-[var(--muted)]">{manga.data.description || "No description available."}</p>
          <div className="flex flex-wrap gap-2">
            {manga.data.tags.slice(0, 12).map((tag) => (
              <span key={tag} className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className={`btn ${isFollowed ? "" : "btn-primary"}`} disabled={!user || follow.isPending || isFollowed} onClick={() => follow.mutate()}>
              {!user ? <BookmarkPlus size={18} /> : isFollowed ? <BookmarkCheck size={18} /> : <Heart size={18} />}
              {follow.isPending ? "Saving..." : !user ? "Login to follow" : isFollowed ? "In library" : "Follow in library"}
            </button>
            {isFollowed ? (
              <>
                <Link className="btn" to="/library">
                  <Library size={18} />
                  Open library
                </Link>
                <button className="btn text-[var(--danger)]" disabled={unfollow.isPending} onClick={() => unfollow.mutate()}>
                  <Trash2 size={18} />
                  {unfollow.isPending ? "Removing..." : "Remove"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {progress.data?.progress && continueChapter ? (
        <section className="surface rounded-lg p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Continue Reading</p>
              <h2 className="text-2xl font-black">{manga.data.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Chapter {continueChapter.chapter ?? "?"} · Page {progress.data.progress.pageIndex + 1} / {continueChapter.pages || "?"}
              </p>
            </div>
            <Link className="btn btn-primary" to={`/read/${continueChapter.id}?mangaId=${mangaId}`}>
              <Play size={18} />
              Read next
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black">Chapters</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
              <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{chapterTotal} Chapters</span>
              <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{chapterItems.length} Loaded</span>
              <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{visibleLanguageCount} Selected Languages</span>
              <span className="rounded-md border border-[var(--line)] px-2.5 py-1">{languages || 0} Loaded Languages</span>
              <span className="rounded-md border border-[var(--line)] px-2.5 py-1">Last updated {latestPublishAt ? new Date(latestPublishAt).toLocaleDateString() : "unknown"}</span>
            </div>
          </div>
        </div>
        {!selectedLanguages.length ? (
          <ChapterList
            chapters={[]}
            mangaId={mangaId}
            currentProgress={progress.data?.progress}
            chaptersProgress={progress.data?.chaptersProgress}
            selectedLanguages={selectedLanguages}
            onSelectedLanguagesChange={setSelectedLanguages}
          />
        ) : chapters.isLoading ? (
          <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading chapters...</div>
        ) : chapters.isError ? (
          <div className="surface rounded-lg p-6 text-[var(--danger)]">{chapters.error.message}</div>
        ) : (
          <ChapterList
            chapters={chapterItems}
            mangaId={mangaId}
            currentProgress={progress.data?.progress}
            chaptersProgress={progress.data?.chaptersProgress}
            selectedLanguages={selectedLanguages}
            onSelectedLanguagesChange={setSelectedLanguages}
            hasMore={chapters.hasNextPage}
            isLoadingMore={chapters.isFetchingNextPage}
            onLoadMore={() => chapters.fetchNextPage()}
          />
        )}
      </section>
    </div>
  );
}
