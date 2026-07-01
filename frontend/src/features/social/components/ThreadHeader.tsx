import { Bell, BellOff, Loader2, UserPlus, X } from 'lucide-react';
import type { SocialConversation } from '@/types';
import { getConversationAvatar, getConversationTitle } from '../utils';
import { Avatar } from './Avatar';

interface ThreadHeaderProps {
  conversation: SocialConversation;
  currentUserId: string;
  inviteBusy?: boolean;
  muteBusy?: boolean;
  onOpenInvite?: () => void;
  onCancelInvite?: (userId: string) => void;
  onToggleMute?: () => void;
}

export function ThreadHeader({
  conversation,
  currentUserId,
  inviteBusy = false,
  muteBusy = false,
  onOpenInvite,
  onCancelInvite,
  onToggleMute,
}: ThreadHeaderProps) {
  const title = getConversationTitle(conversation, currentUserId);
  const canManageInvites =
    conversation.type === 'GROUP' &&
    conversation.currentMember?.status === 'ACTIVE' &&
    (conversation.currentMember.role === 'OWNER' ||
      conversation.currentMember.role === 'ADMIN');
  const pendingMembers = conversation.members.filter(
    (member) => member.status === 'PENDING_INVITE',
  );
  const muted = conversation.currentMember?.mutedUntil
    ? new Date(conversation.currentMember.mutedUntil).getTime() > Date.now()
    : false;

  return (
    <header className='social-thread-header social-thread-header-rich'>
      <div className='social-thread-title-row'>
        <Avatar
          label={title}
          src={getConversationAvatar(conversation, currentUserId)}
        />
        <div>
          <h2>{title}</h2>
          <p>
            {conversation.type === 'DM'
              ? 'Direct message'
              : `${conversation.members.filter((member) => member.status === 'ACTIVE').length} members`}
          </p>
        </div>
        {canManageInvites && onOpenInvite ? (
          <button
            className='btn reader-icon-button social-thread-action'
            type='button'
            aria-label='Invite member'
            title='Invite member'
            disabled={inviteBusy}
            onClick={onOpenInvite}
          >
            {inviteBusy ? (
              <Loader2 className='reader-spin' size={16} />
            ) : (
              <UserPlus size={16} />
            )}
          </button>
        ) : null}
        {onToggleMute ? (
          <button
            className='btn reader-icon-button social-thread-action'
            type='button'
            aria-label={muted ? 'Unmute conversation' : 'Mute conversation'}
            title={muted ? 'Unmute conversation' : 'Mute conversation'}
            disabled={muteBusy}
            onClick={onToggleMute}
          >
            {muteBusy ? (
              <Loader2 className='reader-spin' size={16} />
            ) : muted ? (
              <BellOff size={16} />
            ) : (
              <Bell size={16} />
            )}
          </button>
        ) : null}
      </div>
      {canManageInvites && pendingMembers.length ? (
        <div className='social-pending-strip' aria-label='Pending invites'>
          {pendingMembers.map((member) => (
            <span key={member.id}>
              {member.user.displayName}
              {onCancelInvite ? (
                <button
                  type='button'
                  aria-label={`Cancel invite for ${member.user.displayName}`}
                  disabled={inviteBusy}
                  onClick={() => onCancelInvite(member.userId)}
                >
                  <X size={12} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
