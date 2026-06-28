import { CheckCheck, Trash2 } from 'lucide-react';
import type { PendingMessage } from '../hooks/useSocialMessages';
import { Avatar } from './Avatar';

interface MessageRowProps {
  message: PendingMessage;
  own: boolean;
  onDelete: () => void;
}

export function MessageRow({ message, own, onDelete }: MessageRowProps) {
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
        className={`social-message-bubble ${message.failed ? 'social-message-failed' : ''}`}
      >
        <p>{message.deletedAt ? 'Deleted message' : message.content}</p>
        <span>
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
      </div>
    </article>
  );
}
