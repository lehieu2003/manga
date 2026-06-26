import type { FastifyInstance } from "fastify";
import { handleGetAdminRagStatusView, handleListAdminRagDocumentPage, handleReindexAdminRag } from "../../controllers/admin-rag.controller.js";
import { adminRagRouteSchemas } from "../../docs/route-schemas.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";

export async function adminRagRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await requireAdminAccess(request);
  });

  app.get("/admin/rag/status", { schema: adminRagRouteSchemas.status }, handleGetAdminRagStatusView);
  app.get("/admin/rag/documents", { schema: adminRagRouteSchemas.listDocuments }, handleListAdminRagDocumentPage);
  app.post("/admin/rag/reindex", { schema: adminRagRouteSchemas.reindex }, handleReindexAdminRag);
}
