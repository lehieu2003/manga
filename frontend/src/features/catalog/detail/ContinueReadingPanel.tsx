import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChapterSummary, ReadingProgress } from "@/types";

export function ContinueReadingPanel({
  mangaId,
  title,
  continueChapter,
  progress
}: {
  mangaId: string;
  title: string;
  continueChapter?: ChapterSummary | null;
  progress?: ReadingProgress | null;
}) {
  if (!progress || !continueChapter) return null;

  return (
    <section className="surface rounded-lg p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Continue Reading</p>
          <h2 className="text-2xl font-black">{title}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Chapter {continueChapter.chapter ?? "?"} · Page {progress.pageIndex + 1} / {continueChapter.pages || "?"}
          </p>
        </div>
        <Link className="btn btn-primary" to={`/read/${continueChapter.id}?mangaId=${mangaId}`}>
          <Play size={18} />
          Read next
        </Link>
      </div>
    </section>
  );
}
