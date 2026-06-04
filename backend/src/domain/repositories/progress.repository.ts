import { prisma } from "../../infrastructure/database/client.js";

export const progressRepository = {
  findByManga(userId: string, mangaId: string) {
    return prisma.readingProgress.findMany({
      where: { userId, mangaId },
      orderBy: { updatedAt: "desc" }
    });
  },
  findByChapter(userId: string, chapterId: string) {
    return prisma.readingProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } }
    });
  },
  save(input: { userId: string; mangaId: string; chapterId: string; pageIndex: number; completed: boolean }) {
    return prisma.$transaction(async (tx) => {
      const nextProgress = await tx.readingProgress.upsert({
        where: { userId_chapterId: { userId: input.userId, chapterId: input.chapterId } },
        create: input,
        update: {
          pageIndex: input.pageIndex,
          completed: input.completed
        }
      });

      await tx.libraryItem.upsert({
        where: { userId_mangaId: { userId: input.userId, mangaId: input.mangaId } },
        create: {
          userId: input.userId,
          mangaId: input.mangaId,
          lastChapterId: input.chapterId,
          lastReadAt: new Date()
        },
        update: {
          lastChapterId: input.chapterId,
          lastReadAt: new Date()
        }
      });

      return nextProgress;
    });
  }
};
