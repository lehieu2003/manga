import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const mangaProgressParamsSchema = z.object({ mangaId: uuidSchema });
export const chapterProgressParamsSchema = z.object({ chapterId: uuidSchema });

export const saveProgressSchema = z.object({
  mangaId: uuidSchema,
  pageIndex: z.number().int().min(0),
  completed: z.boolean().default(false)
});
