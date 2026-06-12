import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const sendChatMessageSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).max(1200),
  routeContext: z
    .object({
      mangaId: uuidSchema.optional(),
      chapterId: uuidSchema.optional()
    })
    .optional()
});

export const chatConversationParamsSchema = z.object({
  id: z.string().trim().min(1)
});
