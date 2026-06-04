import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const coverParamsSchema = z.object({
  mangaId: uuidSchema,
  fileName: z.string().regex(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)(\.512\.jpg)?$/)
});

export const pageParamsSchema = z.object({
  chapterId: uuidSchema,
  mode: z.enum(["data", "data-saver"]),
  fileName: z.string().regex(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/)
});
