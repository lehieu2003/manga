import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const uuidSchema = z.string().uuid();

export async function progressRoutes(app: FastifyInstance) {
  app.get("/progress/manga/:mangaId", { preHandler: app.authenticate }, async (request) => {
    const { mangaId } = z.object({ mangaId: uuidSchema }).parse(request.params);
    const chaptersProgress = await prisma.readingProgress.findMany({
      where: { userId: request.user.sub, mangaId },
      orderBy: { updatedAt: "desc" }
    });
    const progress = chaptersProgress[0] ?? null;
    const chapter = progress ? await prisma.cachedChapter.findUnique({ where: { id: progress.chapterId } }) : null;

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
    const { chapterId } = z.object({ chapterId: uuidSchema }).parse(request.params);
    const progress = await prisma.readingProgress.findUnique({
      where: { userId_chapterId: { userId: request.user.sub, chapterId } }
    });
    return { progress };
  });

  app.put("/progress/:chapterId", { preHandler: app.authenticate }, async (request) => {
    const { chapterId } = z.object({ chapterId: uuidSchema }).parse(request.params);
    const body = z
      .object({
        mangaId: uuidSchema,
        pageIndex: z.number().int().min(0),
        completed: z.boolean().default(false)
      })
      .parse(request.body);

    const progress = await prisma.$transaction(async (tx) => {
      const nextProgress = await tx.readingProgress.upsert({
        where: { userId_chapterId: { userId: request.user.sub, chapterId } },
        create: {
          userId: request.user.sub,
          mangaId: body.mangaId,
          chapterId,
          pageIndex: body.pageIndex,
          completed: body.completed
        },
        update: {
          pageIndex: body.pageIndex,
          completed: body.completed
        }
      });

      await tx.libraryItem.upsert({
        where: { userId_mangaId: { userId: request.user.sub, mangaId: body.mangaId } },
        create: {
          userId: request.user.sub,
          mangaId: body.mangaId,
          lastChapterId: chapterId,
          lastReadAt: new Date()
        },
        update: {
          lastChapterId: chapterId,
          lastReadAt: new Date()
        }
      });

      return nextProgress;
    });

    return { progress };
  });
}
