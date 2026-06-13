import type { FastifyInstance } from "fastify";
import {
  clearAdminUserSearchHistoryPage,
  getAdminCachedMangaItem,
  getAdminDashboardOverview,
  getAdminUserDetail,
  listAdminCachedMangaPage,
  listAdminUserLibraryPage,
  listAdminUserProgressPage,
  listAdminUsersPage,
  listAdminUserSearchHistoryPage,
  removeAdminCachedChapters,
  removeAdminCachedManga,
  removeAdminUser,
  removeAdminUserLibraryItem,
  removeAdminUserProgressItem,
  revokeAdminUserRefreshSessions,
  updateAdminUserProfile,
  upsertAdminUserLibraryItem,
  upsertAdminUserProgressItem
} from "../../controllers/admin.controller.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";
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
    await requireAdminAccess(request);
  });

  app.get("/admin/overview", { schema: adminRouteSchemas.overview }, async () => getAdminDashboardOverview());

  app.get("/admin/catalog/cache/manga", { schema: adminRouteSchemas.listCachedManga }, async (request) => {
    return listAdminCachedMangaPage(adminPageQuerySchema.parse(request.query));
  });

  app.get("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.getCachedManga }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    return getAdminCachedMangaItem(mangaId);
  });

  app.delete("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.deleteCachedManga }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    return removeAdminCachedManga(app.log, mangaId);
  });

  app.delete("/admin/catalog/cache/manga/:mangaId/chapters", { schema: adminRouteSchemas.deleteCachedChapters }, async (request) => {
    const { mangaId } = adminMangaParamsSchema.parse(request.params);
    return removeAdminCachedChapters(app.log, mangaId);
  });

  app.get("/admin/users", { schema: adminRouteSchemas.listUsers }, async (request) => {
    return listAdminUsersPage(adminPageQuerySchema.parse(request.query));
  });

  app.get("/admin/users/:userId", { schema: adminRouteSchemas.getUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return getAdminUserDetail(userId);
  });

  app.patch("/admin/users/:userId", { schema: adminRouteSchemas.updateUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return updateAdminUserProfile(app.log, userId, updateProfileSchema.parse(request.body));
  });

  app.post("/admin/users/:userId/sessions/revoke", { schema: adminRouteSchemas.revokeUserSessions }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return revokeAdminUserRefreshSessions(app.log, userId);
  });

  app.delete("/admin/users/:userId", { schema: adminRouteSchemas.deleteUser }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return removeAdminUser(app.log, userId);
  });

  app.get("/admin/users/:userId/library", { schema: adminRouteSchemas.listUserLibrary }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserLibraryPage(userId, adminPageQuerySchema.parse(request.query));
  });

  app.patch("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.updateUserLibrary }, async (request) => {
    const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
    return upsertAdminUserLibraryItem(app.log, userId, mangaId, adminLibraryBodySchema.parse(request.body));
  });

  app.delete("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.deleteUserLibrary }, async (request) => {
    const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
    return removeAdminUserLibraryItem(app.log, userId, mangaId);
  });

  app.get("/admin/users/:userId/progress", { schema: adminRouteSchemas.listUserProgress }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserProgressPage(userId, adminProgressQuerySchema.parse(request.query));
  });

  app.patch("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.updateUserProgress }, async (request) => {
    const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
    return upsertAdminUserProgressItem(app.log, userId, chapterId, adminProgressBodySchema.parse(request.body));
  });

  app.delete("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.deleteUserProgress }, async (request) => {
    const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
    return removeAdminUserProgressItem(app.log, userId, chapterId);
  });

  app.get("/admin/users/:userId/search-history", { schema: adminRouteSchemas.listUserSearchHistory }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return listAdminUserSearchHistoryPage(userId, adminPageQuerySchema.parse(request.query));
  });

  app.delete("/admin/users/:userId/search-history", { schema: adminRouteSchemas.clearUserSearchHistory }, async (request) => {
    const { userId } = adminUserParamsSchema.parse(request.params);
    return clearAdminUserSearchHistoryPage(app.log, userId);
  });
}
