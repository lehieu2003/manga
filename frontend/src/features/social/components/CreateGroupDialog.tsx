import { Loader2, UsersRound, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Friendship } from '@/types';
import { Avatar } from './Avatar';

interface CreateGroupDialogProps {
  open: boolean;
  friends: Friendship[];
  busy: boolean;
  onCreate: (input: { title: string; memberIds: string[] }) => void;
  onClose: () => void;
}

export function CreateGroupDialog({
  open,
  friends,
  busy,
  onCreate,
  onClose,
}: CreateGroupDialogProps) {
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canCreate = title.trim().length > 0 && selectedIds.length >= 2 && !busy;
  const selectedFriends = useMemo(
    () => friends.filter((friendship) => selectedIds.includes(friendship.friend.id)),
    [friends, selectedIds],
  );

  if (!open) return null;

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const submit = () => {
    if (!canCreate) return;
    onCreate({ title: title.trim(), memberIds: selectedIds });
    setTitle('');
    setSelectedIds([]);
  };

  return (
    <div className='social-share-backdrop' role='presentation'>
      <section
        className='social-group-dialog'
        role='dialog'
        aria-modal='true'
        aria-label='Create group chat'
      >
        <header className='social-share-picker-head'>
          <div>
            <h2>Create group</h2>
            <p>Select at least two friends to start a group chat.</p>
          </div>
          <button
            className='reader-icon-button'
            type='button'
            aria-label='Close group creator'
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        <div className='social-group-form'>
          <label>
            <span>Group name</span>
            <input
              className='control'
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder='Manga club'
              aria-label='Group name'
              autoFocus
            />
          </label>
          <div className='social-group-selected' aria-live='polite'>
            {selectedFriends.length ? (
              selectedFriends.map((friendship) => (
                <span key={friendship.id}>
                  <Avatar
                    label={friendship.friend.displayName}
                    src={friendship.friend.avatarUrl}
                    compact
                  />
                  {friendship.friend.displayName}
                </span>
              ))
            ) : (
              <small>No friends selected</small>
            )}
          </div>
        </div>

        <div className='social-group-friend-list'>
          {friends.length < 2 ? (
            <div className='social-share-empty'>
              <UsersRound size={16} />
              <span>You need at least two friends to create a group.</span>
            </div>
          ) : null}
          {friends.map((friendship) => {
            const checked = selectedIds.includes(friendship.friend.id);
            return (
              <button
                className={`social-group-friend ${checked ? 'social-group-friend-selected' : ''}`}
                key={friendship.id}
                type='button'
                onClick={() => toggleFriend(friendship.friend.id)}
                aria-pressed={checked}
                aria-label={`Select ${friendship.friend.displayName}`}
              >
                <Avatar
                  label={friendship.friend.displayName}
                  src={friendship.friend.avatarUrl}
                  compact
                />
                <span>{friendship.friend.displayName}</span>
                <strong>{checked ? 'Selected' : 'Add'}</strong>
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
            disabled={!canCreate}
            onClick={submit}
          >
            {busy ? <Loader2 className='reader-spin' size={16} /> : <UsersRound size={16} />}
            Create group
          </button>
        </footer>
      </section>
    </div>
  );
}
