import { Circle } from 'lucide-react';
import type { MangaShareAttachment, SocialConversation } from '@/types';
import { getConversationAvatar, getConversationTitle } from '../utils';
import { Avatar } from './Avatar';

interface ConversationButtonProps {
  conversation: SocialConversation;
  currentUserId: string;
  active: boolean;
  typingLabel?: string;
  onSelect: () => void;
}

export function ConversationButton({
  conversation,
  currentUserId,
  active,
  typingLabel,
  onSelect,
}: ConversationButtonProps) {
  const title = getConversationTitle(conversation, currentUserId);
  const latest = conversation.latestMessage;
  const unread = Boolean(
    latest &&
    latest.senderId !== currentUserId &&
    latest.id !== conversation.currentMember?.lastReadMessageId,
  );

  const mangaShare = getMangaShareAttachment(latest?.attachments);
  const previewText = typingLabel
    ? `${typingLabel} is typing`
    : (latest?.content ??
      (mangaShare ? `Shared ${mangaShare.manga.title}` : null) ??
      (latest?.deletedAt ? 'Deleted message' : 'No messages'));

  return (
    <button
      className={`social-conversation-button ${active ? 'social-conversation-active' : ''}`}
      onClick={onSelect}
      type='button'
    >
      <Avatar
        label={title}
        src={getConversationAvatar(conversation, currentUserId)}
      />
      <span className='social-conversation-copy'>
        <span className='social-conversation-title'>
          <strong>{title}</strong>
          {unread ? <Circle size={9} fill='currentColor' /> : null}
        </span>
        <small>{previewText}</small>
      </span>
    </button>
  );
}

function getMangaShareAttachment(
  attachments: unknown,
): MangaShareAttachment | null {
  if (!attachments || typeof attachments !== 'object') return null;
  const candidate = attachments as Partial<MangaShareAttachment>;
  if (candidate.kind !== 'MANGA_SHARE') return null;
  if (!candidate.manga || typeof candidate.manga.title !== 'string') {
    return null;
  }
  return candidate as MangaShareAttachment;
}
