import { CallMediaType } from "@prisma/client";
import { z } from "zod";

export const socialCallParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const createSocialCallSchema = z.object({
  mediaType: z.enum([CallMediaType.AUDIO, CallMediaType.VIDEO]).default(CallMediaType.VIDEO)
});

export const socialCallHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional()
});
