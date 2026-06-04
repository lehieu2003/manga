import { BookMarked } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { assetUrl } from "@/api";
import type { MangaSummary } from "@/types";

export function MangaCard({ manga }: { manga: MangaSummary }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link to={`/manga/${manga.id}`} className="group block">
      <article className="manga-card">
        <div className="manga-cover-frame">
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
          <p className="manga-status-badge">{manga.status ?? "unknown"}</p>
        </div>
      </article>
    </Link>
  );
}
