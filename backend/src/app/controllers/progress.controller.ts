import type { FastifyRequest } from "fastify";
import type { z } from "zod";
import { domainEvents } from "../../domain/events/index.js";
import { cachedCatalogRepository, progressRepository } from "../../domain/repositories/index.js";
import { chapterProgressParamsSchema, mangaProgressParamsSchema, saveProgressSchema } from "../validators/progress.validator.js";

type SaveProgressInput = z.infer<typeof saveProgressSchema>;

export async function handleGetMangaProgress(request: FastifyRequest) {
  const { mangaId } = mangaProgressParamsSchema.parse(request.params);
  return getMangaProgress(request.user.sub, mangaId);
}

export async function handleGetChapterProgress(request: FastifyRequest) {
  const { chapterId } = chapterProgressParamsSchema.parse(request.params);
  return getChapterProgress(request.user.sub, chapterId);
}

export async function handleSaveChapterProgress(request: FastifyRequest) {
  const { chapterId } = chapterProgressParamsSchema.parse(request.params);
  const body = saveProgressSchema.parse(request.body);
  return saveChapterProgress(request.user.sub, chapterId, body);
}

export async function getMangaProgress(userId: string, mangaId: string) {
  const chaptersProgress = await progressRepository.findByManga(userId, mangaId);
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
}

export async function getChapterProgress(userId: string, chapterId: string) {
  const progress = await progressRepository.findByChapter(userId, chapterId);
  return { progress };
}

export async function saveChapterProgress(userId: string, chapterId: string, input: SaveProgressInput) {
  const progress = await progressRepository.save({ userId, chapterId, ...input });
  await domainEvents.publish({
    type: "progress.chapter_saved",
    userId,
    mangaId: progress.mangaId,
    chapterId,
    pageIndex: progress.pageIndex,
    completed: progress.completed
  });

  return { progress };
}
