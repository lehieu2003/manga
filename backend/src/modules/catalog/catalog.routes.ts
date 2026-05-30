import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cached, makeCacheKey } from "../../lib/cache.js";
import { prisma } from "../../lib/prisma.js";
import { getChapters, getManga, getReader, searchManga } from "../mangadex/mangadex.client.js";
import { getCachedChapters, getCachedManga, saveChapterBatch, saveManga, saveMangaBatch, searchCachedManga } from "./catalog-cache.service.js";

const uuidSchema = z.string().uuid();
const csv = (fallback: string[] = []) =>
  z
    .string()
    .optional()
    .transform((value) => value?.split(",").map((item) => item.trim()).filter(Boolean) ?? fallback);

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/manga/search", async (request) => {
    const query = z
      .object({
        q: z.string().trim().max(120).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(24),
        offset: z.coerce.number().int().min(0).default(0),
        languages: csv(["vi", "en"]),
        tags: csv()
      })
      .parse(request.query);

    if (request.headers.authorization && query.q) {
      try {
        await request.jwtVerify();
        await prisma.searchHistory.create({ data: { userId: request.user.sub, query: query.q } });
      } catch {
        app.log.debug("Skipping search history for anonymous or invalid token");
      }
    }

    return cached(makeCacheKey("manga:search", query), 600, async () => {
      try {
        const result = await searchManga(query);
        await saveMangaBatch(result.data);
        return result;
      } catch (error) {
        const fallback = await searchCachedManga(query);
        if (fallback.data.length > 0) return fallback;
        throw error;
      }
    });
  });

  app.get("/manga/:id", async (request) => {
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    return cached(makeCacheKey("manga:detail", { id }), 3600, async () => {
      try {
        const manga = await getManga(id);
        await saveManga(manga);
        return manga;
      } catch (error) {
        const fallback = await getCachedManga(id);
        if (fallback) return fallback;
        throw error;
      }
    });
  });

  app.get("/manga/:id/chapters", async (request) => {
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(96),
        offset: z.coerce.number().int().min(0).default(0),
        translatedLanguage: csv(["vi", "en"])
      })
      .parse(request.query);

    return cached(makeCacheKey("manga:chapters", { id, ...query }), 900, async () => {
      try {
        const result = await getChapters({ mangaId: id, limit: query.limit, offset: query.offset, translatedLanguage: query.translatedLanguage });
        await saveChapterBatch(id, result.data);
        return result;
      } catch (error) {
        const fallback = await getCachedChapters({ mangaId: id, limit: query.limit, offset: query.offset, translatedLanguage: query.translatedLanguage });
        if (fallback.data.length > 0) return fallback;
        throw error;
      }
    });
  });

  app.get("/chapters/:id/reader", async (request) => {
    const { id } = z.object({ id: uuidSchema }).parse(request.params);
    return cached(makeCacheKey("chapter:reader", { id }), 300, () => getReader(id));
  });
}
