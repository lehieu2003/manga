import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, Heart, Library, Trash2 } from "lucide-react";
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
  const manga = useQuery({ queryKey: ["manga", mangaId], queryFn: () => api.getManga(mangaId), enabled: Boolean(mangaId) });
  const chapters = useQuery({ queryKey: ["chapters", mangaId], queryFn: () => api.getChapters(mangaId), enabled: Boolean(mangaId) });
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

  return (
    <div className="space-y-6">
      <section className="surface grid gap-6 rounded-lg p-5 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-lg bg-[#101418]">
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

      <section className="space-y-4">
        <h2 className="text-xl font-black">Chapters</h2>
        {chapters.isLoading ? (
          <div className="surface rounded-lg p-6 text-[var(--muted)]">Loading chapters...</div>
        ) : chapters.isError ? (
          <div className="surface rounded-lg p-6 text-[var(--danger)]">{chapters.error.message}</div>
        ) : (
          <ChapterList chapters={chapters.data?.data ?? []} mangaId={mangaId} />
        )}
      </section>
    </div>
  );
}
