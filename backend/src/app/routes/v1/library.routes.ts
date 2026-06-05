import type { FastifyInstance } from "fastify";
import { cachedCatalogRepository, libraryRepository } from "../../../domain/repositories/index.js";
import { normalizeCoverProxyUrl } from "../../../shared/utils/media-url.js";
import { libraryParamsSchema, upsertLibrarySchema } from "../../validators/library.validator.js";
import { libraryRouteSchemas } from "../../docs/route-schemas.js";

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library", { schema: libraryRouteSchemas.list, preHandler: app.authenticate }, async (request) => {
    const items = await libraryRepository.findByUser(request.user.sub);
    const mangaIds = items.map((item) => item.mangaId);
    const [manga, progress] = await Promise.all([
      cachedCatalogRepository.findMangaByIds(mangaIds),
      cachedCatalogRepository.findLatestProgressByMangaIds(request.user.sub, mangaIds)
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
  });

  app.get("/library/:mangaId", { schema: libraryRouteSchemas.item, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    const item = await libraryRepository.findByUserAndManga(request.user.sub, mangaId);
    return { item };
  });

  app.post("/library/:mangaId", { schema: libraryRouteSchemas.upsert, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    const body = upsertLibrarySchema.parse(request.body ?? {});
    const item = await libraryRepository.upsert({ userId: request.user.sub, mangaId, ...body });

    return { item };
  });

  app.delete("/library/:mangaId", { schema: libraryRouteSchemas.remove, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    await libraryRepository.remove(request.user.sub, mangaId);
    return { ok: true };
  });
}
