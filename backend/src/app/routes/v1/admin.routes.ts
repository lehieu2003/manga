import type { FastifyInstance } from "fastify";
import { LibraryStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../infrastructure/database/client.js";
import { normalizeCoverProxyUrl } from "../../../shared/utils/media-url.js";
import { requireAdminToken } from "../../middlewares/admin.middleware.js";
import { uuidSchema } from "../../validators/common.validator.js";
import { updateProfileSchema } from "../../validators/auth.validator.js";

const pageQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

const userParamsSchema = z.object({ userId: z.string().min(1) });
const mangaParamsSchema = z.object({ mangaId: uuidSchema });
const chapterParamsSchema = z.object({ chapterId: uuidSchema });
const userMangaParamsSchema = userParamsSchema.merge(mangaParamsSchema);
const userChapterParamsSchema = userParamsSchema.merge(chapterParamsSchema);
const libraryAdminBodySchema = z.object({
  status: z.nativeEnum(LibraryStatus).optional(),
  isFavorite: z.boolean().optional(),
  lastChapterId: uuidSchema.nullable().optional()
});
const progressQuerySchema = pageQuerySchema.extend({ mangaId: uuidSchema.optional() });
const progressAdminBodySchema = z.object({
  mangaId: uuidSchema,
  pageIndex: z.number().int().min(0),
  completed: z.boolean().default(false)
});
const adminRouteSchema = (summary: string) =>
  ({
    summary,
    tags: ["Admin"],
    security: [{ xAdminToken: [] }],
    response: {
      200: {
        type: "object",
        additionalProperties: true
      }
    }
  }) as const;

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    requireAdminToken(request);
  });

  app.get("/admin/overview", { schema: adminRouteSchema("Get admin overview counts") }, async () => {
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
  });

  app.get("/admin/catalog/cache/manga", { schema: adminRouteSchema("List cached manga for admin") }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
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
  });

  app.get("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchema("Get cached manga detail for admin") }, async (request) => {
    const { mangaId } = mangaParamsSchema.parse(request.params);
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
  });

  app.delete("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchema("Delete one cached manga row") }, async (request) => {
    const { mangaId } = mangaParamsSchema.parse(request.params);
    const result = await prisma.cachedManga.deleteMany({ where: { id: mangaId } });
    logAdminMutation(app, "catalog.cache.manga.delete", mangaId, result.count);
    return affected(result.count);
  });

  app.delete("/admin/catalog/cache/manga/:mangaId/chapters", { schema: adminRouteSchema("Delete cached chapters for one manga") }, async (request) => {
    const { mangaId } = mangaParamsSchema.parse(request.params);
    const result = await prisma.cachedChapter.deleteMany({ where: { mangaId } });
    logAdminMutation(app, "catalog.cache.chapters.delete", mangaId, result.count);
    return affected(result.count);
  });

  app.get("/admin/users", { schema: adminRouteSchema("List users for admin") }, async (request) => {
    const query = pageQuerySchema.parse(request.query);
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
  });

  app.get("/admin/users/:userId", { schema: adminRouteSchema("Get user detail for admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
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
  });

  app.patch("/admin/users/:userId", { schema: adminRouteSchema("Update user profile as admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const body = updateProfileSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {})
      }
    });
    logAdminMutation(app, "users.update", userId, 1);
    return { user: publicUser(user) };
  });

  app.post("/admin/users/:userId/sessions/revoke", { schema: adminRouteSchema("Revoke active user sessions") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const result = await prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    logAdminMutation(app, "users.sessions.revoke", userId, result.count);
    return affected(result.count);
  });

  app.delete("/admin/users/:userId", { schema: adminRouteSchema("Delete one user") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const result = await prisma.user.deleteMany({ where: { id: userId } });
    logAdminMutation(app, "users.delete", userId, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/library", { schema: adminRouteSchema("List user library as admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const query = pageQuerySchema.parse(request.query);
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
  });

  app.patch("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchema("Update user library item as admin") }, async (request) => {
    const { userId, mangaId } = userMangaParamsSchema.parse(request.params);
    const body = libraryAdminBodySchema.parse(request.body);
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
    logAdminMutation(app, "users.library.upsert", `${userId}:${mangaId}`, 1);
    return { item: serializeDates(item) };
  });

  app.delete("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchema("Delete user library item as admin") }, async (request) => {
    const { userId, mangaId } = userMangaParamsSchema.parse(request.params);
    const result = await prisma.libraryItem.deleteMany({ where: { userId, mangaId } });
    logAdminMutation(app, "users.library.delete", `${userId}:${mangaId}`, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/progress", { schema: adminRouteSchema("List user reading progress as admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const query = progressQuerySchema.parse(request.query);
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
  });

  app.patch("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchema("Update user reading progress as admin") }, async (request) => {
    const { userId, chapterId } = userChapterParamsSchema.parse(request.params);
    const body = progressAdminBodySchema.parse(request.body);
    const progress = await prisma.readingProgress.upsert({
      where: { userId_chapterId: { userId, chapterId } },
      create: { userId, chapterId, ...body },
      update: { mangaId: body.mangaId, pageIndex: body.pageIndex, completed: body.completed }
    });
    logAdminMutation(app, "users.progress.upsert", `${userId}:${chapterId}`, 1);
    return { progress: serializeDates(progress) };
  });

  app.delete("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchema("Delete user reading progress as admin") }, async (request) => {
    const { userId, chapterId } = userChapterParamsSchema.parse(request.params);
    const result = await prisma.readingProgress.deleteMany({ where: { userId, chapterId } });
    logAdminMutation(app, "users.progress.delete", `${userId}:${chapterId}`, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/search-history", { schema: adminRouteSchema("List user search history as admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const query = pageQuerySchema.parse(request.query);
    const where: Prisma.SearchHistoryWhereInput = { userId };
    const [data, total] = await prisma.$transaction([
      prisma.searchHistory.findMany({ where, orderBy: { createdAt: "desc" }, take: query.limit, skip: query.offset }),
      prisma.searchHistory.count({ where })
    ]);
    return { data: data.map(serializeDates), limit: query.limit, offset: query.offset, total };
  });

  app.delete("/admin/users/:userId/search-history", { schema: adminRouteSchema("Clear user search history as admin") }, async (request) => {
    const { userId } = userParamsSchema.parse(request.params);
    const result = await prisma.searchHistory.deleteMany({ where: { userId } });
    logAdminMutation(app, "users.search-history.delete", userId, result.count);
    return affected(result.count);
  });
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

function publicUser(user: { id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
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

function affected(count: number) {
  return { ok: true as const, summary: { affectedCount: count } };
}

function serializeDates<T extends Record<string, unknown>>(item: T) {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));
}

function logAdminMutation(app: FastifyInstance, action: string, targetId: string, affectedCount: number) {
  app.log.info({ action, targetId, affectedCount }, "Admin mutation completed");
}
