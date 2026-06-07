import { RotateCcw, Search } from "lucide-react";
import { DEFAULT_LANGUAGES } from "./chapter-list.constants";
import type { ChapterListState } from "./chapter-list.types";
import type { ChapterSummary } from "@/types";

export function ChapterListControls({
  chapters,
  visibleCount,
  selectedLanguages,
  scanlationGroups,
  state,
  hasActiveFilters,
  onSearchChange,
  onSortToggle,
  onLanguageToggle,
  onScanlationGroupToggle,
  onClearFilters
}: {
  chapters: ChapterSummary[];
  visibleCount: number;
  selectedLanguages: string[];
  scanlationGroups: string[];
  state: ChapterListState;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSortToggle: () => void;
  onLanguageToggle: (language: string) => void;
  onScanlationGroupToggle: (group: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="surface rounded-lg p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]">
          <span className="chapter-legend">✓ Read</span>
          <span className="chapter-legend">▶ Current</span>
          <span className="chapter-legend">● New</span>
          <span className="chapter-legend">
            Showing {visibleCount} / {chapters.length} loaded
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button className="btn min-h-10 text-sm" onClick={onSortToggle} type="button">
            {state.sortMode === "newest" ? "↓ Newest First" : "↑ Oldest First"}
          </button>
          <label className="control flex min-h-10 items-center gap-2 rounded-lg px-3">
            <Search size={16} color="var(--accent)" />
            <input className="w-full min-w-[13rem] bg-transparent text-sm outline-none" value={state.chapterSearch} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search chapter..." />
          </label>
          {hasActiveFilters ? (
            <button className="btn min-h-10 text-sm" onClick={onClearFilters} type="button">
              <RotateCcw size={16} />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
      <ChapterFilterFields
        selectedLanguages={selectedLanguages}
        scanlationGroups={scanlationGroups}
        selectedScanlationGroups={state.selectedScanlationGroups}
        onLanguageToggle={onLanguageToggle}
        onScanlationGroupToggle={onScanlationGroupToggle}
      />
    </div>
  );
}

function ChapterFilterFields({
  selectedLanguages,
  scanlationGroups,
  selectedScanlationGroups,
  onLanguageToggle,
  onScanlationGroupToggle
}: {
  selectedLanguages: string[];
  scanlationGroups: string[];
  selectedScanlationGroups: string[];
  onLanguageToggle: (language: string) => void;
  onScanlationGroupToggle: (group: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase text-[var(--muted)]">Languages</legend>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_LANGUAGES.map((language) => (
            <label key={language} className="chapter-filter">
              <input type="checkbox" checked={selectedLanguages.includes(language)} onChange={() => onLanguageToggle(language)} />
              <span>{language.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase text-[var(--muted)]">Scanlation</legend>
        <div className="flex flex-wrap gap-2">
          {scanlationGroups.length ? (
            scanlationGroups.map((group) => (
              <label key={group} className="chapter-filter">
                <input type="checkbox" checked={selectedScanlationGroups.includes(group)} onChange={() => onScanlationGroupToggle(group)} />
                <span>{group}</span>
              </label>
            ))
          ) : (
            <span className="text-sm text-[var(--muted)]">No groups in loaded chapters.</span>
          )}
        </div>
      </fieldset>
    </div>
  );
}
