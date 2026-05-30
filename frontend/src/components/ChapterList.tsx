import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChapterSummary } from "../types";

export function ChapterList({ chapters, mangaId }: { chapters: ChapterSummary[]; mangaId: string }) {
  if (!chapters.length) {
    return <div className="surface rounded-lg p-6 text-[var(--muted)]">No Vietnamese or English chapters were found.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)]">
      {chapters.map((chapter) => (
        <Link
          key={chapter.id}
          to={`/read/${chapter.id}?mangaId=${mangaId}`}
          className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[rgba(17,21,26,0.72)] px-4 py-3 last:border-b-0 hover:bg-[var(--surface-strong)]"
        >
          <span>
            <span className="block font-semibold">
              Chapter {chapter.chapter ?? "?"}
              {chapter.title ? ` - ${chapter.title}` : ""}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {chapter.translatedLanguage.toUpperCase()} · {chapter.pages} pages
              {chapter.scanlationGroup ? ` · ${chapter.scanlationGroup}` : ""}
            </span>
          </span>
          <ChevronRight size={18} color="var(--accent)" />
        </Link>
      ))}
    </div>
  );
}
