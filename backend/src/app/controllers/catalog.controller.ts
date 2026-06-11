import type { z } from "zod";
import { cached, clearCacheByPrefix, makeCacheKey } from "../../infrastructure/cache/cache.service.js";
import { getManga, getReader, searchManga, searchMangaCreators } from "../../infrastructure/mangadex/mangadex.client.js";
import { searchHistoryRepository } from "../../domain/repositories/index.js";
import { getCachedChapters, getCachedGenres, getCachedManga, markCachedChapterUnreadable, saveManga, saveMangaBatch, searchCachedManga } from "../../domain/services/catalog-cache.service.js";
import { listMangaDexTags, resolveMangaDexTagFilters } from "../../domain/services/mangadex-tag-registry.service.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { chaptersQuerySchema, mangaSearchQuerySchema } from "../validators/catalog.validator.js";

type ChaptersQuery = z.infer<typeof chaptersQuerySchema>;
type MangaSearchQuery = z.infer<typeof mangaSearchQuerySchema>;

export async function searchCatalogManga(query: MangaSearchQuery, options: { userId?: string; onInvalidAuth?: () => void } = {}) {
  const includedTagNames = [...new Set([...(query.genre ? [query.genre] : []), ...query.genres, ...query.includedTags])];
  const cacheFilters = {
    q: query.q,
    limit: query.limit,
    offset: query.offset,
    genres: includedTagNames,
    excludedGenres: query.excludedTags,
    authors: query.author ? [query.author] : undefined,
    artists: query.artist ? [query.artist] : undefined,
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

  const tagFilters = await resolveTagFiltersForSearch({ included: includedTagNames, excluded: query.excludedTags });
  const creatorFilter = await resolveCreatorFilterForSearch(query);
  const canSearchLiveWithTags = tagFilters.unresolvedIncluded.length === 0 && tagFilters.unresolvedExcluded.length === 0;
  if (((includedTagNames.length || query.excludedTags.length) && !canSearchLiveWithTags) || !creatorFilter.canSearchLive) {
    const fallback = await searchCachedManga(cacheFilters);
    return { ...fallback, source: "cache" as const };
  }

  return cached(makeCacheKey("manga:search", query), 600, async () => {
    try {
      const result = await searchManga({
        ...query,
        tags: tagFilters.includedTagIds,
        includedTags: tagFilters.includedTagIds,
        excludedTags: tagFilters.excludedTagIds,
        authorOrArtist: creatorFilter.creatorIds
      });
      if (result.total === 0 && query.q && !query.author && !query.artist) {
        const creatorFallbackIds = await resolveCreatorIds(query.q);
        if (creatorFallbackIds.length) {
          const creatorResult = await searchManga({
            ...query,
            q: undefined,
            tags: tagFilters.includedTagIds,
            includedTags: tagFilters.includedTagIds,
            excludedTags: tagFilters.excludedTagIds,
            authorOrArtist: creatorFallbackIds
          });
          await saveMangaBatch(creatorResult.data);
          return { ...creatorResult, source: "live" as const };
        }
      }
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
  return cached("genres:list", 300, async () => {
    const [cachedGenres, registryTags] = await Promise.all([getCachedGenres(), listMangaDexTags()]);
    const counts = new Map(cachedGenres.map((genre) => [genre.name.toLowerCase(), genre.count]));
    const registryData = registryTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      group: tag.group,
      aliases: tag.aliases,
      count: counts.get(tag.name.toLowerCase()) ?? 0
    }));

    if (registryData.length) return { data: registryData, source: "mangadex" as const };
    return { data: cachedGenres, source: "cache" as const };
  });
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
    getCachedChapters({ mangaId: id, limit: query.limit, offset: query.offset, translatedLanguage: query.translatedLanguage, q: query.q })
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

async function resolveTagFiltersForSearch(input: { included: string[]; excluded: string[] }) {
  if (!input.included.length && !input.excluded.length) {
    return { includedTagIds: [], excludedTagIds: [], unresolvedIncluded: [], unresolvedExcluded: [] };
  }

  try {
    return await resolveMangaDexTagFilters(input);
  } catch {
    return {
      includedTagIds: [],
      excludedTagIds: [],
      unresolvedIncluded: input.included,
      unresolvedExcluded: input.excluded
    };
  }
}

async function resolveCreatorFilterForSearch(query: MangaSearchQuery) {
  const names = [query.author, query.artist].filter((value): value is string => Boolean(value));
  if (!names.length) return { creatorIds: [], canSearchLive: true };

  try {
    const creatorIds = [...new Set((await Promise.all(names.map((name) => resolveCreatorIds(name)))).flat())];
    return { creatorIds, canSearchLive: creatorIds.length > 0 };
  } catch {
    return { creatorIds: [], canSearchLive: false };
  }
}

async function resolveCreatorIds(name: string) {
  const creators = await searchMangaCreators({ q: name, limit: 10 });
  return creators.map((creator) => creator.id);
}
