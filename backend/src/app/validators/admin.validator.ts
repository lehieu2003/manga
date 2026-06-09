import { LibraryStatus } from "@prisma/client";
import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const adminPageQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

export const adminUserParamsSchema = z.object({ userId: z.string().min(1) });
export const adminMangaParamsSchema = z.object({ mangaId: uuidSchema });
export const adminChapterParamsSchema = z.object({ chapterId: uuidSchema });
export const adminUserMangaParamsSchema = adminUserParamsSchema.merge(adminMangaParamsSchema);
export const adminUserChapterParamsSchema = adminUserParamsSchema.merge(adminChapterParamsSchema);

export const adminLibraryBodySchema = z.object({
  status: z.nativeEnum(LibraryStatus).optional(),
  isFavorite: z.boolean().optional(),
  lastChapterId: uuidSchema.nullable().optional()
});

export const adminProgressQuerySchema = adminPageQuerySchema.extend({ mangaId: uuidSchema.optional() });

export const adminProgressBodySchema = z.object({
  mangaId: uuidSchema,
  pageIndex: z.number().int().min(0),
  completed: z.boolean().default(false)
});

