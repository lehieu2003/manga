import { FriendshipStatus, SocialConversationType, SocialMemberRole, SocialMembershipStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { HttpError } from "../../shared/errors/http-error.js";

type ConversationCursor = {
  id: string;
};

type ListConversationsInput = {
  limit: number;
  cursor?: string;
};

type CreateGroupConversationInput = {
  title: string;
  memberIds: string[];
};

const conversationInclude = {
  members: {
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } }
    },
    orderBy: { joinedAt: "asc" as const }
  },
  messages: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    include: {
      sender: { select: { id: true, displayName: true, avatarUrl: true } }
    }
  }
};

export async function listSocialConversations(userId: string, input: ListConversationsInput) {
  const cursor = input.cursor ? decodeConversationCursor(input.cursor) : undefined;
  const rows = await prisma.socialConversation.findMany({
    where: {
      members: {
        some: {
          userId,
          status: SocialMembershipStatus.ACTIVE
        }
      }
    },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
    take: input.limit + 1,
    include: conversationInclude
  });

  const page = rows.slice(0, input.limit);
  const next = rows.length > input.limit ? page.at(-1) : undefined;

  return {
    data: page.map((conversation) => serializeConversation(conversation, userId)),
    nextCursor: next ? encodeConversationCursor({ id: next.id }) : null
  };
}

export async function getSocialConversation(userId: string, conversationId: string) {
  const conversation = await prisma.socialConversation.findFirst({
    where: {
      id: conversationId,
      members: {
        some: {
          userId,
          status: SocialMembershipStatus.ACTIVE
        }
      }
    },
    include: conversationInclude
  });

  if (!conversation) throw new HttpError(404, "Conversation not found", "SOCIAL_CONVERSATION_NOT_FOUND");

  return { conversation: serializeConversation(conversation, userId) };
}

export async function createSocialGroupConversation(userId: string, input: CreateGroupConversationInput) {
  const title = input.title.trim();
  const memberIds = [...new Set(input.memberIds.map((id) => id.trim()).filter(Boolean))].filter((id) => id !== userId);

  if (memberIds.length < 2) {
    throw new HttpError(400, "A group conversation requires at least two other members", "SOCIAL_GROUP_MIN_MEMBERS");
  }

  const conversation = await prisma.$transaction(async (tx) => {
    const pairs = memberIds.map((memberId) => canonicalPair(userId, memberId));
    const friendships = await tx.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: pairs.map(([userAId, userBId]) => ({ userAId, userBId }))
      },
      select: { userAId: true, userBId: true }
    });
    const acceptedFriendIds = new Set(friendships.map((row) => (row.userAId === userId ? row.userBId : row.userAId)));
    const missingFriendIds = memberIds.filter((memberId) => !acceptedFriendIds.has(memberId));

    if (missingFriendIds.length) {
      throw new HttpError(403, "Group members must be accepted friends", "SOCIAL_GROUP_MEMBERS_NOT_FRIENDS");
    }

    return tx.socialConversation.create({
      data: {
        type: SocialConversationType.GROUP,
        title,
        directKey: null,
        members: {
          create: [
            { userId, role: SocialMemberRole.OWNER, status: SocialMembershipStatus.ACTIVE },
            ...memberIds.map((memberId) => ({
              userId: memberId,
              role: SocialMemberRole.MEMBER,
              status: SocialMembershipStatus.ACTIVE
            }))
          ]
        }
      },
      include: conversationInclude
    });
  });

  return { conversation: serializeConversation(conversation, userId) };
}

function serializeConversation<TConversation extends Awaited<ReturnType<typeof prisma.socialConversation.findMany>>[number]>(
  conversation: TConversation & {
    members: Array<{
      id: string;
      userId: string;
      role: string;
      status: string;
      lastReadMessageId: string | null;
      lastReadAt: Date | null;
      mutedUntil: Date | null;
      joinedAt: Date;
      user: { id: string; displayName: string; avatarUrl: string | null };
    }>;
    messages: Array<{
      id: string;
      conversationId: string;
      senderId: string | null;
      type: string;
      content: string | null;
      attachments: unknown;
      deletedAt: Date | null;
      createdAt: Date;
      sender: { id: string; displayName: string; avatarUrl: string | null } | null;
    }>;
  },
  userId: string
) {
  const currentMember = conversation.members.find((member) => member.userId === userId);
  const latestMessage = conversation.messages[0] ?? null;

  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    avatarUrl: conversation.avatarUrl,
    directKey: conversation.directKey,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    currentMember: currentMember
      ? {
          id: currentMember.id,
          role: currentMember.role,
          status: currentMember.status,
          lastReadMessageId: currentMember.lastReadMessageId,
          lastReadAt: currentMember.lastReadAt,
          mutedUntil: currentMember.mutedUntil,
          joinedAt: currentMember.joinedAt
        }
      : null,
    members: conversation.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt,
      user: member.user
    })),
    latestMessage: latestMessage
      ? {
          id: latestMessage.id,
          conversationId: latestMessage.conversationId,
          senderId: latestMessage.senderId,
          type: latestMessage.type,
          content: latestMessage.deletedAt ? null : latestMessage.content,
          attachments: latestMessage.deletedAt ? null : latestMessage.attachments,
          deletedAt: latestMessage.deletedAt,
          createdAt: latestMessage.createdAt,
          sender: latestMessage.sender
        }
      : null
  };
}

function encodeConversationCursor(cursor: ConversationCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeConversationCursor(cursor: string): ConversationCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ConversationCursor>;
    if (!parsed.id || typeof parsed.id !== "string") throw new Error("Invalid cursor");
    return { id: parsed.id };
  } catch {
    throw new HttpError(400, "Invalid conversation cursor", "SOCIAL_CONVERSATION_CURSOR_INVALID");
  }
}

function canonicalPair(firstUserId: string, secondUserId: string): [string, string] {
  return firstUserId < secondUserId ? [firstUserId, secondUserId] : [secondUserId, firstUserId];
}
