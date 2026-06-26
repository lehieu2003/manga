import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { z } from "zod";
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
} from "../../domain/services/admin.service.js";
import { updateProfileSchema } from "../validators/auth.validator.js";
import {
  adminLibraryBodySchema,
  adminMangaParamsSchema,
  adminPageQuerySchema,
  adminProgressBodySchema,
  adminProgressQuerySchema,
  adminUserChapterParamsSchema,
  adminUserMangaParamsSchema,
  adminUserParamsSchema
} from "../validators/admin.validator.js";

type AdminLibraryBody = z.infer<typeof adminLibraryBodySchema>;
type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;
type AdminProgressBody = z.infer<typeof adminProgressBodySchema>;
type AdminProgressQuery = z.infer<typeof adminProgressQuerySchema>;
type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export function handleGetAdminDashboardOverview() {
  return getAdminDashboardOverview();
}

export function handleListAdminCachedMangaPage(request: FastifyRequest) {
  return listAdminCachedMangaPage(adminPageQuerySchema.parse(request.query));
}

export function handleGetAdminCachedMangaItem(request: FastifyRequest) {
  const { mangaId } = adminMangaParamsSchema.parse(request.params);
  return getAdminCachedMangaItem(mangaId);
}

export function handleRemoveAdminCachedManga(request: FastifyRequest) {
  const { mangaId } = adminMangaParamsSchema.parse(request.params);
  return removeAdminCachedManga(request.log, mangaId);
}

export function handleRemoveAdminCachedChapters(request: FastifyRequest) {
  const { mangaId } = adminMangaParamsSchema.parse(request.params);
  return removeAdminCachedChapters(request.log, mangaId);
}

export function handleListAdminUsersPage(request: FastifyRequest) {
  return listAdminUsersPage(adminPageQuerySchema.parse(request.query));
}

export function handleGetAdminUserDetail(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return getAdminUserDetail(userId);
}

export function handleUpdateAdminUserProfile(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return updateAdminUserProfile(request.log, userId, updateProfileSchema.parse(request.body));
}

export function handleRevokeAdminUserRefreshSessions(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return revokeAdminUserRefreshSessions(request.log, userId);
}

export function handleRemoveAdminUser(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return removeAdminUser(request.log, userId);
}

export function handleListAdminUserLibraryPage(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return listAdminUserLibraryPage(userId, adminPageQuerySchema.parse(request.query));
}

export function handleUpsertAdminUserLibraryItem(request: FastifyRequest) {
  const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
  return upsertAdminUserLibraryItem(request.log, userId, mangaId, adminLibraryBodySchema.parse(request.body));
}

export function handleRemoveAdminUserLibraryItem(request: FastifyRequest) {
  const { userId, mangaId } = adminUserMangaParamsSchema.parse(request.params);
  return removeAdminUserLibraryItem(request.log, userId, mangaId);
}

export function handleListAdminUserProgressPage(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return listAdminUserProgressPage(userId, adminProgressQuerySchema.parse(request.query));
}

export function handleUpsertAdminUserProgressItem(request: FastifyRequest) {
  const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
  return upsertAdminUserProgressItem(request.log, userId, chapterId, adminProgressBodySchema.parse(request.body));
}

export function handleRemoveAdminUserProgressItem(request: FastifyRequest) {
  const { userId, chapterId } = adminUserChapterParamsSchema.parse(request.params);
  return removeAdminUserProgressItem(request.log, userId, chapterId);
}

export function handleListAdminUserSearchHistoryPage(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return listAdminUserSearchHistoryPage(userId, adminPageQuerySchema.parse(request.query));
}

export function handleClearAdminUserSearchHistoryPage(request: FastifyRequest) {
  const { userId } = adminUserParamsSchema.parse(request.params);
  return clearAdminUserSearchHistoryPage(request.log, userId);
}

export function getAdminDashboardOverview() {
  return getAdminOverview();
}

