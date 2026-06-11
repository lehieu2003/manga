import { Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { assetUrl } from "@/api";
import type { LibraryItem } from "@/types";
import { formatLibraryDate } from "../library.logic";

export function LibraryItemCard({
  item,
  onUpdate,
  onRemove
}: {
  item: LibraryItem;
  onUpdate: (mangaId: string, input: Partial<Pick<LibraryItem, "status" | "isFavorite">>) => void;
  onRemove: (mangaId: string) => void;
}) {
  return (
    <article className="surface grid grid-cols-[74px_1fr] gap-4 rounded-lg p-3">
      <Link to={`/manga/${item.mangaId}`} className="manga-cover-frame rounded-md">
        {item.manga?.coverUrl ? <img className="h-full w-full object-cover" src={assetUrl(item.manga.coverUrl)} alt={item.manga.title} /> : null}
      </Link>
      <div className="min-w-0 space-y-3">
        <div>
          <Link to={`/manga/${item.mangaId}`} className="line-clamp-2 font-bold hover:text-[var(--accent)]">
            {item.manga?.title ?? item.mangaId}
          </Link>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span className="manga-status-badge">{item.status}</span>
            {item.isFavorite ? <span className="manga-status-badge">Favorite</span> : null}
            <span>{formatLibraryDate(item)}</span>
          </div>
          {item.readingProgress ? (
            <Link className="mt-2 inline-block text-sm text-[var(--accent)]" to={`/read/${item.readingProgress.chapterId}?mangaId=${item.mangaId}`}>
              Continue chapter · page {item.readingProgress.pageIndex + 1}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn min-h-8 px-2 text-xs" onClick={() => onUpdate(item.mangaId, { isFavorite: !item.isFavorite, status: item.status })} type="button">
            <Heart size={14} fill={item.isFavorite ? "currentColor" : "none"} />
            Favorite
          </button>
          <select className="control min-h-8 rounded-md px-2 text-xs" value={item.status} onChange={(event) => onUpdate(item.mangaId, { status: event.target.value as LibraryItem["status"], isFavorite: item.isFavorite })}>
            <option value="READING">Reading</option>
            <option value="PLAN_TO_READ">Plan</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAUSED">Paused</option>
            <option value="DROPPED">Dropped</option>
          </select>
          <button className="btn min-h-8 px-2 text-xs text-[var(--danger)]" onClick={() => onRemove(item.mangaId)} type="button">
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
