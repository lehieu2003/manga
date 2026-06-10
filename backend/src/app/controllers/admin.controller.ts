import type { FastifyBaseLogger } from "fastify";
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
import type { updateProfileSchema } from "../validators/auth.validator.js";
import type { adminLibraryBodySchema, adminPageQuerySchema, adminProgressBodySchema, adminProgressQuerySchema } from "../validators/admin.validator.js";

type AdminLibraryBody = z.infer<typeof adminLibraryBodySchema>;
type AdminPageQuery = z.infer<typeof adminPageQuerySchema>;
type AdminProgressBody = z.infer<typeof adminProgressBodySchema>;
type AdminProgressQuery = z.infer<typeof adminProgressQuerySchema>;
type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

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
