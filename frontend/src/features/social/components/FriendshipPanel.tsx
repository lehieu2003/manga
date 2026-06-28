import {
  Ban,
  Check,
  MessageCircle,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Friendship, SocialConversation } from '@/types';
import { Avatar } from './Avatar';
import { LoadingRow } from './primitives';

type FriendshipPanelProps = {
  friends: Friendship[];
  incomingRequests: Friendship[];
  sentRequests: Friendship[];
  loading: boolean;
  busy: boolean;
  currentUserId: string;
  conversations: SocialConversation[];
  onSendRequest: (targetUserId: string) => void;
  onOpenFriend: (friendship: Friendship) => void;
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  onBlock: (friendshipId: string) => void;
  onUnfriend: (friendshipId: string) => void;
};

export function FriendshipPanel({
  friends,
  incomingRequests,
  sentRequests,
  loading,
  busy,
  currentUserId,
  conversations,
  onSendRequest,
  onOpenFriend,
  onAccept,
  onReject,
  onBlock,
  onUnfriend,
}: FriendshipPanelProps) {
  const [addresseeId, setAddresseeId] = useState('');

  const submitRequest = () => {
    const targetUserId = addresseeId.trim();
    if (!targetUserId) return;
    onSendRequest(targetUserId);
    setAddresseeId('');
  };

  return (
    <section className='social-friend-panel' aria-label='Friends'>
      <div className='social-friend-panel-head'>
        <strong>Friends</strong>
        <span>{friends.length} active</span>
      </div>
      <form
        className='social-friend-request-form'
        onSubmit={(event) => {
          event.preventDefault();
          submitRequest();
        }}
      >
        <input
          className='control'
          value={addresseeId}
          onChange={(event) => setAddresseeId(event.target.value)}
          placeholder='User ID'
          aria-label='Friend user ID'
        />
        <button
          className='btn reader-icon-button'
          type='submit'
          disabled={!addresseeId.trim() || busy}
          aria-label='Send friend request'
        >
          <UserPlus size={16} />
        </button>
      </form>

      {loading ? <LoadingRow label='Loading friends' /> : null}

      <FriendshipSection title='Incoming' empty='No incoming requests'>
        {incomingRequests.map((friendship) => (
          <FriendshipRow
            key={friendship.id}
            friendship={friendship}
            actionLabel='Friend request'
            disabled={busy}
            actions={[
              {
                label: 'Accept request',
                icon: <Check size={14} />,
                onClick: () => onAccept(friendship.id),
              },
              {
                label: 'Reject request',
                icon: <X size={14} />,
                onClick: () => onReject(friendship.id),
              },
            ]}
          />
        ))}
      </FriendshipSection>

      <FriendshipSection title='Friends' empty='No friends yet'>
        {friends.map((friendship) => {
          const hasConversation = conversations.some(
            (conversation) =>
              conversation.type === 'DM' &&
              conversation.members.some(
                (member) => member.userId === friendship.friend.id,
              ),
          );
          return (
            <FriendshipRow
              key={friendship.id}
              friendship={friendship}
              actionLabel={
                hasConversation ? 'Direct message ready' : 'No DM thread'
              }
              disabled={busy}
              onMainAction={() => onOpenFriend(friendship)}
              actions={[
                {
                  label: 'Open direct message',
                  icon: <MessageCircle size={14} />,
                  onClick: () => onOpenFriend(friendship),
                },
                {
                  label: 'Block friend',
                  icon: <Ban size={14} />,
                  onClick: () => onBlock(friendship.id),
                },
                {
                  label: 'Remove friend',
                  icon: <UserMinus size={14} />,
                  onClick: () => onUnfriend(friendship.id),
                },
              ]}
            />
          );
        })}
      </FriendshipSection>

      <FriendshipSection title='Sent' empty='No sent requests'>
        {sentRequests.map((friendship) => (
          <FriendshipRow
            key={friendship.id}
            friendship={friendship}
            actionLabel={
              friendship.requestedById === currentUserId ? 'Pending' : 'Incoming'
            }
            disabled={busy}
            actions={[]}
          />
        ))}
      </FriendshipSection>
    </section>
  );
}

function FriendshipSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;
  return (
    <div className='social-friend-section'>
      <h2>{title}</h2>
      {isEmpty ? (
        <p>{empty}</p>
      ) : (
        <div className='social-friend-list'>{children}</div>
      )}
    </div>
  );
}

function FriendshipRow({
  friendship,
  actionLabel,
  disabled,
  actions,
  onMainAction,
}: {
  friendship: Friendship;
  actionLabel: string;
  disabled: boolean;
  actions: Array<{ label: string; icon: ReactNode; onClick: () => void }>;
  onMainAction?: () => void;
}) {
  const content = (
    <>
      <Avatar
        label={friendship.friend.displayName}
        src={friendship.friend.avatarUrl}
        compact
      />
      <span className='social-friend-copy'>
        <strong>{friendship.friend.displayName}</strong>
        <small>{actionLabel}</small>
      </span>
    </>
  );

  return (
    <div className='social-friend-row'>
      {onMainAction ? (
        <button
          className='social-friend-main'
          type='button'
          onClick={onMainAction}
          disabled={disabled}
        >
          {content}
        </button>
      ) : (
        <span className='social-friend-main'>{content}</span>
      )}
      {actions.length ? (
        <span className='social-friend-actions'>
          {actions.map((action) => (
            <button
              key={action.label}
              type='button'
              aria-label={action.label}
              title={action.label}
              disabled={disabled}
              onClick={action.onClick}
            >
              {action.icon}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
}
