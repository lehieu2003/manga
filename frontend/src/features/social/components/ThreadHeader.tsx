import type { SocialConversation } from '@/types';
import { getConversationAvatar, getConversationTitle } from '../utils';
import { Avatar } from './Avatar';

interface ThreadHeaderProps {
  conversation: SocialConversation;
  currentUserId: string;
}

export function ThreadHeader({
  conversation,
  currentUserId,
}: ThreadHeaderProps) {
  const title = getConversationTitle(conversation, currentUserId);
  return (
    <header className='social-thread-header'>
      <Avatar
        label={title}
        src={getConversationAvatar(conversation, currentUserId)}
      />
      <div>
        <h2>{title}</h2>
        <p>
          {conversation.type === 'DM'
            ? 'Direct message'
            : `${conversation.members.length} members`}
        </p>
      </div>
    </header>
  );
}
