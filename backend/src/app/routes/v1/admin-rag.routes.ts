import type { FastifyInstance } from "fastify";
import { getAdminRagStatusView, listAdminRagDocumentPage, reindexAdminRag } from "../../controllers/admin-rag.controller.js";
import { adminRagRouteSchemas } from "../../docs/route-schemas.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";
import { adminRagDocumentsQuerySchema, adminRagReindexBodySchema } from "../../validators/admin-rag.validator.js";

export async function adminRagRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await requireAdminAccess(request);
  });

  app.get("/admin/rag/status", { schema: adminRagRouteSchemas.status }, async () => {
    return getAdminRagStatusView();
  });

  app.get("/admin/rag/documents", { schema: adminRagRouteSchemas.listDocuments }, async (request) => {
    return listAdminRagDocumentPage(adminRagDocumentsQuerySchema.parse(request.query));
  });

  app.post("/admin/rag/reindex", { schema: adminRagRouteSchemas.reindex }, async (request) => {
    return reindexAdminRag(app.log, adminRagReindexBodySchema.parse(request.body ?? {}));
  });
}
