import { LibraryStatus } from "@prisma/client";
import { z } from "zod";
import { uuidSchema } from "./common.validator.js";

export const libraryParamsSchema = z.object({ mangaId: uuidSchema });

export const upsertLibrarySchema = z.object({
  status: z.nativeEnum(LibraryStatus).default("READING"),
  isFavorite: z.boolean().default(false),
  lastChapterId: uuidSchema.optional()
});
