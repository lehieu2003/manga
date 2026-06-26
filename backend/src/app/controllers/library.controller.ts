import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { domainEvents } from "../../domain/events/index.js";
import { cachedCatalogRepository, libraryRepository } from "../../domain/repositories/index.js";
import { normalizeCoverProxyUrl } from "../../shared/utils/media-url.js";
import { libraryParamsSchema, upsertLibrarySchema } from "../validators/library.validator.js";

type UpsertLibraryInput = z.infer<typeof upsertLibrarySchema>;

export async function handleListLibrary(request: FastifyRequest) {
  return listLibrary(request.user.sub);
}

export async function handleGetLibraryItem(request: FastifyRequest) {
  const { mangaId } = libraryParamsSchema.parse(request.params);
  return getLibraryItem(request.user.sub, mangaId);
}

export async function handleUpsertLibraryItem(request: FastifyRequest) {
  const { mangaId } = libraryParamsSchema.parse(request.params);
  const body = upsertLibrarySchema.parse(request.body ?? {});
  return upsertLibraryItem(request.user.sub, mangaId, body);
}

export async function handleRemoveLibraryItem(request: FastifyRequest) {
  const { mangaId } = libraryParamsSchema.parse(request.params);
  return removeLibraryItem(request.user.sub, mangaId);
}

export async function listLibrary(userId: string) {
  const items = await libraryRepository.findByUser(userId);
  const mangaIds = items.map((item) => item.mangaId);
  const [manga, progress] = await Promise.all([
    cachedCatalogRepository.findMangaByIds(mangaIds),
    cachedCatalogRepository.findLatestProgressByMangaIds(userId, mangaIds)
  ]);
  const mangaById = new Map(manga.map((item) => [item.id, item]));
  const progressByMangaId = new Map(progress.map((item) => [item.mangaId, item]));

  return {
    data: items.map((item) => {
      const cached = mangaById.get(item.mangaId);
      return {
        ...item,
        manga: cached
          ? {
              id: cached.id,
              title: cached.title,
              coverUrl: normalizeCoverProxyUrl(cached.coverUrl),
              status: cached.status,
              year: cached.year,
              tags: cached.tags
            }
          : null,
        readingProgress: progressByMangaId.get(item.mangaId) ?? null
      };
    })
  };
}

export async function getLibraryItem(userId: string, mangaId: string) {
  const item = await libraryRepository.findByUserAndManga(userId, mangaId);
  return { item };
}

export async function upsertLibraryItem(userId: string, mangaId: string, input: UpsertLibraryInput) {
  const item = await libraryRepository.upsert({ userId, mangaId, ...input });
  await domainEvents.publish({
    type: "library.item_upserted",
    userId,
    mangaId,
    status: item.status,
    isFavorite: item.isFavorite
  });

  return { item };
}

export async function removeLibraryItem(userId: string, mangaId: string) {
  const result = await libraryRepository.remove(userId, mangaId);
  await domainEvents.publish({
    type: "library.item_removed",
    userId,
    mangaId,
    removedCount: result.count
  });

  return { ok: true };
}
