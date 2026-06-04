import { useQuery } from "@tanstack/react-query";
import { BookOpen, Compass, History, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { GenreChips } from "@/features/catalog/components/GenreChips";
import { MangaCard } from "@/features/catalog/components/MangaCard";
import { api, assetUrl } from "@/api";
import { useAuth } from "@/features/auth/stores/auth.store";
import type { LibraryItem } from "@/types";

export function HomePage() {
  const { user } = useAuth();
  const popular = useQuery({ queryKey: ["manga", "popular"], queryFn: () => api.searchManga({ limit: 18 }) });
  const latest = useQuery({ queryKey: ["manga", "latest"], queryFn: () => api.searchManga({ q: "one", limit: 12 }) });
  const genres = useQuery({ queryKey: ["genres"], queryFn: api.getGenres });
  const library = useQuery({ queryKey: ["library"], queryFn: api.getLibrary, enabled: Boolean(user) });
  const libraryItems = library.data?.data ?? [];
  const continueItem = getContinueItems(libraryItems)[0];
  const recentlyRead = getContinueItems(libraryItems).slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="surface manga-hero rounded-lg p-6 md:p-8">
          <div className="mb-8 flex items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Manga cafe reader</p>
              <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">A warm shelf for reading, tracking, and continuing every chapter.</h1>
            </div>
            <Sparkles className="hidden shrink-0 text-[var(--accent)] md:block" size={34} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" to="/search">
              <Compass size={18} />
              Explore manga
            </Link>
            <Link className="btn" to={user ? "/library" : "/login"}>
              <History size={18} />
              Continue reading
            </Link>
          </div>
        </div>
        <div className="surface shelf-panel rounded-lg p-5">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Shelf notes</p>
          <div className="grid gap-3 text-sm text-[var(--muted)]">
            <div className="rounded-md border border-[var(--line)] p-3">VI + EN chapter preference</div>
            <div className="rounded-md border border-[var(--line)] p-3">Bookmarks and reading progress</div>
            <div className="rounded-md border border-[var(--line)] p-3">Backend cache for MangaDex metadata</div>
          </div>
        </div>
      </section>

      {user ? (
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="surface rounded-lg p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Continue Reading</p>
            {library.isLoading ? (
              <div className="h-40 animate-pulse rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]" />
            ) : continueItem ? (
              <ContinueCard item={continueItem} />
            ) : (
              <div className="rounded-lg border border-[var(--line)] p-5 text-sm text-[var(--muted)]">
                Your shelf is quiet. Follow a manga and start a chapter to see it here.
                <div className="mt-4">
                  <Link className="btn btn-primary" to="/search">
                    <Compass size={18} />
                    Find manga
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="surface rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Recently Read</p>
                <h2 className="mt-1 text-xl font-black">Back to your shelf</h2>
              </div>
              <Link className="text-sm text-[var(--accent)]" to="/library">
                Open library
              </Link>
            </div>
            {library.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]" />
                ))}
              </div>
            ) : recentlyRead.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentlyRead.map((item) => (
                  <RecentCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--line)] p-5 text-sm text-[var(--muted)]">Read a chapter and your recent shelf will appear here.</div>
            )}
          </div>
        </section>
      ) : null}

      <section className="surface rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">Browse by genre</h2>
          <Link className="text-sm text-[var(--accent)]" to="/search">
            More filters
          </Link>
        </div>
        {genres.isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, index) => (
              <span key={index} className="h-9 w-24 animate-pulse rounded-full border border-[var(--line)] bg-[var(--surface-strong)]" />
            ))}
          </div>
        ) : (
          <GenreChips genres={genres.data?.data ?? []} limit={12} />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Popular picks</h2>
          <Link className="text-sm text-[var(--accent)]" to="/discover/popular">
            View all
          </Link>
        </div>
        {popular.isLoading ? <SkeletonGrid /> : <div className="manga-grid">{popular.data?.data.map((manga) => <MangaCard key={manga.id} manga={manga} />)}</div>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black">Fast search starters</h2>
        <div className="mb-4">
          <Link className="text-sm text-[var(--accent)]" to="/discover/latest">
            Latest updates
          </Link>
        </div>
        {latest.isLoading ? <SkeletonGrid /> : <div className="manga-grid">{latest.data?.data.map((manga) => <MangaCard key={manga.id} manga={manga} />)}</div>}
      </section>
    </div>
  );
}

function ContinueCard({ item }: { item: LibraryItem }) {
  const title = item.manga?.title ?? item.mangaId;
  const progress = item.readingProgress;
  const chapterId = progress?.chapterId ?? item.lastChapterId;

  return (
    <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
      <Link to={`/manga/${item.mangaId}`} className="manga-cover-frame rounded-lg">
        {item.manga?.coverUrl ? <img className="h-full w-full object-cover" src={assetUrl(item.manga.coverUrl)} alt={title} /> : <BookOpen className="m-auto h-full text-[var(--muted)]" />}
      </Link>
      <div className="min-w-0">
        <h2 className="line-clamp-2 text-2xl font-black">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {progress ? `Page ${progress.pageIndex + 1}` : "Ready to continue"} · {formatActivityDate(item)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chapterId ? (
            <Link className="btn btn-primary" to={`/read/${chapterId}?mangaId=${item.mangaId}`}>
              <Play size={18} />
              Continue
            </Link>
          ) : null}
          <Link className="btn" to={`/manga/${item.mangaId}`}>
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecentCard({ item }: { item: LibraryItem }) {
  const title = item.manga?.title ?? item.mangaId;
  const progress = item.readingProgress;
  const chapterId = progress?.chapterId ?? item.lastChapterId;
  const content = (
    <article className="grid grid-cols-[48px_1fr] gap-3 rounded-lg border border-[var(--line)] bg-[rgba(255,184,107,0.035)] p-2.5">
      <div className="manga-cover-frame rounded-md">
        {item.manga?.coverUrl ? <img className="h-full w-full object-cover" src={assetUrl(item.manga.coverUrl)} alt={title} /> : null}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {progress ? `Page ${progress.pageIndex + 1}` : item.status} · {formatActivityDate(item)}
        </p>
      </div>
    </article>
  );

  return chapterId ? <Link to={`/read/${chapterId}?mangaId=${item.mangaId}`}>{content}</Link> : <Link to={`/manga/${item.mangaId}`}>{content}</Link>;
}

function getContinueItems(items: LibraryItem[]) {
  return [...items]
    .filter((item) => item.readingProgress || item.lastReadAt)
    .sort((a, b) => getLibraryActivityTime(b) - getLibraryActivityTime(a));
}

function getLibraryActivityTime(item: LibraryItem) {
  return new Date(item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt ?? item.createdAt).getTime();
}

function formatActivityDate(item: LibraryItem) {
  const time = getLibraryActivityTime(item);
  return Number.isFinite(time) ? new Date(time).toLocaleDateString() : "Not started";
}

function SkeletonGrid() {
  return (
    <div className="manga-grid">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
      ))}
    </div>
  );
}
