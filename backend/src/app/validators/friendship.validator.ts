import { z } from "zod";

export const friendshipParamsSchema = z.object({ id: z.string().trim().min(1) });

export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().trim().min(1)
});
