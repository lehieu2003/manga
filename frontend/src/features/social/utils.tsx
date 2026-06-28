import type {
  SocialConversation,
  SocialMessage,
  SocialMessageListResponse,
} from '@/types';

export function getConversationTitle(
  conversation: SocialConversation,
  currentUserId: string,
): string {
  if (conversation.title) return conversation.title;
  const peer = conversation.members.find(
    (member) => member.userId !== currentUserId,
  );
  return peer?.user.displayName ?? 'Conversation';
}

export function getConversationAvatar(
  conversation: SocialConversation,
  currentUserId: string,
): string | null {
  if (conversation.avatarUrl) return conversation.avatarUrl;
  const peer = conversation.members.find(
    (member) => member.userId !== currentUserId,
  );
  return peer?.user.avatarUrl ?? null;
}

export function addMessageToPage(
  current: SocialMessageListResponse | undefined,
  message: SocialMessage,
): SocialMessageListResponse {
  if (!current) return { data: [message], nextCursor: null };
  // dedup theo cả id lẫn clientMessageId để tránh duplicate khi socket event đến trước onSuccess
  if (
    current.data.some(
      (item) =>
        item.id === message.id ||
        (message.clientMessageId &&
          item.clientMessageId === message.clientMessageId),
    )
  ) {
    return current;
  }
  return { ...current, data: [message, ...current.data] };
}

export function replaceMessageInPage(
  current: SocialMessageListResponse | undefined,
  message: SocialMessage,
): SocialMessageListResponse | undefined {
  if (!current) return current;
  return {
    ...current,
    data: current.data.map((item) => (item.id === message.id ? message : item)),
  };
}
