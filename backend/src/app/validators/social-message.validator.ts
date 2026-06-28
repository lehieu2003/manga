import { SocialMessageType } from "@prisma/client";
import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const socialMessageListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).optional()
});

export const socialMessageParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const sendSocialMessageSchema = z.object({
  clientMessageId: uuidSchema,
  type: z.literal(SocialMessageType.TEXT).default(SocialMessageType.TEXT),
  content: z.string().trim().min(1).max(4000)
});

export const markSocialConversationReadSchema = z.object({
  lastMessageId: z.string().trim().min(1)
});
