import type { FastifyInstance } from "fastify";
import { handleGetCatalogManga, handleGetChapterReader, handleListCatalogChapters, handleListCatalogGenres, handleSearchCatalogManga } from "../../controllers/catalog.controller.js";
import { catalogRouteSchemas } from "../../docs/route-schemas.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/manga/search", { schema: catalogRouteSchemas.search }, handleSearchCatalogManga);
  app.get("/genres", { schema: catalogRouteSchemas.genres }, handleListCatalogGenres);
  app.get("/manga/:id", { schema: catalogRouteSchemas.mangaDetail }, handleGetCatalogManga);
  app.get("/manga/:id/chapters", { schema: catalogRouteSchemas.chapters }, handleListCatalogChapters);
  app.get("/chapters/:id/reader", { schema: catalogRouteSchemas.reader }, handleGetChapterReader);
}
