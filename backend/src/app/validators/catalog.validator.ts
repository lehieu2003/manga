import { z } from "zod";
import { csv, uuidSchema } from "./common.validator.js";

export const sortSchema = z.enum(["relevance", "latest", "followed", "title", "created", "updated"]).default("relevance");

export const mangaSearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).default(0),
  languages: csv(["vi", "en"]),
  tags: csv(),
  includedTags: csv(),
  excludedTags: csv(),
  contentRating: csv(["safe", "suggestive"]),
  status: csv(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  demographic: csv(),
  author: z.string().trim().max(120).optional(),
  artist: z.string().trim().max(120).optional(),
  sort: sortSchema,
  genre: z.string().trim().optional(),
  genres: csv()
});

export const mangaParamsSchema = z.object({ id: uuidSchema });

export const chaptersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(96),
  offset: z.coerce.number().int().min(0).default(0),
  translatedLanguage: csv(["vi", "en"])
});

export const chapterParamsSchema = z.object({ id: uuidSchema });
