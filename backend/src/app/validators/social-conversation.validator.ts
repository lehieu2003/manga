import { z } from "zod";

export const socialConversationParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const socialConversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional()
});
