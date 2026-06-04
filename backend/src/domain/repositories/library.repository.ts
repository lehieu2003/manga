import type { LibraryStatus } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";

export const libraryRepository = {
  findByUser(userId: string) {
    return prisma.libraryItem.findMany({
      where: { userId },
      orderBy: [{ lastReadAt: "desc" }, { updatedAt: "desc" }]
    });
  },
  findByUserAndManga(userId: string, mangaId: string) {
    return prisma.libraryItem.findUnique({
      where: { userId_mangaId: { userId, mangaId } }
    });
  },
  upsert(input: { userId: string; mangaId: string; status?: LibraryStatus; isFavorite?: boolean; lastChapterId?: string }) {
    return prisma.libraryItem.upsert({
      where: { userId_mangaId: { userId: input.userId, mangaId: input.mangaId } },
      create: {
        userId: input.userId,
        mangaId: input.mangaId,
        status: input.status,
        isFavorite: input.isFavorite,
        lastChapterId: input.lastChapterId,
        lastReadAt: input.lastChapterId ? new Date() : undefined
      },
      update: {
        status: input.status,
        isFavorite: input.isFavorite,
        lastChapterId: input.lastChapterId,
        lastReadAt: input.lastChapterId ? new Date() : undefined
      }
    });
  },
  remove(userId: string, mangaId: string) {
    return prisma.libraryItem.deleteMany({ where: { userId, mangaId } });
  }
};
