import type { z } from "zod";
import { cached, clearCacheByPrefix, makeCacheKey } from "../../infrastructure/cache/cache.service.js";
import { getManga, getReader, searchManga } from "../../infrastructure/mangadex/mangadex.client.js";
import { searchHistoryRepository } from "../../domain/repositories/index.js";
import { getCachedChapters, getCachedGenres, getCachedManga, markCachedChapterUnreadable, saveManga, saveMangaBatch, searchCachedManga } from "../../domain/services/catalog-cache.service.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { chaptersQuerySchema, mangaSearchQuerySchema } from "../validators/catalog.validator.js";

type ChaptersQuery = z.infer<typeof chaptersQuerySchema>;
type MangaSearchQuery = z.infer<typeof mangaSearchQuerySchema>;

export async function searchCatalogManga(query: MangaSearchQuery, options: { userId?: string; onInvalidAuth?: () => void } = {}) {
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

  if (options.userId && query.q) {
    await searchHistoryRepository.create(options.userId, query.q);
  } else if (options.onInvalidAuth) {
    options.onInvalidAuth();
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
}

export async function listCatalogGenres() {
  return { data: await cached("genres:list", 300, getCachedGenres) };
}

export async function getCatalogManga(id: string) {
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
}

export async function listCatalogChapters(id: string, query: ChaptersQuery) {
  return cached(makeCacheKey("manga:chapters", { id, ...query }), 900, () =>
    getCachedChapters({ mangaId: id, limit: query.limit, offset: query.offset, translatedLanguage: query.translatedLanguage })
  );
}

export async function getChapterReader(id: string) {
  try {
    return await cached(makeCacheKey("chapter:reader", { id }), 300, () => getReader(id));
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 404) {
      await markCachedChapterUnreadable(id);
      await clearCacheByPrefix("manga:chapters:");
    }
    throw error;
  }
}
