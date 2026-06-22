import { z } from "zod";

export const searchHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(8),
  offset: z.coerce.number().int().min(0).default(0)
});
