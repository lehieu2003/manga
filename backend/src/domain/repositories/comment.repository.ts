import type { CommentReactionType, CommentStatus, CommentTargetType, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";

export const commentRepository = {
  findById(id: string) {
    return prisma.comment.findUnique({ where: { id }, include: { author: true } });
  },
  list(input: { targetType: CommentTargetType; targetId: string; parentId?: string; limit: number; cursor?: string }) {
    return prisma.comment.findMany({
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        parentId: input.parentId ?? null
      },
      orderBy: { createdAt: "desc" },
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: { author: { select: { id: true, displayName: true, avatarUrl: true, role: true } } }
    });
  },
  countReplies(parentIds: string[]) {
    return prisma.comment.groupBy({
      by: ["parentId"],
      where: { parentId: { in: parentIds } },
      _count: { _all: true }
    });
  },
  countReactions(commentIds: string[]) {
    return prisma.commentReaction.groupBy({
      by: ["commentId", "type"],
      where: { commentId: { in: commentIds } },
      _count: { _all: true }
    });
  },
  findUserReactions(userId: string, commentIds: string[]) {
    return prisma.commentReaction.findMany({
      where: { userId, commentId: { in: commentIds } },
      select: { commentId: true, type: true }
    });
  },
  async create(input: {
    targetType: CommentTargetType;
    targetId: string;
    authorId: string;
    parent?: { id: string; rootId: string | null; depth: number; path: string; targetType: CommentTargetType; targetId: string; authorId: string };
    content: string;
    isSpoiler: boolean;
  }) {
    const comment = await prisma.comment.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        authorId: input.authorId,
        parentId: input.parent?.id,
        rootId: input.parent ? input.parent.rootId ?? input.parent.id : undefined,
        depth: input.parent ? input.parent.depth + 1 : 0,
        path: "pending",
        content: input.content,
        isSpoiler: input.isSpoiler
      },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true, role: true } } }
    });
    const path = input.parent ? `${input.parent.path}.${comment.id}` : comment.id;
    return prisma.comment.update({
      where: { id: comment.id },
      data: { path },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true, role: true } } }
    });
  },
  update(id: string, data: Prisma.CommentUpdateInput) {
    return prisma.comment.update({
      where: { id },
      data,
      include: { author: { select: { id: true, displayName: true, avatarUrl: true, role: true } } }
    });
  },
  setStatus(id: string, status: CommentStatus, timestampField: "deletedAt" | "hiddenAt") {
    return prisma.comment.update({
      where: { id },
      data: { status, [timestampField]: new Date(), content: "" },
      include: { author: { select: { id: true, displayName: true, avatarUrl: true, role: true } } }
    });
  },
  upsertReaction(commentId: string, userId: string, type: CommentReactionType) {
    return prisma.commentReaction.upsert({
      where: { commentId_userId: { commentId, userId } },
      create: { commentId, userId, type },
      update: { type }
    });
  },
  removeReaction(commentId: string, userId: string) {
    return prisma.commentReaction.deleteMany({ where: { commentId, userId } });
  }
};
