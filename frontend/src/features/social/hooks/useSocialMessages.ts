import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { api } from '@/api';
import { useToast } from '@/stores/toast.store';
import type {
  MangaShareAttachment,
  MangaSummary,
  SocialConversation,
  SocialMessage,
  SocialMessageListResponse,
} from '@/types';
import { MESSAGES_PAGE_SIZE } from '../constants';
import { addMessageToPage, replaceMessageInPage } from '../utils';

export type PendingMessage = SocialMessage & {
  pending?: boolean;
  failed?: boolean;
};

export function useSocialMessages(
  currentUser:
    | { id: string; displayName: string; avatarUrl: string | null }
    | null
    | undefined,
  selectedConversation: SocialConversation | null,
) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  // --- Query ---
  const messagesQuery = useQuery({
    queryKey: ['social-messages', selectedConversation?.id],
    queryFn: () =>
      api.listSocialMessages(selectedConversation!.id, {
        limit: MESSAGES_PAGE_SIZE,
      }),
    enabled: Boolean(currentUser && selectedConversation),
  });

  // --- Mutations ---
  const sendMessage = useMutation({
    mutationFn: (input: {
      conversationId: string;
      clientMessageId: string;
      content: string;
    }) =>
      api.sendSocialMessage(input.conversationId, {
        clientMessageId: input.clientMessageId,
        content: input.content,
      }),
    onSuccess: ({ message }, variables) => {
      // onSuccess chạy sau khi REST trả về — pending đã được xóa bởi socket event (nếu đến trước)
      // nếu socket chưa đến thì xóa ở đây
      setPendingMessages((current) =>
        current.filter(
          (item) => item.clientMessageId !== variables.clientMessageId,
        ),
      );
      queryClient.setQueryData<SocialMessageListResponse>(
        ['social-messages', variables.conversationId],
        (current) => addMessageToPage(current, message),
      );
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: (_error, variables) => {
      setPendingMessages((current) =>
        current.map((item) =>
          item.clientMessageId === variables.clientMessageId
            ? { ...item, pending: false, failed: true }
            : item,
        ),
      );
      showToast({ title: 'Message not sent', kind: 'error' });
    },
  });

  const sendMangaShare = useMutation({
    mutationFn: (input: {
      conversationId: string;
      clientMessageId: string;
      mangaId: string;
      chapterId?: string;
    }) =>
      api.sendSocialMessage(input.conversationId, {
        clientMessageId: input.clientMessageId,
        type: 'MANGA_SHARE',
        mangaId: input.mangaId,
        chapterId: input.chapterId,
      }),
    onSuccess: ({ message }, variables) => {
      setPendingMessages((current) =>
        current.filter(
          (item) => item.clientMessageId !== variables.clientMessageId,
        ),
      );
      queryClient.setQueryData<SocialMessageListResponse>(
        ['social-messages', variables.conversationId],
        (current) => addMessageToPage(current, message),
      );
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: (_error, variables) => {
      setPendingMessages((current) =>
        current.map((item) =>
          item.clientMessageId === variables.clientMessageId
            ? { ...item, pending: false, failed: true }
            : item,
        ),
      );
      showToast({ title: 'Manga share not sent', kind: 'error' });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => api.deleteSocialMessage(messageId),
    onSuccess: ({ message }) => {
      queryClient.setQueryData<SocialMessageListResponse>(
        ['social-messages', message.conversationId],
        (current) => replaceMessageInPage(current, message),
      );
      queryClient.invalidateQueries({ queryKey: ['social-conversations'] });
    },
    onError: () =>
      showToast({ title: 'Could not delete message', kind: 'error' }),
  });

  // --- Helpers ---

  /** Xóa pending message theo clientMessageId (gọi từ socket handler) */
  const resolvePending = useCallback((clientMessageId: string) => {
    if (!clientMessageId) return;
    setPendingMessages((current) =>
      current.filter((item) => item.clientMessageId !== clientMessageId),
    );
  }, []);

  /** Thêm optimistic message trước khi gửi lên server */
  const addPendingMessage = useCallback(
    (conversationId: string, clientMessageId: string, content: string) => {
      if (!currentUser) return;
      const now = new Date().toISOString();
      setPendingMessages((current) => [
        ...current,
        {
          id: `pending-${clientMessageId}`,
          conversationId,
          senderId: currentUser.id,
          clientMessageId,
          type: 'TEXT',
          content,
          attachments: null,
          replyToId: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          sender: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
          },
          pending: true,
        },
      ]);
    },
    [currentUser],
  );

  const addPendingMangaShare = useCallback(
    (
      conversationId: string,
      clientMessageId: string,
      manga: MangaSummary,
      chapterId?: string,
    ) => {
      if (!currentUser) return;
      const now = new Date().toISOString();
      const attachment: MangaShareAttachment = {
        kind: 'MANGA_SHARE',
        manga: {
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          status: manga.status,
          year: manga.year,
          contentRating: manga.contentRating,
          tags: manga.tags.slice(0, 6),
        },
        chapter: chapterId
          ? {
              id: chapterId,
              title: '',
              chapter: null,
              translatedLanguage: '',
              pages: 0,
            }
          : null,
      };
      setPendingMessages((current) => [
        ...current,
        {
          id: `pending-${clientMessageId}`,
          conversationId,
          senderId: currentUser.id,
          clientMessageId,
          type: 'MANGA_SHARE',
          content: null,
          attachments: attachment,
          replyToId: null,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
          sender: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
          },
          pending: true,
        },
      ]);
    },
    [currentUser],
  );

  /** Messages đã commit + pending của conversation hiện tại, theo đúng thứ tự hiển thị */
  const visibleMessages = useMemo(() => {
    const committed = [...(messagesQuery.data?.data ?? [])].reverse();
    const pending = pendingMessages.filter(
      (message) => message.conversationId === selectedConversation?.id,
    );
    return [...committed, ...pending];
  }, [messagesQuery.data, pendingMessages, selectedConversation?.id]);

  return {
    messagesQuery,
    visibleMessages,
    sendMessage,
    sendMangaShare,
    deleteMessage,
    addPendingMessage,
    addPendingMangaShare,
    resolvePending,
  };
}
