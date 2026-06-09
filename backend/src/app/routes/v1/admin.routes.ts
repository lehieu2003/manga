import type { FastifyInstance } from "fastify";
import {
  clearAdminUserSearchHistory,
  deleteAdminCachedChapters,
  deleteAdminCachedManga,
  deleteAdminUser,
  deleteAdminUserLibrary,
  deleteAdminUserProgress,
  getAdminCachedManga,
  getAdminOverview,
  getAdminUser,
  listAdminCachedManga,
  listAdminUserLibrary,
  listAdminUserProgress,
  listAdminUserSearchHistory,
  listAdminUsers,
  revokeAdminUserSessions,
  updateAdminUser,
  upsertAdminUserLibrary,
  upsertAdminUserProgress
} from "../../../domain/services/admin.service.js";
import { requireAdminToken } from "../../middlewares/admin.middleware.js";
import { updateProfileSchema } from "../../validators/auth.validator.js";
import {
  adminLibraryBodySchema,
  adminMangaParamsSchema,
  adminPageQuerySchema,
  adminProgressBodySchema,
  adminProgressQuerySchema,
  adminUserChapterParamsSchema,
  adminUserMangaParamsSchema,
  adminUserParamsSchema
} from "../../validators/admin.validator.js";
import { adminRouteSchemas } from "../../docs/route-schemas.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    requireAdminToken(request);
  });

  app.get("/admin/overview", { schema: adminRouteSchemas.overview }, async () => getAdminOverview());

  app.get("/admin/catalog/cache/manga", { schema: adminRouteSchemas.listCachedManga }, async (request) => {
    return listAdminCachedManga(adminPageQuerySchema.parse(request.query));
  });

  app.get("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.getCachedManga }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    return getAdminCachedManga(mangaId);
  });

  app.delete("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.deleteCachedManga }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    const result = await deleteAdminCachedManga(mangaId);
    logAdminMutation(app, "catalog.cache.manga.delete", mangaId, result.count);
    return affected(result.count);
  });

  app.delete("/admin/catalog/cache/manga/:mangaId/chapters", { schema: adminRouteSchemas.deleteCachedChapters }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    const result = await deleteAdminCachedChapters(mangaId);
    logAdminMutation(app, "catalog.cache.chapters.delete", mangaId, result.count);
    return affected(result.count);
  });

  app.get("/admin/users", { schema: adminRouteSchemas.listUsers }, async (request) => {
    return listAdminUsers(adminPageQuerySchema.parse(request.query));
  });

  app.get("/admin/users/:userId", { schema: adminRouteSchemas.getUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return getAdminUser(userId);
  });

  app.patch("/admin/users/:userId", { schema: adminRouteSchemas.updateUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    const result = await updateAdminUser(userId, updateProfileSchema.parse(request.body));
    logAdminMutation(app, "users.update", userId, 1);
    return result;
  });

  app.post("/admin/users/:userId/sessions/revoke", { schema: adminRouteSchemas.revokeUserSessions }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    const result = await revokeAdminUserSessions(userId);
    logAdminMutation(app, "users.sessions.revoke", userId, result.count);
    return affected(result.count);
  });

  app.delete("/admin/users/:userId", { schema: adminRouteSchemas.deleteUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    const result = await deleteAdminUser(userId);
    logAdminMutation(app, "users.delete", userId, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/library", { schema: adminRouteSchemas.listUserLibrary }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserLibrary(userId, adminPageQuerySchema.parse(request.query));
  });

  app.patch("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.updateUserLibrary }, async (request) => {
    const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
    const result = await upsertAdminUserLibrary(userId, mangaId, adminLibraryBodySchema.parse(request.body));
    logAdminMutation(app, "users.library.upsert", `${userId}:${mangaId}`, 1);
    return result;
  });

  app.delete("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.deleteUserLibrary }, async (request) => {
    const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
    const result = await deleteAdminUserLibrary(userId, mangaId);
    logAdminMutation(app, "users.library.delete", `${userId}:${mangaId}`, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/progress", { schema: adminRouteSchemas.listUserProgress }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserProgress(userId, adminProgressQuerySchema.parse(request.query));
  });

  app.patch("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.updateUserProgress }, async (request) => {
    const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
    const result = await upsertAdminUserProgress(userId, chapterId, adminProgressBodySchema.parse(request.body));
    logAdminMutation(app, "users.progress.upsert", `${userId}:${chapterId}`, 1);
    return result;
  });

  app.delete("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.deleteUserProgress }, async (request) => {
    const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
    const result = await deleteAdminUserProgress(userId, chapterId);
    logAdminMutation(app, "users.progress.delete", `${userId}:${chapterId}`, result.count);
    return affected(result.count);
  });

  app.get("/admin/users/:userId/search-history", { schema: adminRouteSchemas.listUserSearchHistory }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserSearchHistory(userId, adminPageQuerySchema.parse(request.query));
  });

  app.delete("/admin/users/:userId/search-history", { schema: adminRouteSchemas.clearUserSearchHistory }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    const result = await clearAdminUserSearchHistory(userId);
    logAdminMutation(app, "users.search-history.delete", userId, result.count);
    return affected(result.count);
  });
}

function affected(count: number) {
  return { ok: true as const, summary: { affectedCount: count } };
}

function logAdminMutation(app: FastifyInstance, action: string, targetId: string, affectedCount: number) {
  app.log.info({ action, targetId, affectedCount }, "Admin mutation completed");
}
