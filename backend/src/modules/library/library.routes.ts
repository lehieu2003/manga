import type { FastifyInstance } from "fastify";
import { LibraryStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const uuidSchema = z.string().uuid();

export async function libraryRoutes(app: FastifyInstance) {
  app.get("/library", { preHandler: app.authenticate }, async (request) => {
    const items = await prisma.libraryItem.findMany({
      where: { userId: request.user.sub },
      orderBy: [{ lastReadAt: "desc" }, { updatedAt: "desc" }]
    });
    const mangaIds = items.map((item) => item.mangaId);
    const [manga, progress] = await Promise.all([
      prisma.cachedManga.findMany({ where: { id: { in: mangaIds } } }),
      prisma.readingProgress.findMany({
        where: { userId: request.user.sub, mangaId: { in: mangaIds } },
        orderBy: { updatedAt: "desc" }
      })
    ]);
    const mangaById = new Map(manga.map((item) => [item.id, item]));
    const progressByMangaId = new Map(progress.map((item) => [item.mangaId, item]));

    return {
      data: items.map((item) => {
        const cached = mangaById.get(item.mangaId);
        return {
          ...item,
          manga: cached
            ? {
                id: cached.id,
                title: cached.title,
                coverUrl: cached.coverUrl,
                status: cached.status,
                year: cached.year,
                tags: cached.tags
              }
            : null,
          readingProgress: progressByMangaId.get(item.mangaId) ?? null
        };
      })
    };
  });

  app.get("/library/:mangaId", { preHandler: app.authenticate }, async (request) => {
    const { mangaId } = z.object({ mangaId: uuidSchema }).parse(request.params);
    const item = await prisma.libraryItem.findUnique({
      where: { userId_mangaId: { userId: request.user.sub, mangaId } }
    });
    return { item };
  });

  app.post("/library/:mangaId", { preHandler: app.authenticate }, async (request) => {
    const { mangaId } = z.object({ mangaId: uuidSchema }).parse(request.params);
    const body = z
      .object({
        status: z.nativeEnum(LibraryStatus).default("READING"),
        isFavorite: z.boolean().default(false),
        lastChapterId: uuidSchema.optional()
      })
      .parse(request.body ?? {});

    const item = await prisma.libraryItem.upsert({
      where: { userId_mangaId: { userId: request.user.sub, mangaId } },
      create: {
        userId: request.user.sub,
        mangaId,
        status: body.status,
        isFavorite: body.isFavorite,
        lastChapterId: body.lastChapterId,
        lastReadAt: body.lastChapterId ? new Date() : undefined
      },
      update: {
        status: body.status,
        isFavorite: body.isFavorite,
        lastChapterId: body.lastChapterId,
        lastReadAt: body.lastChapterId ? new Date() : undefined
      }
    });

    return { item };
  });

  app.delete("/library/:mangaId", { preHandler: app.authenticate }, async (request) => {
    const { mangaId } = z.object({ mangaId: uuidSchema }).parse(request.params);
    await prisma.libraryItem.deleteMany({ where: { userId: request.user.sub, mangaId } });
    return { ok: true };
  });
}
