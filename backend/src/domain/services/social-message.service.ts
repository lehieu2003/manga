import {
  FriendshipStatus,
  NotificationSubjectType,
  NotificationType,
  Prisma,
  SocialConversationType,
  SocialMembershipStatus,
  SocialMessageType,
} from '@prisma/client';
import {
  emitMessageDeleted,
  emitMessageNew,
  emitReactionUpdated,
  emitReadUpdated,
} from '../../infrastructure/realtime/socket-server.js';
import { prisma } from '../../infrastructure/database/client.js';
import { HttpError } from '../../shared/errors/http-error.js';
import { publishNotification } from './notification-stream.service.js';

type ListMessagesInput = {
  limit: number;
  cursor?: string;
};

type SendMessageInput = {
  clientMessageId: string;
} & (
  | { type: 'TEXT'; content: string }
  | { type: 'MANGA_SHARE'; mangaId: string; chapterId?: string }
);

type MarkReadInput = {
  lastMessageId: string;
};

type MessageCursor = {
  createdAt: string;
  id: string;
};

const messageInclude = {
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  reactions: { select: { userId: true, emoji: true } },
};

export async function listSocialMessages(
  userId: string,
  conversationId: string,
  input: ListMessagesInput,
) {
  await assertActiveConversationMember(userId, conversationId);
  const cursor = input.cursor ? decodeMessageCursor(input.cursor) : undefined;
  const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : undefined;
  const cursorId = cursor?.id;

  const rows = await prisma.socialMessage.findMany({
    where: {
      conversationId,
      ...(cursorCreatedAt
        ? {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              { createdAt: cursorCreatedAt, id: { lt: cursorId } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: input.limit + 1,
    include: messageInclude,
  });

  const page = rows.slice(0, input.limit);
  const next = rows.length > input.limit ? page.at(-1) : undefined;

  return {
    data: page.map((message) => serializeMessage(message, userId)),
    nextCursor: next
      ? encodeMessageCursor({
          createdAt: next.createdAt.toISOString(),
          id: next.id,
        })
      : null,
  };
}

export async function sendSocialMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
) {
  const conversation = await assertActiveConversationMember(
    userId,
    conversationId,
  );
  await assertDmIsNotBlocked(conversation);
  const messageData = await buildMessageData(input);

  const existing = await prisma.socialMessage.findUnique({
    where: {
      conversationId_senderId_clientMessageId: {
        conversationId,
        senderId: userId,
        clientMessageId: input.clientMessageId,
      },
    },
    include: messageInclude,
  });
  if (existing)
    return { message: serializeMessage(existing, userId), idempotent: true };

  const result = await prisma
    .$transaction(async (tx) => {
      const message = await tx.socialMessage.create({
        data: {
          conversationId,
          senderId: userId,
          clientMessageId: input.clientMessageId,
          type: input.type,
          content: messageData.content,
          attachments: messageData.attachments,
        },
        include: messageInclude,
      });

      await tx.socialConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });

      const recipientMembers = conversation.members.filter(
        (member) =>
          member.userId !== userId &&
          member.status === SocialMembershipStatus.ACTIVE,
      );
      const notifications = await Promise.all(
        recipientMembers.map((member) =>
          tx.notification.create({
            data: {
              userId: member.userId,
              actorId: userId,
              type: NotificationType.CHAT_MESSAGE,
              subjectType: NotificationSubjectType.CONVERSATION,
              subjectId: conversationId,
              payload: {
                conversationId,
                messageId: message.id,
                messageType: message.type,
              },
            },
          }),
        ),
      );

      return { message, notifications, created: true };
    })
    .catch(async (error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await prisma.socialMessage.findUnique({
          where: {
            conversationId_senderId_clientMessageId: {
              conversationId,
              senderId: userId,
              clientMessageId: input.clientMessageId,
            },
          },
          include: messageInclude,
        });
        if (duplicate)
          return { message: duplicate, notifications: [], created: false };
      }
      throw error;
    });

  const message = serializeMessage(result.message, userId);
  if (result.created) {
    emitMessageNew(conversationId, message);
    for (const notification of result.notifications) {
      publishNotification(notification);
    }
  }
  return { message, idempotent: !result.created };
}

