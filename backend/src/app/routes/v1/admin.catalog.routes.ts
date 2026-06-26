import type { FastifyInstance } from "fastify";
import { handleImportAdminManga, handleImportAdminMangaChapters, handleSyncAdminCatalog } from "../../controllers/admin-catalog.controller.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";
import { adminCatalogRouteSchemas } from "../../docs/route-schemas.js";

export async function adminCatalogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await requireAdminAccess(request);
  });

  app.post("/admin/catalog/manga/:id/import", { schema: adminCatalogRouteSchemas.importManga }, handleImportAdminManga);
  app.post("/admin/catalog/manga/:id/chapters/import", { schema: adminCatalogRouteSchemas.importMangaChapters }, handleImportAdminMangaChapters);
  app.post("/admin/catalog/sync", { schema: adminCatalogRouteSchemas.syncCatalog }, handleSyncAdminCatalog);
}