export function listAdminCachedMangaPage(query: AdminPageQuery) {
  return listAdminCachedManga(query);
}

export function getAdminCachedMangaItem(mangaId: string) {
  return getAdminCachedManga(mangaId);
}

export async function removeAdminCachedManga(logger: FastifyBaseLogger, mangaId: string) {
  const result = await deleteAdminCachedManga(mangaId);
  logAdminMutation(logger, "catalog.cache.manga.delete", mangaId, result.count);
  return affected(result.count);
}

export async function removeAdminCachedChapters(logger: FastifyBaseLogger, mangaId: string) {
  const result = await deleteAdminCachedChapters(mangaId);
  logAdminMutation(logger, "catalog.cache.chapters.delete", mangaId, result.count);
  return affected(result.count);
}

export function listAdminUsersPage(query: AdminPageQuery) {
  return listAdminUsers(query);
}

export function getAdminUserDetail(userId: string) {
  return getAdminUser(userId);
}

export async function updateAdminUserProfile(logger: FastifyBaseLogger, userId: string, input: UpdateProfileBody) {
  const result = await updateAdminUser(userId, input);
  logAdminMutation(logger, "users.update", userId, 1);
  return result;
}

export async function revokeAdminUserRefreshSessions(logger: FastifyBaseLogger, userId: string) {
  const result = await revokeAdminUserSessions(userId);
  logAdminMutation(logger, "users.sessions.revoke", userId, result.count);
  return affected(result.count);
}

export async function removeAdminUser(logger: FastifyBaseLogger, userId: string) {
  const result = await deleteAdminUser(userId);
  logAdminMutation(logger, "users.delete", userId, result.count);
  return affected(result.count);
}

export function listAdminUserLibraryPage(userId: string, query: AdminPageQuery) {
  return listAdminUserLibrary(userId, query);
}

export async function upsertAdminUserLibraryItem(logger: FastifyBaseLogger, userId: string, mangaId: string, input: AdminLibraryBody) {
  const result = await upsertAdminUserLibrary(userId, mangaId, input);
  logAdminMutation(logger, "users.library.upsert", `${userId}:${mangaId}`, 1);
  return result;
}

export async function removeAdminUserLibraryItem(logger: FastifyBaseLogger, userId: string, mangaId: string) {
  const result = await deleteAdminUserLibrary(userId, mangaId);
  logAdminMutation(logger, "users.library.delete", `${userId}:${mangaId}`, result.count);
  return affected(result.count);
}

export function listAdminUserProgressPage(userId: string, query: AdminProgressQuery) {
  return listAdminUserProgress(userId, query);
}

export async function upsertAdminUserProgressItem(logger: FastifyBaseLogger, userId: string, chapterId: string, input: AdminProgressBody) {
  const result = await upsertAdminUserProgress(userId, chapterId, input);
  logAdminMutation(logger, "users.progress.upsert", `${userId}:${chapterId}`, 1);
  return result;
}

export async function removeAdminUserProgressItem(logger: FastifyBaseLogger, userId: string, chapterId: string) {
  const result = await deleteAdminUserProgress(userId, chapterId);
  logAdminMutation(logger, "users.progress.delete", `${userId}:${chapterId}`, result.count);
  return affected(result.count);
}

export function listAdminUserSearchHistoryPage(userId: string, query: AdminPageQuery) {
  return listAdminUserSearchHistory(userId, query);
}

export async function clearAdminUserSearchHistoryPage(logger: FastifyBaseLogger, userId: string) {
  const result = await clearAdminUserSearchHistory(userId);
  logAdminMutation(logger, "users.search-history.delete", userId, result.count);
  return affected(result.count);
}

function affected(count: number) {
  return { ok: true as const, summary: { affectedCount: count } };
}

function logAdminMutation(logger: FastifyBaseLogger, action: string, targetId: string, affectedCount: number) {
  logger.info({ action, targetId, affectedCount }, "Admin mutation completed");
}
