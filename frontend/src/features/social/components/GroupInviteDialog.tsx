import { Loader2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Friendship, SocialConversation } from '@/types';
import { Avatar } from './Avatar';

interface GroupInviteDialogProps {
  open: boolean;
  conversation: SocialConversation | null;
  friends: Friendship[];
  busy: boolean;
  onInvite: (userId: string) => void;
  onClose: () => void;
}

export function GroupInviteDialog({
  open,
  conversation,
  friends,
  busy,
  onInvite,
  onClose,
}: GroupInviteDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unavailableIds = useMemo(
    () =>
      new Set(
        conversation?.members
          .filter((member) => member.status !== 'LEFT')
          .map((member) => member.userId) ?? [],
      ),
    [conversation?.members],
  );
  const eligibleFriends = useMemo(
    () => friends.filter((friendship) => !unavailableIds.has(friendship.friend.id)),
    [friends, unavailableIds],
  );
  const selectedFriend = eligibleFriends.find(
    (friendship) => friendship.friend.id === selectedId,
  );

  if (!open || !conversation) return null;

  const submit = () => {
    if (!selectedId || busy) return;
    onInvite(selectedId);
    setSelectedId(null);
  };

  return (
    <div className='social-share-backdrop' role='presentation'>
      <section
        className='social-group-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='Invite group member'
      >
        <header className='social-share-picker-head'>
          <div>
            <h2>Invite member</h2>
            <p>Choose an accepted friend who is not already in this group.</p>
          </div>
          <button
            className='reader-icon-button'
            type='button'
            aria-label='Close invite dialog'
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        <div className='social-group-selected' aria-live='polite'>
          {selectedFriend ? (
            <span>
              <Avatar
                label={selectedFriend.friend.displayName}
                src={selectedFriend.friend.avatarUrl}
                compact
              />
              {selectedFriend.friend.displayName}
            </span>
          ) : (
            <small>No invitee selected</small>
          )}
        </div>

        <div className='social-group-friend-list'>
          {!eligibleFriends.length ? (
            <div className='social-share-empty'>
              <UserPlus size={16} />
              <span>No eligible friends to invite.</span>
            </div>
          ) : null}
          {eligibleFriends.map((friendship) => {
            const checked = selectedId === friendship.friend.id;
            return (
              <button
                className={`social-group-friend ${checked ? 'social-group-friend-selected' : ''}`}
                key={friendship.id}
                type='button'
                onClick={() => setSelectedId(friendship.friend.id)}
                aria-pressed={checked}
                aria-label={`Invite ${friendship.friend.displayName}`}
              >
                <Avatar
                  label={friendship.friend.displayName}
                  src={friendship.friend.avatarUrl}
                  compact
                />
                <span>{friendship.friend.displayName}</span>
                <strong>{checked ? 'Selected' : 'Invite'}</strong>
              </button>
            );
          })}
        </div>

        <footer className='social-group-actions'>
          <button className='btn' type='button' onClick={onClose}>
            Cancel
          </button>
          <button
            className='btn btn-primary'
            type='button'
            disabled={!selectedId || busy}
            onClick={submit}
          >
            {busy ? <Loader2 className='reader-spin' size={16} /> : <UserPlus size={16} />}
            Send invite
          </button>
        </footer>
      </section>
    </div>
  );
}
