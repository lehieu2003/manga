import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChapterSummary } from "@/types";
import { estimateReadingTime, getChapterState } from "./chapter-list.logic";
import type { ChapterListMetadata, ChapterVolumeGroup } from "./chapter-list.types";

export function ChapterRows({
  groups,
  mangaId,
  metadata,
  selectedLanguages,
  isSearchingMore,
  needsSync
}: {
  groups: ChapterVolumeGroup[];
  mangaId: string;
  metadata: ChapterListMetadata;
  selectedLanguages: string[];
  isSearchingMore: boolean;
  needsSync?: boolean;
}) {
  const chapterCount = groups.reduce((count, group) => count + group.chapters.length, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)]">
      {chapterCount ? (
        groups.map((group) => <ChapterVolumeSection key={group.id} group={group} mangaId={mangaId} metadata={metadata} />)
      ) : (
        <div className="bg-[var(--surface)] p-6 text-center text-[var(--muted)]">
          {!selectedLanguages.length
            ? "Select at least one language to load chapters."
            : needsSync
              ? "Chapter data is not synced yet."
              : isSearchingMore
                ? "Searching more chapters..."
                : "No chapter matches your filters."}
        </div>
      )}
    </div>
  );
}

function ChapterVolumeSection({ group, mangaId, metadata }: { group: ChapterVolumeGroup; mangaId: string; metadata: ChapterListMetadata }) {
  return (
    <section>
      <div className="border-b border-[var(--line)] bg-[var(--card)] px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]">
        {group.title}
      </div>
      {group.chapters.map((chapter) => (
        <ChapterRow key={chapter.id} chapter={chapter} mangaId={mangaId} metadata={metadata} />
      ))}
    </section>
  );
}

function ChapterRow({ chapter, mangaId, metadata }: { chapter: ChapterSummary; mangaId: string; metadata: ChapterListMetadata }) {
  const state = getChapterState(chapter, metadata.progressByChapterId, metadata.currentProgress, metadata.currentSortValue);
  const isCurrent = state === "current";
  const isLatest = metadata.latestChapterNumber !== null && chapter.chapter === metadata.latestChapterNumber;
  return (
    <Link key={chapter.id} to={`/read/${chapter.id}?mangaId=${mangaId}`} className={`chapter-row ${isCurrent ? "chapter-row-current" : ""}`}>
      <span className={`chapter-state chapter-state-${state}`} aria-label={state}>
        {state === "read" ? "✓" : state === "current" ? "▶" : "●"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="chapter-number">Chapter {chapter.chapter ?? "?"}</span>
          {isCurrent ? <span className="chapter-current-badge">Current Reading</span> : null}
          {isLatest ? <span className="chapter-new-badge">NEW</span> : null}
        </span>
        {chapter.title ? <span className="mt-1 block truncate text-sm text-[var(--text)]">{chapter.title}</span> : null}
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className="language-badge">[{chapter.translatedLanguage.toUpperCase()}]</span>
          <span>{chapter.pages} pages</span>
          <span>{estimateReadingTime(chapter.pages)}</span>
          {chapter.scanlationGroup ? <span>{chapter.scanlationGroup}</span> : null}
        </span>
      </span>
      <ChevronRight className="shrink-0 text-[var(--accent)]" size={18} />
    </Link>
  );
}
