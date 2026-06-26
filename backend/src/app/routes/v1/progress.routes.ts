import type { FastifyInstance } from "fastify";
import { handleGetChapterProgress, handleGetMangaProgress, handleSaveChapterProgress } from "../../controllers/progress.controller.js";
import { progressRouteSchemas } from "../../docs/route-schemas.js";

export async function progressRoutes(app: FastifyInstance) {
  app.get("/progress/manga/:mangaId", { schema: progressRouteSchemas.manga, preHandler: app.authenticate }, handleGetMangaProgress);
  app.get("/progress/:chapterId", { schema: progressRouteSchemas.chapter, preHandler: app.authenticate }, handleGetChapterProgress);
  app.put("/progress/:chapterId", { schema: progressRouteSchemas.save, preHandler: app.authenticate }, handleSaveChapterProgress);
}
