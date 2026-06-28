import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageCircle, Send, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/features/auth/stores/auth.store';
import { CONVERSATIONS_PAGE_SIZE } from './constants';
import { useSocialMessages } from './hooks/useSocialMessages';
import { useSocialSocket } from './hooks/useSocialSocket';
import { Avatar } from './components/Avatar';
import { ConversationButton } from './components/ConversationButton';
import { MessageRow } from './components/MessageRow';
import { ThreadHeader } from './components/ThreadHeader';
import { EmptyPanel, LoadingRow } from './components/primitives';

export function SocialChatPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState('');

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
    deleteMessage,
    addPendingMessage,
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

  const updateDraft = (value: string) => {
    setDraft(value);
    if (selectedConversation) emitTypingStart(selectedConversation.id);
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
      </aside>

      {/* Thread */}
      <section className='social-thread' aria-label='Message thread'>
        {selectedConversation ? (
          <>
            <ThreadHeader
              conversation={selectedConversation}
              currentUserId={user?.id ?? ''}
            />
            <div className='social-message-list'>
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
            {typingUsers[selectedConversation.id] ? (
              <div className='social-typing-line'>
                {typingUsers[selectedConversation.id]} is typing
              </div>
            ) : null}
            <form
              className='social-composer'
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
            >
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
