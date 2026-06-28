import { Circle } from 'lucide-react';
import type { SocialConversation } from '@/types';
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

  const previewText = typingLabel
    ? `${typingLabel} is typing`
    : (latest?.content ??
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