export async function markSocialConversationRead(
  userId: string,
  conversationId: string,
  input: MarkReadInput,
) {
  const conversation = await assertActiveConversationMember(
    userId,
    conversationId,
  );
  const member = conversation.members.find((row) => row.userId === userId);
  if (!member)
    throw new HttpError(
      404,
      'Conversation not found',
      'SOCIAL_CONVERSATION_NOT_FOUND',
    );

  const targetMessage = await prisma.socialMessage.findFirst({
    where: { id: input.lastMessageId, conversationId },
    select: { id: true, createdAt: true },
  });
  if (!targetMessage)
    throw new HttpError(404, 'Message not found', 'SOCIAL_MESSAGE_NOT_FOUND');

  if (member.lastReadMessageId) {
    if (member.lastReadMessageId === targetMessage.id)
      return serializeReadState(member);

    const currentReadMessage = await prisma.socialMessage.findFirst({
      where: { id: member.lastReadMessageId, conversationId },
      select: { id: true, createdAt: true },
    });

    if (
      currentReadMessage &&
      !isMessageAfter(targetMessage, currentReadMessage)
    )
      return serializeReadState(member);
  }

  const updated = await prisma.socialConversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: {
      lastReadMessageId: targetMessage.id,
      lastReadAt: new Date(),
    },
    select: {
      id: true,
      conversationId: true,
      userId: true,
      lastReadMessageId: true,
      lastReadAt: true,
    },
  });

  const payload = {
    conversationId,
    userId,
    lastReadMessageId: updated.lastReadMessageId ?? targetMessage.id,
    lastReadAt: updated.lastReadAt ?? new Date(),
  };
  emitReadUpdated(payload);

  return serializeReadState(updated);
}

export async function deleteSocialMessage(userId: string, messageId: string) {
  const message = await prisma.socialMessage.findFirst({
    where: {
      id: messageId,
      conversation: {
        members: { some: { userId, status: SocialMembershipStatus.ACTIVE } },
      },
    },
    include: messageInclude,
  });

  if (!message)
    throw new HttpError(404, 'Message not found', 'SOCIAL_MESSAGE_NOT_FOUND');
  if (message.senderId !== userId)
    throw new HttpError(
      403,
      'Only the sender can delete this message',
      'SOCIAL_MESSAGE_DELETE_FORBIDDEN',
    );
  if (message.deletedAt)
    return { message: serializeMessage(message, userId), idempotent: true };

  const deleted = await prisma.socialMessage.update({
    where: { id: message.id },
    data: { deletedAt: new Date() },
    include: messageInclude,
  });

  emitMessageDeleted(deleted.conversationId, deleted.id);
  return { message: serializeMessage(deleted, userId), idempotent: false };
}

export async function addSocialMessageReaction(
  userId: string,
  messageId: string,
  emoji: string,
) {
  const normalizedEmoji = normalizeReactionEmoji(emoji);
  const message = await loadReactableMessage(userId, messageId);

  await prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji: normalizedEmoji,
      },
    },
    update: {},
    create: {
      messageId,
      userId,
      emoji: normalizedEmoji,
    },
  });

  const updated = await prisma.socialMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: messageInclude,
  });
  const serialized = serializeMessage(updated, userId);
  emitReactionUpdated({
    conversationId: message.conversationId,
    messageId,
    reactionCounts: serialized.reactionCounts,
  });
  return { message: serialized };
}

export async function removeSocialMessageReaction(
  userId: string,
  messageId: string,
  emoji: string,
) {
  const normalizedEmoji = normalizeReactionEmoji(emoji);
  const message = await loadReactableMessage(userId, messageId);

  await prisma.messageReaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji: normalizedEmoji,
    },
  });

  const updated = await prisma.socialMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: messageInclude,
  });
  const serialized = serializeMessage(updated, userId);
  emitReactionUpdated({
    conversationId: message.conversationId,
    messageId,
    reactionCounts: serialized.reactionCounts,
  });
  return { message: serialized };
}

async function assertActiveConversationMember(
  userId: string,
  conversationId: string,
) {
  const conversation = await prisma.socialConversation.findFirst({
    where: {
      id: conversationId,
      members: { some: { userId, status: SocialMembershipStatus.ACTIVE } },
    },
    include: {
      members: {
        select: {
          id: true,
          conversationId: true,
          userId: true,
          status: true,
          lastReadMessageId: true,
          lastReadAt: true,
        },
      },
    },
  });

  if (!conversation)
    throw new HttpError(
      404,
      'Conversation not found',
      'SOCIAL_CONVERSATION_NOT_FOUND',
    );
  return conversation;
}

function isMessageAfter(
  candidate: { createdAt: Date; id: string },
  current: { createdAt: Date; id: string },
) {
  const candidateTime = candidate.createdAt.getTime();
  const currentTime = current.createdAt.getTime();
  return (
    candidateTime > currentTime ||
    (candidateTime === currentTime && candidate.id > current.id)
  );
}

