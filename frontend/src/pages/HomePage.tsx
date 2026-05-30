import { useQuery } from "@tanstack/react-query";
import { Compass, History, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { MangaCard } from "../components/MangaCard";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";

export function HomePage() {
  const { user } = useAuth();
  const popular = useQuery({ queryKey: ["manga", "popular"], queryFn: () => api.searchManga({ limit: 18 }) });
  const latest = useQuery({ queryKey: ["manga", "latest"], queryFn: () => api.searchManga({ q: "one", limit: 12 }) });

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="surface rounded-lg p-6 md:p-8">
          <div className="mb-8 flex items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Reader-first MangaDex</p>
              <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">Read, track, and continue chapters without losing your place.</h1>
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
        <div className="surface rounded-lg p-5">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Reading system</p>
          <div className="grid gap-3 text-sm text-[var(--muted)]">
            <div className="rounded-md border border-[var(--line)] p-3">VI + EN chapter preference</div>
            <div className="rounded-md border border-[var(--line)] p-3">Bookmarks and reading progress</div>
            <div className="rounded-md border border-[var(--line)] p-3">Backend cache for MangaDex metadata</div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Popular picks</h2>
          <Link className="text-sm text-[var(--accent)]" to="/search">
            View all
          </Link>
        </div>
        {popular.isLoading ? <SkeletonGrid /> : <div className="manga-grid">{popular.data?.data.map((manga) => <MangaCard key={manga.id} manga={manga} />)}</div>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black">Fast search starters</h2>
        {latest.isLoading ? <SkeletonGrid /> : <div className="manga-grid">{latest.data?.data.map((manga) => <MangaCard key={manga.id} manga={manga} />)}</div>}
      </section>
    </div>
  );
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
