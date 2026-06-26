import type { FastifyInstance } from "fastify";
import {
  handleClearAdminUserSearchHistoryPage,
  handleGetAdminCachedMangaItem,
  handleGetAdminDashboardOverview,
  handleGetAdminUserDetail,
  handleListAdminCachedMangaPage,
  handleListAdminUserLibraryPage,
  handleListAdminUserProgressPage,
  handleListAdminUsersPage,
  handleListAdminUserSearchHistoryPage,
  handleRemoveAdminCachedChapters,
  handleRemoveAdminCachedManga,
  handleRemoveAdminUser,
  handleRemoveAdminUserLibraryItem,
  handleRemoveAdminUserProgressItem,
  handleRevokeAdminUserRefreshSessions,
  handleUpdateAdminUserProfile,
  handleUpsertAdminUserLibraryItem,
  handleUpsertAdminUserProgressItem
} from "../../controllers/admin.controller.js";
import { requireAdminAccess } from "../../middlewares/admin.middleware.js";
import { adminRouteSchemas } from "../../docs/route-schemas.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    await requireAdminAccess(request);
  });

  app.get("/admin/overview", { schema: adminRouteSchemas.overview }, handleGetAdminDashboardOverview);
  app.get("/admin/catalog/cache/manga", { schema: adminRouteSchemas.listCachedManga }, handleListAdminCachedMangaPage);
  app.get("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.getCachedManga }, handleGetAdminCachedMangaItem);
  app.delete("/admin/catalog/cache/manga/:mangaId", { schema: adminRouteSchemas.deleteCachedManga }, handleRemoveAdminCachedManga);
  app.delete("/admin/catalog/cache/manga/:mangaId/chapters", { schema: adminRouteSchemas.deleteCachedChapters }, handleRemoveAdminCachedChapters);
  app.get("/admin/users", { schema: adminRouteSchemas.listUsers }, handleListAdminUsersPage);
  app.get("/admin/users/:userId", { schema: adminRouteSchemas.getUser }, handleGetAdminUserDetail);
  app.patch("/admin/users/:userId", { schema: adminRouteSchemas.updateUser }, handleUpdateAdminUserProfile);
  app.post("/admin/users/:userId/sessions/revoke", { schema: adminRouteSchemas.revokeUserSessions }, handleRevokeAdminUserRefreshSessions);
  app.delete("/admin/users/:userId", { schema: adminRouteSchemas.deleteUser }, handleRemoveAdminUser);
  app.get("/admin/users/:userId/library", { schema: adminRouteSchemas.listUserLibrary }, handleListAdminUserLibraryPage);
  app.patch("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.updateUserLibrary }, handleUpsertAdminUserLibraryItem);
  app.delete("/admin/users/:userId/library/:mangaId", { schema: adminRouteSchemas.deleteUserLibrary }, handleRemoveAdminUserLibraryItem);
  app.get("/admin/users/:userId/progress", { schema: adminRouteSchemas.listUserProgress }, handleListAdminUserProgressPage);
  app.patch("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.updateUserProgress }, handleUpsertAdminUserProgressItem);
  app.delete("/admin/users/:userId/progress/:chapterId", { schema: adminRouteSchemas.deleteUserProgress }, handleRemoveAdminUserProgressItem);
  app.get("/admin/users/:userId/search-history", { schema: adminRouteSchemas.listUserSearchHistory }, handleListAdminUserSearchHistoryPage);
  app.delete("/admin/users/:userId/search-history", { schema: adminRouteSchemas.clearUserSearchHistory }, handleClearAdminUserSearchHistoryPage);
}
