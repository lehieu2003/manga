import type { FastifyInstance } from "fastify";
import { getCatalogManga, getChapterReader, listCatalogChapters, listCatalogGenres, searchCatalogManga } from "../../controllers/catalog.controller.js";
import { chapterParamsSchema, chaptersQuerySchema, mangaParamsSchema, mangaSearchQuerySchema } from "../../validators/catalog.validator.js";
import { catalogRouteSchemas } from "../../docs/route-schemas.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/manga/search", { schema: catalogRouteSchemas.search }, async (request) => {
    const query = mangaSearchQuerySchema.parse(request.query);
    let userId: string | undefined;
    if (request.headers.authorization) {
      try {
        await request.jwtVerify();
        userId = request.user.sub;
      } catch {
        return searchCatalogManga(query, {
          onInvalidAuth: () => app.log.debug("Skipping search history for anonymous or invalid token")
        });
      }
    }

    return searchCatalogManga(query, { userId });
  });

  app.get("/genres", { schema: catalogRouteSchemas.genres }, async () => {
    return listCatalogGenres();
  });

  app.get("/manga/:id", { schema: catalogRouteSchemas.mangaDetail }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
    return getCatalogManga(id);
  });

  app.get("/manga/:id/chapters", { schema: catalogRouteSchemas.chapters }, async (request, reply) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = chaptersQuerySchema.parse(request.query);
    const result = await listCatalogChapters(id, query);
    if (result.needsSync) {
      reply.code(202);
    }
    return result;
  });

  app.get("/chapters/:id/reader", { schema: catalogRouteSchemas.reader }, async (request) => {
    const { id } = chapterParamsSchema.parse(request.params);
    return getChapterReader(id);
  });
}
