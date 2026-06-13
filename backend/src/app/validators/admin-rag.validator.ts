import { RagSourceType } from "@prisma/client";
import { z } from "zod";

export const adminRagDocumentsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  sourceType: z.nativeEnum(RagSourceType).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

export const adminRagReindexBodySchema = z.object({
  limit: z.number().int().min(1).max(5000).optional(),
  chapters: z.boolean().default(false)
});
