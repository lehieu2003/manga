import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const bookmarkParamsSchema = z.object({ id: z.string().min(1) });

export const bookmarkListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export const createBookmarkSchema = z.object({
  mangaId: uuidSchema,
  chapterId: uuidSchema,
  pageIndex: z.number().int().min(0).default(0),
  note: z.string().trim().max(500).nullable().optional(),
  isFavorite: z.boolean().default(false)
});

export const updateBookmarkSchema = z
  .object({
    pageIndex: z.number().int().min(0).optional(),
    note: z.string().trim().max(500).nullable().optional(),
    isFavorite: z.boolean().optional()
  })
  .refine((input) => input.pageIndex !== undefined || input.note !== undefined || input.isFavorite !== undefined, {
    message: "At least one bookmark field must be provided"
  });
