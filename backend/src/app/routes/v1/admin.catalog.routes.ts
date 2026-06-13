import type { FastifyInstance } from "fastify";
import { importAdminManga, importAdminMangaChapters, syncAdminCatalog } from "../../controllers/admin-catalog.controller.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";
import { mangaParamsSchema } from "../../validators/catalog.validator.js";
import { adminCatalogRouteSchemas } from "../../docs/route-schemas.js";

export async function adminCatalogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await requireAdminAccess(request);
  });

  app.post("/admin/catalog/manga/:id/import", { schema: adminCatalogRouteSchemas.importManga }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = request.query as Record<string, unknown>;
    return importAdminManga(id, query);
  });

  app.post("/admin/catalog/manga/:id/chapters/import", { schema: adminCatalogRouteSchemas.importMangaChapters }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = request.query as Record<string, unknown>;
    return importAdminMangaChapters(id, query);
  });

  app.post("/admin/catalog/sync", { schema: adminCatalogRouteSchemas.syncCatalog }, async (request) => {
    const query = request.query as Record<string, unknown>;
    return syncAdminCatalog(query);
  });
}
