import { prisma } from "../../infrastructure/database/client.js";

export const bookmarkRepository = {
  async findByUser(userId: string, input: { limit: number; offset: number }) {
    const [data, total] = await prisma.$transaction([
      prisma.bookmark.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: input.limit,
        skip: input.offset
      }),
      prisma.bookmark.count({ where: { userId } })
    ]);

    return { data, total, limit: input.limit, offset: input.offset };
  },
  findByUserAndChapter(userId: string, chapterId: string) {
    return prisma.bookmark.findUnique({
      where: { userId_chapterId: { userId, chapterId } }
    });
  },
  upsert(input: { userId: string; mangaId: string; chapterId: string; pageIndex: number; note?: string | null; isFavorite?: boolean }) {
    return prisma.bookmark.upsert({
      where: { userId_chapterId: { userId: input.userId, chapterId: input.chapterId } },
      create: {
        userId: input.userId,
        mangaId: input.mangaId,
        chapterId: input.chapterId,
        pageIndex: input.pageIndex,
        note: input.note,
        isFavorite: input.isFavorite ?? false
      },
      update: {
        mangaId: input.mangaId,
        pageIndex: input.pageIndex,
        note: input.note,
        isFavorite: input.isFavorite
      }
    });
  },
  async update(userId: string, id: string, input: { pageIndex?: number; note?: string | null; isFavorite?: boolean }) {
    const existing = await prisma.bookmark.findFirst({ where: { id, userId } });
    if (!existing) return null;
    return prisma.bookmark.update({
      where: { id },
      data: input
    });
  },
  remove(userId: string, id: string) {
    return prisma.bookmark.deleteMany({ where: { id, userId } });
  }
};
