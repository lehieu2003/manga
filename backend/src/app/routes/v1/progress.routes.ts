import type { FastifyInstance } from "fastify";
import { cachedCatalogRepository, progressRepository } from "../../../domain/repositories/index.js";
import { chapterProgressParamsSchema, mangaProgressParamsSchema, saveProgressSchema } from "../../validators/progress.validator.js";

export async function progressRoutes(app: FastifyInstance) {
  app.get("/progress/manga/:mangaId", { preHandler: app.authenticate }, async (request) => {
    const { mangaId } = mangaProgressParamsSchema.parse(request.params);
    const chaptersProgress = await progressRepository.findByManga(request.user.sub, mangaId);
    const progress = chaptersProgress[0] ?? null;
    const chapter = progress ? await cachedCatalogRepository.findChapterById(progress.chapterId) : null;

    return {
      progress,
      chaptersProgress,
      chapter: chapter
        ? {
            id: chapter.id,
            title: chapter.title,
            chapter: chapter.chapter,
            volume: chapter.volume,
            translatedLanguage: chapter.translatedLanguage,
            publishAt: chapter.publishAt?.toISOString() ?? "",
            pages: chapter.pages,
            scanlationGroup: chapter.scanlationGroup ?? undefined
          }
        : null
    };
  });

  app.get("/progress/:chapterId", { preHandler: app.authenticate }, async (request) => {
    const { chapterId } = chapterProgressParamsSchema.parse(request.params);
    const progress = await progressRepository.findByChapter(request.user.sub, chapterId);
    return { progress };
  });

  app.put("/progress/:chapterId", { preHandler: app.authenticate }, async (request) => {
    const { chapterId } = chapterProgressParamsSchema.parse(request.params);
    const body = saveProgressSchema.parse(request.body);
    const progress = await progressRepository.save({ userId: request.user.sub, chapterId, ...body });

    return { progress };
  });
}
