import type { FastifyInstance } from "fastify";
import { cached, clearCacheByPrefix, makeCacheKey } from "../../../infrastructure/cache/cache.service.js";
import { getManga, getReader, searchManga } from "../../../infrastructure/mangadex/mangadex.client.js";
import { getCachedChapters, getCachedGenres, getCachedManga, markCachedChapterUnreadable, saveManga, saveMangaBatch, searchCachedManga } from "../../../domain/services/catalog-cache.service.js";
import { searchHistoryRepository } from "../../../domain/repositories/index.js";
import { HttpError } from "../../../shared/errors/http-error.js";
import { chapterParamsSchema, chaptersQuerySchema, mangaParamsSchema, mangaSearchQuerySchema } from "../../validators/catalog.validator.js";
import { catalogRouteSchemas } from "../../docs/route-schemas.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/manga/search", { schema: catalogRouteSchemas.search }, async (request) => {
    const query = mangaSearchQuerySchema.parse(request.query);
    const genres = [...new Set([...(query.genre ? [query.genre] : []), ...query.genres, ...query.includedTags])];
    const cacheFilters = {
      q: query.q,
      limit: query.limit,
      offset: query.offset,
      genres,
      excludedGenres: query.excludedTags,
      status: query.status,
      contentRating: query.contentRating,
      year: query.year,
      sort: query.sort
    };

    if (request.headers.authorization && query.q) {
      try {
        await request.jwtVerify();
        await searchHistoryRepository.create(request.user.sub, query.q);
      } catch {
        app.log.debug("Skipping search history for anonymous or invalid token");
      }
    }

    if (genres.length) {
      const fallback = await searchCachedManga(cacheFilters);
      return { ...fallback, source: "cache" as const };
    }

    return cached(makeCacheKey("manga:search", query), 600, async () => {
      try {
        const result = await searchManga(query);
        await saveMangaBatch(result.data);
        return { ...result, source: "live" as const };
      } catch (error) {
        const fallback = await searchCachedManga(cacheFilters);
        if (fallback.data.length > 0) return { ...fallback, source: "cache" as const };
        throw error;
      }
    });
  });

  app.get("/genres", { schema: catalogRouteSchemas.genres }, async () => {
    return { data: await cached("genres:list", 300, getCachedGenres) };
  });

  app.get("/manga/:id", { schema: catalogRouteSchemas.mangaDetail }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
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

  app.get("/manga/:id/chapters", { schema: catalogRouteSchemas.chapters }, async (request, reply) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = chaptersQuerySchema.parse(request.query);

    const result = await cached(makeCacheKey("manga:chapters", { id, ...query }), 900, () =>
      getCachedChapters({ mangaId: id, limit: query.limit, offset: query.offset, translatedLanguage: query.translatedLanguage })
    );
    if (result.needsSync) {
      reply.code(202);
    }
    return result;
  });

  app.get("/chapters/:id/reader", { schema: catalogRouteSchemas.reader }, async (request) => {
    const { id } = chapterParamsSchema.parse(request.params);
    try {
      return await cached(makeCacheKey("chapter:reader", { id }), 300, () => getReader(id));
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        await markCachedChapterUnreadable(id);
        await clearCacheByPrefix("manga:chapters:");
      }
      throw error;
    }
  });
}
