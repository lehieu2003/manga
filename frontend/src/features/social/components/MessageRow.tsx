import { BookMarked, CheckCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { assetUrl } from '@/api';
import type { MangaShareAttachment } from '@/types';
import type { PendingMessage } from '../hooks/useSocialMessages';
import { Avatar } from './Avatar';

interface MessageRowProps {
  message: PendingMessage;
  own: boolean;
  onDelete: () => void;
  onToggleReaction: (message: PendingMessage, emoji: string) => void;
}

const quickReactions = ['👍', '❤️', '😂'];

export function MessageRow({ message, own, onDelete, onToggleReaction }: MessageRowProps) {
  const mangaShare = getMangaShareAttachment(message.attachments);
  const reactionCounts = message.reactionCounts ?? {};
  const currentUserReactions = message.currentUserReactions ?? [];
  const timeLabel = message.pending
    ? 'Sending'
    : message.failed
      ? 'Not sent'
      : new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

  return (
    <article
      className={`social-message-row ${own ? 'social-message-own' : ''}`}
    >
      {!own ? (
        <Avatar
          label={message.sender?.displayName ?? 'User'}
          src={message.sender?.avatarUrl ?? undefined}
          compact
        />
      ) : null}
      <div
        className={[
          'social-message-bubble',
          mangaShare ? 'social-message-share-bubble' : '',
          message.failed ? 'social-message-failed' : '',
        ].filter(Boolean).join(' ')}
      >
        {message.deletedAt ? (
          <p>Deleted message</p>
        ) : mangaShare ? (
          <MangaShareCard attachment={mangaShare} />
        ) : (
          <p>{message.content}</p>
        )}
        <span className='social-message-meta'>
          {timeLabel}
          {own && !message.pending && !message.failed && !message.deletedAt ? (
            <button
              className='social-message-delete'
              onClick={onDelete}
              type='button'
              aria-label='Delete message'
            >
              <Trash2 size={13} />
            </button>
          ) : null}
          {own && !message.pending && !message.failed ? (
            <CheckCheck size={13} />
          ) : null}
        </span>
        {!message.pending && !message.failed && !message.deletedAt ? (
          <div className='social-message-reactions' aria-label='Message reactions'>
            {quickReactions.map((emoji) => {
              const count = reactionCounts[emoji] ?? 0;
              const active = currentUserReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  className={active ? 'social-message-reaction-active' : ''}
                  type='button'
                  aria-label={`${active ? 'Remove' : 'Add'} ${emoji} reaction`}
                  onClick={() => onToggleReaction(message, emoji)}
                >
                  <span>{emoji}</span>
                  {count > 0 ? <small>{count}</small> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MangaShareCard({ attachment }: { attachment: MangaShareAttachment }) {
  const manga = attachment.manga;
  const meta = [manga.status, manga.year, manga.tags?.[0]]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link className='social-manga-share-card' to={`/manga/${manga.id}`}>
      <span className='social-manga-share-cover'>
        {manga.coverUrl ? (
          <img src={assetUrl(manga.coverUrl)} alt='' loading='lazy' />
        ) : (
          <BookMarked size={18} />
        )}
      </span>
      <span className='social-manga-share-copy'>
        <small>Manga share</small>
        <strong>{manga.title}</strong>
        {attachment.chapter ? (
          <em>
            Chapter {attachment.chapter.chapter ?? attachment.chapter.title}
          </em>
        ) : null}
        {meta ? <span>{meta}</span> : null}
      </span>
    </Link>
  );
}

function getMangaShareAttachment(
  attachments: unknown,
): MangaShareAttachment | null {
  if (!attachments || typeof attachments !== 'object') return null;
  const candidate = attachments as Partial<MangaShareAttachment>;
  if (candidate.kind !== 'MANGA_SHARE') return null;
  if (!candidate.manga || typeof candidate.manga.id !== 'string') return null;
  if (typeof candidate.manga.title !== 'string') return null;
  return candidate as MangaShareAttachment;
}
