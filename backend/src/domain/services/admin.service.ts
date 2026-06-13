import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { normalizeCoverProxyUrl } from "../../shared/utils/media-url.js";

export type AdminPageQuery = {
  query?: string;
  limit: number;
  offset: number;
};

export async function getAdminOverview() {
  const [users, activeSessions, cachedManga, cachedChapters, libraryItems, readingProgress, searchHistory, latestManga] = await prisma.$transaction([
    prisma.user.count(),
    prisma.refreshSession.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.cachedManga.count(),
    prisma.cachedChapter.count(),
    prisma.libraryItem.count(),
    prisma.readingProgress.count(),
    prisma.searchHistory.count(),
    prisma.cachedManga.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } })
  ]);

  return {
    users,
    activeSessions,
    cachedManga,
    cachedChapters,
    libraryItems,
    readingProgress,
    searchHistory,
    latestCatalogFetchAt: latestManga?.fetchedAt.toISOString() ?? null
  };
}

export async function listAdminCachedManga(query: AdminPageQuery) {
  const where = cachedMangaWhere(query.query);
  const [data, total] = await prisma.$transaction([
    prisma.cachedManga.findMany({
      where,
      orderBy: [{ fetchedAt: "desc" }, { title: "asc" }],
      take: query.limit,
      skip: query.offset,
      include: { _count: { select: { chapters: true } } }
    }),
    prisma.cachedManga.count({ where })
  ]);

  return {
    data: data.map((manga) => ({
      id: manga.id,
      title: manga.title,
      coverUrl: normalizeCoverProxyUrl(manga.coverUrl),
      status: manga.status,
      year: manga.year,
      tags: manga.tags,
      fetchedAt: manga.fetchedAt.toISOString(),
      updatedAt: manga.updatedAt.toISOString(),
      chapterCount: manga._count.chapters
    })),
    limit: query.limit,
    offset: query.offset,
    total
  };
}

export async function getAdminCachedManga(mangaId: string) {
  const manga = await prisma.cachedManga.findUnique({
    where: { id: mangaId },
    include: { _count: { select: { chapters: true } } }
  });

  return {
    manga: manga
      ? {
          id: manga.id,
          title: manga.title,
          altTitles: manga.altTitles,
          description: manga.description,
          status: manga.status,
          year: manga.year,
          contentRating: manga.contentRating,
          tags: manga.tags,
          coverUrl: normalizeCoverProxyUrl(manga.coverUrl),
          fetchedAt: manga.fetchedAt.toISOString(),
          updatedAt: manga.updatedAt.toISOString(),
          chapterCount: manga._count.chapters
        }
      : null
  };
}

export async function deleteAdminCachedManga(mangaId: string) {
  return prisma.cachedManga.deleteMany({ where: { id: mangaId } });
}

export async function deleteAdminCachedChapters(mangaId: string) {
  return prisma.cachedChapter.deleteMany({ where: { mangaId } });
}

export async function listAdminUsers(query: AdminPageQuery) {
  const where = userWhere(query.query);
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
      include: {
        _count: {
          select: {
            refreshSessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
            libraryItems: true,
            progress: true,
            searchHistory: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: data.map(publicAdminUser),
    limit: query.limit,
    offset: query.offset,
    total
  };
}

export async function getAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          refreshSessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
          libraryItems: true,
          progress: true,
          searchHistory: true
        }
      }
    }
  });
  return { user: user ? publicAdminUser(user) : null };
}

export async function updateAdminUser(userId: string, data: { displayName?: string; avatarUrl?: string | null }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {})
    }
  });
  return { user: publicUser(user) };
}

export async function revokeAdminUserSessions(userId: string) {
  return prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function deleteAdminUser(userId: string) {
  return prisma.user.deleteMany({ where: { id: userId } });
}

export async function listAdminUserLibrary(userId: string, query: AdminPageQuery) {
  const where: Prisma.LibraryItemWhereInput = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.libraryItem.findMany({ where, orderBy: [{ updatedAt: "desc" }], take: query.limit, skip: query.offset }),
    prisma.libraryItem.count({ where })
  ]);
  const mangaById = await cachedMangaMap(items.map((item) => item.mangaId));

  return {
    data: items.map((item) => ({ ...serializeDates(item), manga: mangaById.get(item.mangaId) ?? null })),
    limit: query.limit,
    offset: query.offset,
    total
  };
}

