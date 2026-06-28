-- Social chat is independent from the existing RAG chat persistence.
CREATE TYPE "NotificationSubjectType" AS ENUM ('COMMENT', 'FRIENDSHIP', 'CONVERSATION', 'MESSAGE');
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
CREATE TYPE "SocialConversationType" AS ENUM ('DM', 'GROUP');
CREATE TYPE "SocialMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "SocialMembershipStatus" AS ENUM ('ACTIVE', 'PENDING_INVITE', 'LEFT');
CREATE TYPE "SocialMessageType" AS ENUM ('TEXT', 'MANGA_SHARE', 'IMAGE', 'SYSTEM', 'VOICE_NOTE');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FRIEND_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GROUP_INVITE';

ALTER TABLE "Notification"
  ADD COLUMN "subjectType" "NotificationSubjectType",
  ADD COLUMN "subjectId" TEXT,
  ADD COLUMN "payload" JSONB;

UPDATE "Notification"
SET
  "subjectType" = 'COMMENT',
  "subjectId" = "commentId",
  "payload" = jsonb_build_object('commentId', "commentId", 'targetType', "targetType", 'targetId', "targetId");

ALTER TABLE "Notification"
  ALTER COLUMN "subjectType" SET NOT NULL,
  ALTER COLUMN "subjectId" SET NOT NULL,
  DROP CONSTRAINT "Notification_commentId_fkey",
  DROP COLUMN "commentId",
  DROP COLUMN "targetType",
  DROP COLUMN "targetId";

DROP INDEX IF EXISTS "Notification_commentId_idx";
DROP INDEX IF EXISTS "Notification_targetType_targetId_createdAt_idx";
CREATE INDEX "Notification_subjectType_subjectId_createdAt_idx" ON "Notification"("subjectType", "subjectId", "createdAt");

CREATE TABLE "Friendship" (
  "id" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "blockedById" TEXT,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialConversation" (
  "id" TEXT NOT NULL,
  "type" "SocialConversationType" NOT NULL,
  "title" TEXT,
  "avatarUrl" TEXT,
  "directKey" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SocialConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialConversationMember" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "SocialMemberRole" NOT NULL DEFAULT 'MEMBER',
  "status" "SocialMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastReadMessageId" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "mutedUntil" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SocialConversationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT,
  "clientMessageId" TEXT,
  "type" "SocialMessageType" NOT NULL DEFAULT 'TEXT',
  "content" TEXT,
  "attachments" JSONB,
  "replyToId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SocialMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");
CREATE INDEX "Friendship_userAId_status_updatedAt_idx" ON "Friendship"("userAId", "status", "updatedAt");
CREATE INDEX "Friendship_userBId_status_updatedAt_idx" ON "Friendship"("userBId", "status", "updatedAt");
CREATE INDEX "Friendship_requestedById_status_idx" ON "Friendship"("requestedById", "status");
CREATE INDEX "SocialConversation_type_lastMessageAt_idx" ON "SocialConversation"("type", "lastMessageAt");
CREATE INDEX "SocialConversation_directKey_idx" ON "SocialConversation"("directKey");
CREATE UNIQUE INDEX "SocialConversation_directKey_dm_key" ON "SocialConversation"("directKey") WHERE "type" = 'DM';
CREATE UNIQUE INDEX "SocialConversationMember_conversationId_userId_key" ON "SocialConversationMember"("conversationId", "userId");
CREATE INDEX "SocialConversationMember_userId_status_joinedAt_idx" ON "SocialConversationMember"("userId", "status", "joinedAt");
CREATE INDEX "SocialConversationMember_conversationId_role_status_idx" ON "SocialConversationMember"("conversationId", "role", "status");
CREATE UNIQUE INDEX "SocialMessage_conversationId_senderId_clientMessageId_key" ON "SocialMessage"("conversationId", "senderId", "clientMessageId");
CREATE INDEX "SocialMessage_conversationId_createdAt_id_idx" ON "SocialMessage"("conversationId", "createdAt", "id");
CREATE INDEX "SocialMessage_replyToId_idx" ON "SocialMessage"("replyToId");
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialConversationMember" ADD CONSTRAINT "SocialConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SocialConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialConversationMember" ADD CONSTRAINT "SocialConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialMessage" ADD CONSTRAINT "SocialMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SocialConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialMessage" ADD CONSTRAINT "SocialMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialMessage" ADD CONSTRAINT "SocialMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "SocialMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SocialMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
