import { CommentReactionType, CommentTargetType } from "@prisma/client";
import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const commentIdParamsSchema = z.object({ id: z.string().min(1) });

export const listCommentsSchema = z.object({
  targetType: z.nativeEnum(CommentTargetType),
  targetId: uuidSchema,
  parentId: z.string().min(1).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const createCommentSchema = z.object({
  targetType: z.nativeEnum(CommentTargetType),
  targetId: uuidSchema,
  parentId: z.string().min(1).optional(),
  content: z.string().trim().min(1).max(2000),
  isSpoiler: z.boolean().default(false)
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
  isSpoiler: z.boolean().optional()
});

export const upsertReactionSchema = z.object({
  type: z.nativeEnum(CommentReactionType)
});
