import { useEffect, useRef } from 'react';
import { ChapterListControls } from '@/features/catalog/chapter-list/ChapterListControls';
import { ChapterRows } from '@/features/catalog/chapter-list/ChapterRows';
import { useChapterListMetadata } from '@/features/catalog/chapter-list/useChapterListMetadata';
import { useChapterListState } from '@/features/catalog/chapter-list/useChapterListState';
import type { ChapterListProps } from '@/features/catalog/chapter-list/chapter-list.types';

export function ChapterList(props: ChapterListProps) {
  const {
    chapters,
    mangaId,
    currentProgress,
    chaptersProgress,
    selectedLanguages,
    onSelectedLanguagesChange,
    onChapterSearchChange,
    hasMore,
    isLoadingMore,
    onLoadMore,
    needsSync,
  } = props;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const state = useChapterListState({
    chapters,
    selectedLanguages,
    onSelectedLanguagesChange,
    onChapterSearchChange,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });
  const metadata = useChapterListMetadata(
    chapters,
    currentProgress,
    chaptersProgress,
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

  return (
    <div className='space-y-3'>
      <ChapterListControls
        chapters={chapters}
        visibleCount={state.visibleChapters.length}
        totalVisibleCount={state.collapse.totalCount}
        selectedLanguages={selectedLanguages}
        scanlationGroups={metadata.scanlationGroups}
        state={state.state}
        hasActiveFilters={state.hasActiveFilters}
        onSearchChange={state.updateSearch}
        onSortToggle={state.toggleSort}
        onLanguageToggle={state.toggleLanguage}
        onScanlationGroupToggle={state.toggleScanlationGroup}
        onClearFilters={state.clearFilters}
      />
      <ChapterRows
        groups={state.groupedChapters}
        mangaId={mangaId}
        metadata={metadata}
        selectedLanguages={selectedLanguages}
        isSearchingMore={state.isSearchingMore}
        needsSync={needsSync}
      />
      {state.collapse.isCollapsible ? (
        <div className='flex flex-col items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)] sm:flex-row sm:justify-center'>
          <span>
            Showing {state.collapse.visibleCount} of {state.collapse.totalCount} chapters
          </span>
          <button className='btn min-h-9 text-sm' onClick={state.collapse.isCollapsed ? state.showAll : state.showFewer} type='button'>
            {state.collapse.isCollapsed ? 'Show all chapters' : 'Show fewer'}
          </button>
        </div>
      ) : null}
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
