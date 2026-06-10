import type { FastifyInstance } from "fastify";
import { getChapterProgress, getMangaProgress, saveChapterProgress } from "../../controllers/progress.controller.js";
import { chapterProgressParamsSchema, mangaProgressParamsSchema, saveProgressSchema } from "../../validators/progress.validator.js";
import { progressRouteSchemas } from "../../docs/route-schemas.js";

export async function progressRoutes(app: FastifyInstance) {
  app.get("/progress/manga/:mangaId", { schema: progressRouteSchemas.manga, preHandler: app.authenticate }, async (request) => {
    const { mangaId } = mangaProgressParamsSchema.parse(request.params);
    return getMangaProgress(request.user.sub, mangaId);
  });

  app.get("/progress/:chapterId", { schema: progressRouteSchemas.chapter, preHandler: app.authenticate }, async (request) => {
    const { chapterId } = chapterProgressParamsSchema.parse(request.params);
    return getChapterProgress(request.user.sub, chapterId);
  });

  app.put("/progress/:chapterId", { schema: progressRouteSchemas.save, preHandler: app.authenticate }, async (request) => {
    const { chapterId } = chapterProgressParamsSchema.parse(request.params);
    const body = saveProgressSchema.parse(request.body);
    return saveChapterProgress(request.user.sub, chapterId, body);
  });
}