export async function upsertAdminUserLibrary(
  userId: string,
  mangaId: string,
  body: { status?: Prisma.LibraryItemCreateInput["status"]; isFavorite?: boolean; lastChapterId?: string | null }
) {
  const item = await prisma.libraryItem.upsert({
    where: { userId_mangaId: { userId, mangaId } },
    create: {
      userId,
      mangaId,
      status: body.status,
      isFavorite: body.isFavorite,
      lastChapterId: body.lastChapterId ?? undefined,
      lastReadAt: body.lastChapterId ? new Date() : undefined
    },
    update: {
      status: body.status,
      isFavorite: body.isFavorite,
      lastChapterId: body.lastChapterId,
      lastReadAt: body.lastChapterId ? new Date() : undefined
    }
  });
  return { item: serializeDates(item) };
}

export async function deleteAdminUserLibrary(userId: string, mangaId: string) {
  return prisma.libraryItem.deleteMany({ where: { userId, mangaId } });
}

export async function listAdminUserProgress(userId: string, query: AdminPageQuery & { mangaId?: string }) {
  const where: Prisma.ReadingProgressWhereInput = { userId, ...(query.mangaId ? { mangaId: query.mangaId } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.readingProgress.findMany({ where, orderBy: { updatedAt: "desc" }, take: query.limit, skip: query.offset }),
    prisma.readingProgress.count({ where })
  ]);
  const [mangaById, chapterById] = await Promise.all([
    cachedMangaMap(items.map((item) => item.mangaId)),
    cachedChapterMap(items.map((item) => item.chapterId))
  ]);

  return {
    data: items.map((item) => ({
      ...serializeDates(item),
      manga: mangaById.get(item.mangaId) ?? null,
      chapter: chapterById.get(item.chapterId) ?? null
    })),
    limit: query.limit,
    offset: query.offset,
    total
  };
}

export async function upsertAdminUserProgress(userId: string, chapterId: string, body: { mangaId: string; pageIndex: number; completed: boolean }) {
  const progress = await prisma.readingProgress.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    create: { userId, chapterId, ...body },
    update: { mangaId: body.mangaId, pageIndex: body.pageIndex, completed: body.completed }
  });
  return { progress: serializeDates(progress) };
}

export async function deleteAdminUserProgress(userId: string, chapterId: string) {
  return prisma.readingProgress.deleteMany({ where: { userId, chapterId } });
}

export async function listAdminUserSearchHistory(userId: string, query: AdminPageQuery) {
  const where: Prisma.SearchHistoryWhereInput = { userId };
  const [data, total] = await prisma.$transaction([
    prisma.searchHistory.findMany({ where, orderBy: { createdAt: "desc" }, take: query.limit, skip: query.offset }),
    prisma.searchHistory.count({ where })
  ]);
  return { data: data.map(serializeDates), limit: query.limit, offset: query.offset, total };
}

export async function clearAdminUserSearchHistory(userId: string) {
  return prisma.searchHistory.deleteMany({ where: { userId } });
}

function cachedMangaWhere(query?: string): Prisma.CachedMangaWhereInput {
  if (!query) return {};
  return {
    OR: [{ id: query }, { title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }]
  };
}

function userWhere(query?: string): Prisma.UserWhereInput {
  if (!query) return {};
  return {
    OR: [{ id: query }, { email: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }]
  };
}

function publicUser(user: { id: string; email: string; displayName: string; role: "USER" | "ADMIN"; avatarUrl: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString()
  };
}

function publicAdminUser(user: Parameters<typeof publicUser>[0] & { _count: { refreshSessions: number; libraryItems: number; progress: number; searchHistory: number } }) {
  return {
    ...publicUser(user),
    counts: {
      activeSessions: user._count.refreshSessions,
      libraryItems: user._count.libraryItems,
      readingProgress: user._count.progress,
      searchHistory: user._count.searchHistory
    }
  };
}

async function cachedMangaMap(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map<string, unknown>();
  const manga = await prisma.cachedManga.findMany({ where: { id: { in: uniqueIds } } });
  return new Map(
    manga.map((item) => [
      item.id,
      {
        id: item.id,
        title: item.title,
        coverUrl: normalizeCoverProxyUrl(item.coverUrl),
        status: item.status,
        year: item.year,
        tags: item.tags
      }
    ])
  );
}

async function cachedChapterMap(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map<string, unknown>();
  const chapters = await prisma.cachedChapter.findMany({ where: { id: { in: uniqueIds } } });
  return new Map(
    chapters.map((item) => [
      item.id,
      {
        id: item.id,
        title: item.title,
        chapter: item.chapter,
        volume: item.volume,
        translatedLanguage: item.translatedLanguage,
        pages: item.pages,
        scanlationGroup: item.scanlationGroup
      }
    ])
  );
}

function serializeDates<T extends Record<string, unknown>>(item: T) {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));
}

