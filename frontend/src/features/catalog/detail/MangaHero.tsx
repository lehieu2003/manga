import { BookmarkCheck, BookmarkPlus, Heart, Library, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { assetUrl } from "@/api";
import type { MangaSummary, User } from "@/types";

type MangaHeroProps = {
  manga: MangaSummary;
  user?: User | null;
  isFollowed: boolean;
  follow: { isPending: boolean; mutate: () => void };
  unfollow: { isPending: boolean; mutate: () => void };
};

export function MangaHero({ manga, user, isFollowed, follow, unfollow }: MangaHeroProps) {
  return (
    <section className="surface grid gap-6 rounded-lg p-5 md:grid-cols-[220px_1fr]">
      <div className="manga-cover-frame rounded-lg">
        {manga.coverUrl ? <img className="w-full object-cover" src={assetUrl(manga.coverUrl)} alt={manga.title} /> : null}
      </div>
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">{manga.status ?? "Manga"}</p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{manga.title}</h1>
          {manga.altTitles.length ? <p className="mt-2 text-sm text-[var(--muted)]">{manga.altTitles.slice(0, 3).join(" · ")}</p> : null}
        </div>
        <p className="max-w-4xl text-sm leading-7 text-[var(--muted)]">{manga.description || "No description available."}</p>
        <div className="flex flex-wrap gap-2">
          {manga.tags.slice(0, 12).map((tag) => (
            <span key={tag} className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)]">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className={`btn ${isFollowed ? "" : "btn-primary"}`} disabled={!user || follow.isPending || isFollowed} onClick={() => follow.mutate()} type="button">
            {!user ? <BookmarkPlus size={18} /> : isFollowed ? <BookmarkCheck size={18} /> : <Heart size={18} />}
            {follow.isPending ? "Saving..." : !user ? "Login to follow" : isFollowed ? "In library" : "Follow in library"}
          </button>
          {isFollowed ? (
            <>
              <Link className="btn" to="/library">
                <Library size={18} />
                Open library
              </Link>
              <button className="btn text-[var(--danger)]" disabled={unfollow.isPending} onClick={() => unfollow.mutate()} type="button">
                <Trash2 size={18} />
                {unfollow.isPending ? "Removing..." : "Remove"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
