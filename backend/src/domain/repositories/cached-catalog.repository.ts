import { prisma } from "../../infrastructure/database/client.js";

export const cachedCatalogRepository = {
  findMangaByIds(ids: string[]) {
    return prisma.cachedManga.findMany({ where: { id: { in: ids } } });
  },
  findLatestProgressByMangaIds(userId: string, mangaIds: string[]) {
    return prisma.readingProgress.findMany({
      where: { userId, mangaId: { in: mangaIds } },
      orderBy: { updatedAt: "desc" }
    });
  },
  findChapterById(id: string) {
    return prisma.cachedChapter.findUnique({ where: { id } });
  }
};
