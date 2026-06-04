import { ChevronRight, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChapterSummary, ReadingProgress } from '@/types';

type SortMode = 'newest' | 'oldest';
const DEFAULT_LANGUAGES = ['vi', 'en'];

export function ChapterList({
  chapters,
  mangaId,
  currentProgress,
  chaptersProgress,
  selectedLanguages,
  onSelectedLanguagesChange,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  chapters: ChapterSummary[];
  mangaId: string;
  currentProgress?: ReadingProgress | null;
  chaptersProgress?: ReadingProgress[];
  selectedLanguages: string[];
  onSelectedLanguagesChange: (languages: string[]) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedScanlationGroups, setSelectedScanlationGroups] = useState<
    string[]
  >([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const progressByChapterId = useMemo(
    () =>
      new Map(
        (chaptersProgress ?? []).map((progress) => [
          progress.chapterId,
          progress,
        ]),
      ),
    [chaptersProgress],
  );
  const currentChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === currentProgress?.chapterId),
    [chapters, currentProgress?.chapterId],
  );
  const currentSortValue = chapterSortValue(currentChapter);
  const latestSortValue = Math.max(
    ...chapters.map(chapterSortValue).filter(Number.isFinite),
  );
  const latestChapterNumber =
    chapters.find((chapter) => chapterSortValue(chapter) === latestSortValue)
      ?.chapter ?? null;
  const scanlationGroups = useMemo(
    () =>
      [
        ...new Set(
          chapters
            .map((chapter) => chapter.scanlationGroup)
            .filter((group): group is string => Boolean(group)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [chapters],
  );

  const visibleChapters = useMemo(() => {
    const needle = chapterSearch.trim().toLowerCase();
    return [...chapters]
      .filter((chapter) => {
        if (!needle) return true;
        return [chapter.chapter, chapter.title]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      })
      .filter(
        (chapter) =>
          !selectedScanlationGroups.length ||
          (chapter.scanlationGroup
            ? selectedScanlationGroups.includes(chapter.scanlationGroup)
            : false),
      )
      .sort((a, b) => {
        const byChapter = chapterSortValue(a) - chapterSortValue(b);
        const byDate =
          new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
        const direction = sortMode === 'oldest' ? 1 : -1;
        return (byChapter || byDate || a.id.localeCompare(b.id)) * direction;
      });
  }, [chapters, chapterSearch, selectedScanlationGroups, sortMode]);

  const selectedLanguageKey = [...selectedLanguages].sort().join(',');
  const defaultLanguageKey = [...DEFAULT_LANGUAGES].sort().join(',');
  const hasActiveFilters =
    chapterSearch.trim().length > 0 ||
    selectedScanlationGroups.length > 0 ||
    selectedLanguageKey !== defaultLanguageKey;
  const isSearchingMore = Boolean(
    chapterSearch.trim() && !visibleChapters.length && hasMore,
  );

  useEffect(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      !onLoadMore ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: '360px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    if (
      !chapterSearch.trim() ||
      visibleChapters.length ||
      !hasMore ||
      isLoadingMore ||
      !onLoadMore
    )
      return;
    onLoadMore();
  }, [
    chapterSearch,
    hasMore,
    isLoadingMore,
    onLoadMore,
    visibleChapters.length,
  ]);

  const toggleLanguage = (language: string) => {
    const next = selectedLanguages.includes(language)
      ? selectedLanguages.filter((item) => item !== language)
      : [...selectedLanguages, language];
    onSelectedLanguagesChange(next);
  };

  const toggleScanlationGroup = (group: string) => {
    setSelectedScanlationGroups((value) =>
      value.includes(group)
        ? value.filter((item) => item !== group)
        : [...value, group],
    );
  };

  const clearFilters = () => {
    setChapterSearch('');
    setSelectedScanlationGroups([]);
    onSelectedLanguagesChange(DEFAULT_LANGUAGES);
  };

  return (
    <div className='space-y-3'>
      <div className='surface rounded-lg p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]'>
            <span className='chapter-legend'>✓ Read</span>
            <span className='chapter-legend'>▶ Current</span>
            <span className='chapter-legend'>● New</span>
            <span className='chapter-legend'>
              Showing {visibleChapters.length} / {chapters.length} loaded
            </span>
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <button
              className='btn min-h-10 text-sm'
              onClick={() =>
                setSortMode((value) =>
                  value === 'newest' ? 'oldest' : 'newest',
                )
              }
              type='button'
            >
              {sortMode === 'newest' ? '↓ Newest First' : '↑ Oldest First'}
            </button>
            <label className='control flex min-h-10 items-center gap-2 rounded-lg px-3'>
              <Search size={16} color='var(--accent)' />
              <input
                className='w-full min-w-[13rem] bg-transparent text-sm outline-none'
                value={chapterSearch}
                onChange={(event) => setChapterSearch(event.target.value)}
                placeholder='Search chapter...'
              />
            </label>
            {hasActiveFilters ? (
              <button
                className='btn min-h-10 text-sm'
                onClick={clearFilters}
                type='button'
              >
                <RotateCcw size={16} />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
        <div className='mt-4 grid gap-3 lg:grid-cols-2'>
          <fieldset className='space-y-2'>
            <legend className='text-xs font-bold uppercase text-[var(--muted)]'>
              Languages
            </legend>
            <div className='flex flex-wrap gap-2'>
              {DEFAULT_LANGUAGES.map((language) => (
                <label key={language} className='chapter-filter'>
                  <input
                    type='checkbox'
                    checked={selectedLanguages.includes(language)}
                    onChange={() => toggleLanguage(language)}
                  />
                  <span>{language.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className='space-y-2'>
            <legend className='text-xs font-bold uppercase text-[var(--muted)]'>
              Scanlation
            </legend>
            <div className='flex flex-wrap gap-2'>
              {scanlationGroups.length ? (
                scanlationGroups.map((group) => (
                  <label key={group} className='chapter-filter'>
                    <input
                      type='checkbox'
                      checked={selectedScanlationGroups.includes(group)}
                      onChange={() => toggleScanlationGroup(group)}
                    />
                    <span>{group}</span>
                  </label>
                ))
              ) : (
                <span className='text-sm text-[var(--muted)]'>
                  No groups in loaded chapters.
                </span>
              )}
            </div>
          </fieldset>
        </div>
      </div>

      <div className='overflow-hidden rounded-lg border border-[var(--line)]'>
        {visibleChapters.length ? (
          visibleChapters.map((chapter) => {
            const state = getChapterState(
              chapter,
              progressByChapterId,
              currentProgress,
              currentSortValue,
            );
            const isCurrent = state === 'current';
            const isLatest =
              latestChapterNumber !== null &&
              chapter.chapter === latestChapterNumber;
            return (
              <Link
                key={chapter.id}
                to={`/read/${chapter.id}?mangaId=${mangaId}`}
                className={`chapter-row ${isCurrent ? 'chapter-row-current' : ''}`}
              >
                <span
                  className={`chapter-state chapter-state-${state}`}
                  aria-label={state}
                >
                  {state === 'read' ? '✓' : state === 'current' ? '▶' : '●'}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='flex flex-wrap items-center gap-2'>
                    <span className='chapter-number'>
                      Chapter {chapter.chapter ?? '?'}
                    </span>
                    {isCurrent ? (
                      <span className='chapter-current-badge'>
                        Current Reading
                      </span>
                    ) : null}
                    {isLatest ? (
                      <span className='chapter-new-badge'>NEW</span>
                    ) : null}
                  </span>
                  {chapter.title ? (
                    <span className='mt-1 block truncate text-sm text-[var(--text)]'>
                      {chapter.title}
                    </span>
                  ) : null}
                  <span className='mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]'>
                    <span className='language-badge'>
                      [{chapter.translatedLanguage.toUpperCase()}]
                    </span>
                    <span>{chapter.pages} pages</span>
                    <span>{estimateReadingTime(chapter.pages)}</span>
                    {chapter.scanlationGroup ? (
                      <span>{chapter.scanlationGroup}</span>
                    ) : null}
                  </span>
                </span>
                <ChevronRight
                  className='shrink-0 text-[var(--accent)]'
                  size={18}
                />
              </Link>
            );
          })
        ) : (
          <div className='bg-[rgba(23,17,13,0.78)] p-6 text-center text-[var(--muted)]'>
            {!selectedLanguages.length
              ? 'Select at least one language to load chapters.'
              : isSearchingMore
                ? 'Searching more chapters...'
                : chapters.length
                  ? 'No chapter matches your filters.'
                  : 'No Vietnamese or English chapters were found.'}
          </div>
        )}
      </div>

      {selectedLanguages.length && hasMore ? (
        <div ref={sentinelRef} className='flex justify-center'>
          <button
            className='btn btn-primary'
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type='button'
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getChapterState(
  chapter: ChapterSummary,
  progressByChapterId: Map<string, ReadingProgress>,
  currentProgress?: ReadingProgress | null,
  currentSortValue?: number,
) {
  if (chapter.id === currentProgress?.chapterId) return 'current';
  const explicitProgress = progressByChapterId.get(chapter.id);
  if (explicitProgress?.completed) return 'read';
  if (currentSortValue !== undefined && Number.isFinite(currentSortValue)) {
    const sortValue = chapterSortValue(chapter);
    if (Number.isFinite(sortValue) && sortValue < currentSortValue)
      return 'read';
  }
  return 'new';
}

function chapterSortValue(chapter: ChapterSummary | undefined) {
  if (!chapter) return Number.NaN;
  const parsed = Number.parseFloat(chapter.chapter ?? '');
  if (Number.isFinite(parsed)) return parsed;
  const published = new Date(chapter.publishAt).getTime();
  return Number.isFinite(published) ? published / 1000000000000 : Number.NaN;
}

function estimateReadingTime(pages: number) {
  return `~${Math.max(1, Math.ceil(pages / 6))} mins`;
}
