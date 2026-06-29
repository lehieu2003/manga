import { BookMarked, Loader2, Search, X } from 'lucide-react';
import { assetUrl } from '@/api';
import type { MangaSummary } from '@/types';

interface MangaSharePickerProps {
  open: boolean;
  query: string;
  results: MangaSummary[];
  loading: boolean;
  onQueryChange: (value: string) => void;
  onPick: (manga: MangaSummary) => void;
  onClose: () => void;
}

export function MangaSharePicker({
  open,
  query,
  results,
  loading,
  onQueryChange,
  onPick,
  onClose,
}: MangaSharePickerProps) {
  if (!open) return null;

  return (
    <div className='social-share-backdrop' role='presentation'>
      <section
        className='social-share-picker'
        aria-label='Share manga'
        role='dialog'
        aria-modal='true'
      >
        <header className='social-share-picker-head'>
          <div>
            <h2>Share manga</h2>
            <p>Find a title to send into this conversation.</p>
          </div>
          <button
            className='reader-icon-button'
            type='button'
            aria-label='Close manga share'
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        <label className='social-share-search'>
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder='Search manga'
            aria-label='Search manga'
            autoFocus
          />
        </label>

        <div className='social-share-results'>
          {loading ? (
            <div className='social-share-empty'>
              <Loader2 className='reader-spin' size={16} />
              <span>Searching manga</span>
            </div>
          ) : null}
          {!loading && !results.length ? (
            <div className='social-share-empty'>No manga found</div>
          ) : null}
          {results.map((manga) => (
            <button
              className='social-share-result'
              key={manga.id}
              type='button'
              onClick={() => onPick(manga)}
              aria-label={`Share ${manga.title}`}
            >
              <span className='social-share-cover'>
                {manga.coverUrl ? (
                  <img src={assetUrl(manga.coverUrl)} alt='' loading='lazy' />
                ) : (
                  <BookMarked size={18} />
                )}
              </span>
              <span className='social-share-copy'>
                <strong>{manga.title}</strong>
                <small>
                  {[manga.status, manga.year, manga.tags[0]]
                    .filter(Boolean)
                    .join(' · ') || 'Manga'}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
