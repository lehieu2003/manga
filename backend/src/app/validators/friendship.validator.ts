import { z } from "zod";

export const friendshipParamsSchema = z.object({ id: z.string().trim().min(1) });

export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().trim().min(1)
});

export const socialUserSearchQuerySchema = z.object({
  query: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(12)
});
