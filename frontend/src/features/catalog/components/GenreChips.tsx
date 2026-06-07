import { Link } from "react-router-dom";
import type { GenreSummary } from "@/types";

const EMPTY_SELECTED_GENRES: string[] = [];

export function GenreChips({
  genres,
  selected = EMPTY_SELECTED_GENRES,
  onToggle,
  limit
}: {
  genres: GenreSummary[];
  selected?: string[];
  onToggle?: (genre: string) => void;
  limit?: number;
}) {
  const visibleGenres = limit ? genres.slice(0, limit) : genres;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleGenres.map((genre) => {
        const active = selected.includes(genre.name);
        if (!onToggle) {
          return (
            <Link key={genre.name} aria-label={`${genre.name}, ${genre.count} manga`} className="genre-chip" to={`/genres/${encodeURIComponent(genre.name)}`}>
              {genre.name}
              <span>{genre.count}</span>
            </Link>
          );
        }

        return (
          <button
            key={genre.name}
            aria-pressed={active}
            aria-label={`${genre.name}, ${genre.count} manga`}
            className={`genre-chip ${active ? "genre-chip-active" : ""}`}
            onClick={() => onToggle(genre.name)}
            type="button"
          >
            {genre.name}
            <span>{genre.count}</span>
          </button>
        );
      })}
    </div>
  );
}
