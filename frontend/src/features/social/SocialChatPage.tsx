import { useQuery } from '@tanstack/react-query';
import { BookOpen, Loader2, MessageCircle, Send, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/features/auth/stores/auth.store';
import { useToast } from '@/stores/toast.store';
import type { Friendship, MangaSummary } from '@/types';
import { CONVERSATIONS_PAGE_SIZE } from './constants';
import { useFriendships } from './hooks/useFriendships';
import { useSocialMessages } from './hooks/useSocialMessages';
import { useSocialSocket } from './hooks/useSocialSocket';
import { ConversationButton } from './components/ConversationButton';
import { FriendshipPanel } from './components/FriendshipPanel';
import { MangaSharePicker } from './components/MangaSharePicker';
import { MessageRow } from './components/MessageRow';
import { ThreadHeader } from './components/ThreadHeader';
import { EmptyPanel, LoadingRow } from './components/primitives';

export function SocialChatPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
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
  const selectedConversation =
    conversationItems.find((c) => c.id === selectedConversationId) ??
    conversationItems[0] ??
    null;

  const friendships = useFriendships({
    enabled: Boolean(user),
    userSearchQuery: friendSearchQuery,
    onAcceptedConversation: setSelectedConversationId,
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
    addPendingMessage,
    addPendingMangaShare,
    resolvePending,
  } = useSocialMessages(user, selectedConversation);

  const latestMessage = messagesQuery.data?.data[0];

  // resolvePending cần stable reference để useSocialSocket không re-create socket
  const stableResolvePending = useCallback(resolvePending, [resolvePending]);

  // --- Socket ---
  const { typingUsers, emitTypingStart, emitTypingStop } = useSocialSocket({
    currentUserId: user?.id,
    selectedConversation,
    latestMessage,
    onPendingResolved: stableResolvePending,
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
        </div>
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
      </aside>

      {/* Thread */}
      <section className='social-thread' aria-label='Message thread'>
        {selectedConversation ? (
          <>
            <ThreadHeader
              conversation={selectedConversation}
              currentUserId={user?.id ?? ''}
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
                />
              ))}
            </div>
            {selectedTypingLabel ? (
              <div className='social-typing-line'>
                {selectedTypingLabel} is typing
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
    </section>
  );
}
