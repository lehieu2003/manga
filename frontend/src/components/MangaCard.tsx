import { BookMarked } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "../lib/api";
import type { MangaSummary } from "../types";

export function MangaCard({ manga }: { manga: MangaSummary }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link to={`/manga/${manga.id}`} className="group block">
      <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] transition duration-200 group-hover:-translate-y-1 group-hover:border-[var(--accent)]">
        <div className="aspect-[2/3] bg-[#101418]">
          {manga.coverUrl && !imageFailed ? (
            <img className="h-full w-full object-cover" src={assetUrl(manga.coverUrl)} alt={manga.title} loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <div className="grid h-full place-items-center text-[var(--muted)]">
              <BookMarked />
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{manga.title}</h3>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{manga.status ?? "unknown"}</p>
        </div>
      </article>
    </Link>
  );
}