function serializeReadState(readState: {
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
}) {
  return {
    readState: {
      conversationId: readState.conversationId,
      userId: readState.userId,
      lastReadMessageId: readState.lastReadMessageId,
      lastReadAt: readState.lastReadAt,
    },
  };
}

async function assertDmIsNotBlocked(
  conversation: Awaited<ReturnType<typeof assertActiveConversationMember>>,
) {
  if (conversation.type !== SocialConversationType.DM) return;

  const [userAId, userBId] = conversation.directKey?.split(':') ?? [];
  if (!userAId || !userBId)
    throw new HttpError(
      409,
      'Direct conversation is missing participant key',
      'SOCIAL_DM_DIRECT_KEY_INVALID',
    );

  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });

  if (friendship?.status === FriendshipStatus.BLOCKED)
    throw new HttpError(
      403,
      'This direct message is blocked',
      'SOCIAL_DM_BLOCKED',
    );
}

async function buildMessageData(input: SendMessageInput) {
  if (input.type === SocialMessageType.TEXT) {
    return { content: input.content, attachments: undefined };
  }

  const manga = await prisma.cachedManga.findUnique({
    where: { id: input.mangaId },
    select: {
      id: true,
      title: true,
      coverUrl: true,
      status: true,
      year: true,
      contentRating: true,
      tags: true,
    },
  });
  if (!manga)
    throw new HttpError(
      404,
      'Manga not found',
      'SOCIAL_MANGA_SHARE_MANGA_NOT_FOUND',
    );

  const chapter = input.chapterId
    ? await prisma.cachedChapter.findFirst({
        where: {
          id: input.chapterId,
          mangaId: input.mangaId,
          pages: { gt: 0 },
        },
        select: {
          id: true,
          title: true,
          chapter: true,
          translatedLanguage: true,
          pages: true,
        },
      })
    : null;
  if (input.chapterId && !chapter)
    throw new HttpError(
      404,
      'Chapter not found',
      'SOCIAL_MANGA_SHARE_CHAPTER_NOT_FOUND',
    );

  return {
    content: null,
    attachments: {
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
      chapter: chapter
        ? {
            id: chapter.id,
            title: chapter.title,
            chapter: chapter.chapter,
            translatedLanguage: chapter.translatedLanguage,
            pages: chapter.pages,
          }
        : null,
    },
  };
}

function serializeMessage<
  TMessage extends {
    id: string;
    conversationId: string;
    senderId: string | null;
    clientMessageId: string | null;
    type: string;
    content: string | null;
    attachments: unknown;
    replyToId: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sender: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    } | null;
    reactions?: Array<{ userId: string; emoji: string }>;
  },
>(message: TMessage, currentUserId: string) {
  const reactionCounts: Record<string, number> = {};
  const currentUserReactions: string[] = [];
  for (const reaction of message.reactions ?? []) {
    reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] ?? 0) + 1;
    if (reaction.userId === currentUserId) currentUserReactions.push(reaction.emoji);
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    clientMessageId: message.clientMessageId,
    type: message.type,
    content: message.deletedAt ? null : message.content,
    attachments: message.deletedAt ? null : message.attachments,
    replyToId: message.replyToId,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: message.sender,
    reactionCounts,
    currentUserReactions,
  };
}

async function loadReactableMessage(userId: string, messageId: string) {
  const message = await prisma.socialMessage.findFirst({
    where: {
      id: messageId,
      deletedAt: null,
      conversation: {
        members: { some: { userId, status: SocialMembershipStatus.ACTIVE } },
      },
    },
    select: { id: true, conversationId: true },
  });

  if (!message)
    throw new HttpError(404, 'Message not found', 'SOCIAL_MESSAGE_NOT_FOUND');
  return message;
}

function normalizeReactionEmoji(emoji: string) {
  const normalized = emoji.trim();
  if (!normalized || normalized.length > 16) {
    throw new HttpError(
      400,
      'Reaction emoji is invalid',
      'SOCIAL_MESSAGE_REACTION_INVALID',
    );
  }
  return normalized;
}

function encodeMessageCursor(cursor: MessageCursor) {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeMessageCursor(cursor: string): MessageCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<MessageCursor>;
    if (!parsed.id || typeof parsed.id !== 'string')
      throw new Error('Invalid cursor');
    if (
      !parsed.createdAt ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(new Date(parsed.createdAt).getTime())
    )
      throw new Error('Invalid cursor');
    return { id: parsed.id, createdAt: parsed.createdAt };
  } catch {
    throw new HttpError(
      400,
      'Invalid message cursor',
      'SOCIAL_MESSAGE_CURSOR_INVALID',
    );
  }
}
