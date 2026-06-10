import type { FastifyInstance } from "fastify";
import { getLibraryItem, listLibrary, removeLibraryItem, upsertLibraryItem } from "../../controllers/library.controller.js";
import { libraryParamsSchema, upsertLibrarySchema } from "../../validators/library.validator.js";
import { libraryRouteSchemas } from "../../docs/route-schemas.js";

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library", { schema: libraryRouteSchemas.list, preHandler: app.authenticate }, async (request) => {
    return listLibrary(request.user.sub);
  });

  app.get("/library/:mangaId", { schema: libraryRouteSchemas.item, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    return getLibraryItem(request.user.sub, mangaId);
  });

  app.post("/library/:mangaId", { schema: libraryRouteSchemas.upsert, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    const body = upsertLibrarySchema.parse(request.body ?? {});
    return upsertLibraryItem(request.user.sub, mangaId, body);
  });

  app.delete("/library/:mangaId", { schema: libraryRouteSchemas.remove, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = libraryParamsSchema.parse(request.params);
    return removeLibraryItem(request.user.sub, mangaId);
  });
}
