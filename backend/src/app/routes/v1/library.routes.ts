import type { FastifyInstance } from "fastify";
import { handleGetLibraryItem, handleListLibrary, handleRemoveLibraryItem, handleUpsertLibraryItem } from "../../controllers/library.controller.js";
import { libraryRouteSchemas } from "../../docs/route-schemas.js";

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library", { schema: libraryRouteSchemas.list, preHandler: app.authenticate }, handleListLibrary);
  app.get("/library/:mangaId", { schema: libraryRouteSchemas.item, preHandler: app.authenticate }, handleGetLibraryItem);
  app.post("/library/:mangaId", { schema: libraryRouteSchemas.upsert, preHandler: app.authenticate }, handleUpsertLibraryItem);
  app.delete("/library/:mangaId", { schema: libraryRouteSchemas.remove, preHandler: app.authenticate }, handleRemoveLibraryItem);
}
