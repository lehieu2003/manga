import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { BookOpen, Check, Loader2, MessageCircle, Send, UsersRound, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/features/auth/stores/auth.store';
import { useToast } from '@/stores/toast.store';
import type { Friendship, MangaSummary, SocialConversationListResponse } from '@/types';
import { CONVERSATIONS_PAGE_SIZE } from './constants';
import { useCall } from './hooks/useCall';
import { useFriendships } from './hooks/useFriendships';
import { useSocialMessages } from './hooks/useSocialMessages';
import { useSocialSocket } from './hooks/useSocialSocket';
import { getConversationTitle } from './utils';
import { CallDock, CallHeaderActions } from './components/CallControls';
import { ConversationButton } from './components/ConversationButton';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { FriendshipPanel } from './components/FriendshipPanel';
import { GroupInviteDialog } from './components/GroupInviteDialog';
import { MangaSharePicker } from './components/MangaSharePicker';
import { MessageRow } from './components/MessageRow';
import { ThreadHeader } from './components/ThreadHeader';
import { EmptyPanel, LoadingRow } from './components/primitives';

export function SocialChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [mangaShareOpen, setMangaShareOpen] = useState(false);
  const [mangaShareQuery, setMangaShareQuery] = useState('');
  const messageListRef = useRef<HTMLDivElement | null>(null);

  // --- Conversations ---
  const conversations = useQuery({
    queryKey: ['social-conversations'],
    queryFn: () =>
      api.listSocialConversations({ limit: CONVERSATIONS_PAGE_SIZE }),
    enabled: Boolean(user),
  });
  const conversationItems = conversations.data?.data ?? [];

  const pendingInvites = useQuery({
    queryKey: ['social-conversation-invites'],
    queryFn: () =>
      api.listSocialConversations({
        limit: CONVERSATIONS_PAGE_SIZE,
        membershipStatus: 'PENDING_INVITE',
      }),
    enabled: Boolean(user),
  });
  const pendingInviteItems = pendingInvites.data?.data ?? [];

  const selectedConversation =
    conversationItems.find((c) => c.id === selectedConversationId) ??
    conversationItems[0] ??
    null;

  const friendships = useFriendships({
    enabled: Boolean(user),
    userSearchQuery: friendSearchQuery,
    onAcceptedConversation: setSelectedConversationId,
  });

  const createGroup = useMutation({
    mutationFn: (input: { title: string; memberIds: string[] }) =>
      api.createSocialGroupConversation(input),
    onSuccess: ({ conversation }) => {
      queryClient.setQueryData<SocialConversationListResponse>(
        ['social-conversations'],
        (current) => ({
          data: [
            conversation,
            ...(current?.data.filter((item) => item.id !== conversation.id) ?? []),
          ],
          nextCursor: current?.nextCursor ?? null,
        }),
      );
      setSelectedConversationId(conversation.id);
      setGroupDialogOpen(false);
    },
    onError: () => {
      showToast({ title: 'Could not create group', kind: 'error' });
    },
  });

  const createGroupInvite = useMutation({
    mutationFn: (input: { conversationId: string; userId: string }) =>
      api.createSocialGroupInvite(input.conversationId, input.userId),
    onSuccess: ({ conversation }) => {
      upsertConversation(queryClient, ['social-conversations'], conversation);
      setInviteDialogOpen(false);
    },
    onError: () => {
      showToast({ title: 'Could not send invite', kind: 'error' });
    },
  });

  const resolveGroupInvite = useMutation({
    mutationFn: (input: {
      conversationId: string;
      userId: string;
      action: 'accept' | 'decline' | 'cancel';
    }) =>
      api.resolveSocialGroupInvite(
        input.conversationId,
        input.userId,
        input.action,
      ),
    onSuccess: ({ conversation }, input) => {
      removeConversation(queryClient, ['social-conversation-invites'], conversation.id);
      if (input.action === 'accept') {
        upsertConversation(queryClient, ['social-conversations'], conversation);
        setSelectedConversationId(conversation.id);
      } else if (input.action === 'cancel') {
        upsertConversation(queryClient, ['social-conversations'], conversation);
      }
    },
    onError: () => {
      showToast({ title: 'Could not update invite', kind: 'error' });
    },
  });

  const muteConversation = useMutation({
    mutationFn: (conversation: SocialConversationListResponse['data'][number]) => {
      const muted = conversation.currentMember?.mutedUntil
        ? new Date(conversation.currentMember.mutedUntil).getTime() > Date.now()
        : false;
      const mutedUntil = muted
        ? null
        : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      return api.muteSocialConversation(conversation.id, mutedUntil);
    },
    onSuccess: ({ conversation }) => {
      upsertConversation(queryClient, ['social-conversations'], conversation);
      showToast({
        title: conversation.currentMember?.mutedUntil
          ? 'Conversation muted'
          : 'Conversation unmuted',
        kind: 'success',
      });
    },
    onError: () => {
      showToast({ title: 'Could not update mute setting', kind: 'error' });
    },
  });

  const mangaShareResults = useQuery({
    queryKey: ['social-manga-share-search', mangaShareQuery],
    queryFn: () =>
      api.searchManga({
        q: mangaShareQuery.trim() || undefined,
        limit: 8,
        sort: mangaShareQuery.trim() ? 'relevance' : 'latest',
      }),
    enabled: Boolean(user && selectedConversation && mangaShareOpen),
  });

  // Auto-select conversation đầu tiên khi load xong
  useEffect(() => {
    if (!selectedConversationId && conversationItems[0]) {
      setSelectedConversationId(conversationItems[0].id);
    }
  }, [conversationItems, selectedConversationId]);

  // --- Messages + mutations ---
  const {
    messagesQuery,
    visibleMessages,
    sendMessage,
    sendMangaShare,
    deleteMessage,
    toggleReaction,
    addPendingMessage,
    addPendingMangaShare,
    resolvePending,
  } = useSocialMessages(user, selectedConversation);

  const latestMessage = messagesQuery.data?.data[0];

  // resolvePending cần stable reference để useSocialSocket không re-create socket
  const stableResolvePending = useCallback(resolvePending, [resolvePending]);

  // --- Socket ---
  const { socketRef, typingUsers, emitTypingStart, emitTypingStop } = useSocialSocket({
    currentUserId: user?.id,
    selectedConversation,
    latestMessage,
    onPendingResolved: stableResolvePending,
  });
  const call = useCall({
    currentUserId: user?.id,
    selectedConversation,
    socketRef,
    onError: (message) =>
      showToast({ title: 'Call failed', description: message, kind: 'error' }),
  });
  const selectedTypingLabel = selectedConversation
    ? typingUsers[selectedConversation.id]
    : undefined;

  const scrollMessagesToEnd = useCallback((behavior: ScrollBehavior = 'auto') => {
    const list = messageListRef.current;
    if (!list) return;
    if (typeof list.scrollTo === 'function') {
      list.scrollTo({ top: list.scrollHeight, behavior });
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollMessagesToEnd();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    selectedConversation?.id,
    visibleMessages.length,
    selectedTypingLabel,
    scrollMessagesToEnd,
  ]);

  // --- Handlers ---
  const submitMessage = () => {
    if (!selectedConversation || !user) return;
    const content = draft.trim();
    if (!content) return;
    const clientMessageId = crypto.randomUUID();
    setDraft('');
    addPendingMessage(selectedConversation.id, clientMessageId, content);
    sendMessage.mutate({
      conversationId: selectedConversation.id,
      clientMessageId,
      content,
    });
    emitTypingStop(selectedConversation.id);
  };

  const shareManga = (manga: MangaSummary) => {
    if (!selectedConversation || !user) return;
    const clientMessageId = crypto.randomUUID();
    addPendingMangaShare(selectedConversation.id, clientMessageId, manga);
    sendMangaShare.mutate({
      conversationId: selectedConversation.id,
      clientMessageId,
      mangaId: manga.id,
    });
    setMangaShareOpen(false);
    emitTypingStop(selectedConversation.id);
  };

  const updateDraft = (value: string) => {
    setDraft(value);
    if (selectedConversation) emitTypingStart(selectedConversation.id);
  };

  const findDirectConversationId = (friendUserId: string) =>
    conversationItems.find(
      (conversation) =>
        conversation.type === 'DM' &&
        conversation.members.some((member) => member.userId === friendUserId),
    )?.id;

  const openFriendConversation = (friendship: Friendship) => {
    const conversationId = findDirectConversationId(friendship.friend.id);
    if (!conversationId) {
      showToast({
        title: 'No direct message yet',
        description: 'Accepting a friend request creates the DM thread.',
        kind: 'error',
      });
      return;
    }
    setSelectedConversationId(conversationId);
  };

  return (
    <section className='social-chat-page'>
      {/* Sidebar */}
      <aside className='social-chat-sidebar' aria-label='Conversations'>
        <div className='social-chat-sidebar-head'>
          <span className='social-chat-mark'>
            <MessageCircle size={18} />
          </span>
          <div>
            <h1>Messages</h1>
            <p>{conversationItems.length} active</p>
          </div>
          <button
            className='btn reader-icon-button social-sidebar-action'
            type='button'
            aria-label='Create group'
            title='Create group'
            disabled={friendships.friends.length < 2 || createGroup.isPending}
            onClick={() => setGroupDialogOpen(true)}
          >
            {createGroup.isPending ? (
              <Loader2 className='reader-spin' size={16} />
            ) : (
              <UsersRound size={16} />
            )}
          </button>
        </div>
        <div className='social-sidebar-body'>
          <div className='social-conversation-list'>
            {conversations.isLoading ? (
              <LoadingRow label='Loading conversations' />
            ) : null}
            {!conversations.isLoading && !conversationItems.length ? (
              <EmptyPanel label='No conversations yet' />
            ) : null}
            {conversationItems.map((conversation) => (
              <ConversationButton
                key={conversation.id}
                conversation={conversation}
                currentUserId={user?.id ?? ''}
                active={conversation.id === selectedConversation?.id}
                typingLabel={typingUsers[conversation.id]}
                onSelect={() => setSelectedConversationId(conversation.id)}
              />
            ))}
          </div>
          {(pendingInvites.isLoading || pendingInviteItems.length > 0) ? (
            <section className='social-invite-panel' aria-label='Group invites'>
              <div className='social-friend-panel-head'>
                <strong>Invites</strong>
                <span>{pendingInviteItems.length} pending</span>
              </div>
              {pendingInvites.isLoading ? (
                <LoadingRow label='Loading invites' />
              ) : null}
              {pendingInviteItems.map((conversation) => (
                <div className='social-invite-card' key={conversation.id}>
                  <span>
                    <strong>
                      {getConversationTitle(conversation, user?.id ?? '')}
                    </strong>
                    <small>
                      {
                        conversation.members.filter(
                          (member) => member.status === 'ACTIVE',
                        ).length
                      } members
                    </small>
                  </span>
                  <div>
                    <button
                      className='reader-icon-button'
                      type='button'
                      aria-label={`Accept invite to ${getConversationTitle(conversation, user?.id ?? '')}`}
                      disabled={resolveGroupInvite.isPending}
                      onClick={() =>
                        resolveGroupInvite.mutate({
                          conversationId: conversation.id,
                          userId: user?.id ?? '',
                          action: 'accept',
                        })
                      }
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className='reader-icon-button'
                      type='button'
                      aria-label={`Decline invite to ${getConversationTitle(conversation, user?.id ?? '')}`}
                      disabled={resolveGroupInvite.isPending}
                      onClick={() =>
                        resolveGroupInvite.mutate({
                          conversationId: conversation.id,
                          userId: user?.id ?? '',
                          action: 'decline',
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}
          <FriendshipPanel
            friends={friendships.friends}
            incomingRequests={friendships.incomingRequests}
            sentRequests={friendships.sentRequests}
            userResults={friendships.userResults}
            userSearchQuery={friendSearchQuery}
            userSearchLoading={friendships.userSearchLoading}
            loading={friendships.loading}
            busy={friendships.busy}
            currentUserId={user?.id ?? ''}
            conversations={conversationItems}
            onUserSearchChange={setFriendSearchQuery}
            onSendRequest={friendships.sendFriendRequest}
            onOpenFriend={openFriendConversation}
            onAccept={friendships.acceptFriendRequest}
            onReject={friendships.rejectFriendRequest}
            onBlock={friendships.blockFriend}
            onUnfriend={friendships.unfriend}
          />
        </div>
      </aside>

      {/* Thread */}
      <section className='social-thread' aria-label='Message thread'>
        {selectedConversation ? (
          <>
            <ThreadHeader
              conversation={selectedConversation}
              currentUserId={user?.id ?? ''}
              inviteBusy={
                createGroupInvite.isPending || resolveGroupInvite.isPending
              }
              muteBusy={muteConversation.isPending}
              onOpenInvite={() => setInviteDialogOpen(true)}
              onToggleMute={() => muteConversation.mutate(selectedConversation)}
              onCancelInvite={(userId) =>
                resolveGroupInvite.mutate({
                  conversationId: selectedConversation.id,
                  userId,
                  action: 'cancel',
                })
              }
              callActions={
                <CallHeaderActions
                  disabled={call.state !== 'idle' && call.state !== 'ended'}
                  onStartCall={(mediaType) => {
                    void call.startCall(mediaType);
                  }}
                />
              }
            />
            <CallDock
              state={call.state}
              call={call.call}
              incomingCall={call.incomingCall}
              audioEnabled={call.audioEnabled}
              videoEnabled={call.videoEnabled}
              remoteMediaState={call.remoteMediaState}
              localVideoRef={call.localVideoRef}
              remoteVideoRef={call.remoteVideoRef}
              onStartCall={(mediaType) => {
                void call.startCall(mediaType);
              }}
              onAccept={() => {
                void call.acceptIncomingCall();
              }}
              onDecline={() => {
                void call.declineIncomingCall();
              }}
              onHangUp={() => {
                void call.hangUp();
              }}
              onToggleAudio={call.toggleAudio}
              onToggleVideo={call.toggleVideo}
            />
            <div className='social-message-list' ref={messageListRef}>
              {messagesQuery.isLoading ? (
                <LoadingRow label='Loading messages' />
              ) : null}
              {!messagesQuery.isLoading && !visibleMessages.length ? (
                <EmptyPanel label='No messages' />
              ) : null}
              {visibleMessages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  own={message.senderId === user?.id}
                  onDelete={() => deleteMessage.mutate(message.id)}
                  onToggleReaction={(message, emoji) =>
                    toggleReaction.mutate({ message, emoji })
                  }
                />
              ))}
            </div>
            {selectedTypingLabel ? (
              <div className='social-typing-line'>
                {formatTypingStatus(selectedTypingLabel)}
              </div>
            ) : null}
            <form
              className='social-composer'
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
            >
              <button
                className='btn reader-icon-button'
                type='button'
                disabled={sendMangaShare.isPending}
                aria-label='Share manga'
                onClick={() => setMangaShareOpen(true)}
              >
                {sendMangaShare.isPending ? (
                  <Loader2 className='reader-spin' size={17} />
                ) : (
                  <BookOpen size={17} />
                )}
              </button>
              <input
                className='control'
                value={draft}
                onChange={(event) => updateDraft(event.target.value)}
                maxLength={4000}
                placeholder='Message'
                aria-label='Message'
              />
              <button
                className='btn btn-primary reader-icon-button'
                type='submit'
                disabled={!draft.trim() || sendMessage.isPending}
                aria-label='Send message'
              >
                {sendMessage.isPending ? (
                  <Loader2 className='reader-spin' size={17} />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </form>
            <MangaSharePicker
              open={mangaShareOpen}
              query={mangaShareQuery}
              results={mangaShareResults.data?.data ?? []}
              loading={mangaShareResults.isFetching}
              onQueryChange={setMangaShareQuery}
              onPick={shareManga}
              onClose={() => setMangaShareOpen(false)}
            />
          </>
        ) : (
          <div className='social-thread-empty'>
            <UsersRound size={24} />
            <span>No active chat</span>
          </div>
        )}
      </section>
      <CreateGroupDialog
        open={groupDialogOpen}
        friends={friendships.friends}
        busy={createGroup.isPending}
        onCreate={(input) => createGroup.mutate(input)}
        onClose={() => setGroupDialogOpen(false)}
      />
      <GroupInviteDialog
        open={inviteDialogOpen}
        conversation={selectedConversation}
        friends={friendships.friends}
        busy={createGroupInvite.isPending}
        onInvite={(userId) => {
          if (!selectedConversation) return;
          createGroupInvite.mutate({ conversationId: selectedConversation.id, userId });
        }}
        onClose={() => setInviteDialogOpen(false)}
      />
    </section>
  );
}

function formatTypingStatus(label: string) {
  const verb = label.includes(' and ') || label.includes(' others') ? 'are' : 'is';
  return `${label} ${verb} typing`;
}

function upsertConversation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  conversation: SocialConversationListResponse['data'][number],
) {
  queryClient.setQueryData<SocialConversationListResponse>(
    queryKey,
    (current) => ({
      data: [
        conversation,
        ...(current?.data.filter((item) => item.id !== conversation.id) ?? []),
      ],
      nextCursor: current?.nextCursor ?? null,
    }),
  );
}

function removeConversation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  conversationId: string,
) {
  queryClient.setQueryData<SocialConversationListResponse>(
    queryKey,
    (current) => ({
      data: current?.data.filter((item) => item.id !== conversationId) ?? [],
      nextCursor: current?.nextCursor ?? null,
    }),
  );
}
