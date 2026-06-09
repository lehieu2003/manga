import type {
  AdminCacheMangaDetail,
  AdminCacheMangaRow,
  AdminOverview,
  AdminSearchHistoryRow,
  AdminUser,
  AdminUserLibraryRow,
  AdminUserProgressRow,
  CatalogImportResponse,
  CatalogSyncResponse,
  Paginated
} from "@/types";
import { API_ORIGIN } from "../interceptors/auth.interceptor";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const ADMIN_TOKEN_KEY = "manga.adminToken";

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Admin-Token": token } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function paginationQuery(input: { query?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  query.set("limit", String(input.limit ?? 25));
  query.set("offset", String(input.offset ?? 0));
  if (input.query?.trim()) query.set("query", input.query.trim());
  return query;
}

export const adminApi = {
  getOverview() {
    return adminRequest<AdminOverview>("/admin/overview");
  },
  syncCatalog(input: { q?: string; limit: number; languages: string; includeChapters: boolean; chaptersLimit: number }) {
    const query = new URLSearchParams();
    if (input.q?.trim()) query.set("q", input.q.trim());
    query.set("limit", String(input.limit));
    query.set("languages", input.languages);
    query.set("includeChapters", String(input.includeChapters));
    query.set("chaptersLimit", String(input.chaptersLimit));
    return adminRequest<CatalogSyncResponse>(`/admin/catalog/sync?${query}`, { method: "POST" });
  },
  importManga(input: { mangaId: string; includeChapters: boolean; languages: string; chaptersLimit: number }) {
    const query = new URLSearchParams();
    query.set("includeChapters", String(input.includeChapters));
    query.set("languages", input.languages);
    query.set("chaptersLimit", String(input.chaptersLimit));
    return adminRequest<CatalogImportResponse>(`/admin/catalog/manga/${input.mangaId}/import?${query}`, { method: "POST" });
  },
  importChapters(input: { mangaId: string; languages: string; limit: number; offset: number }) {
    const query = new URLSearchParams();
    query.set("languages", input.languages);
    query.set("limit", String(input.limit));
    query.set("offset", String(input.offset));
    return adminRequest<CatalogImportResponse>(`/admin/catalog/manga/${input.mangaId}/chapters/import?${query}`, { method: "POST" });
  },
  listCachedManga(input: { query?: string; limit?: number; offset?: number } = {}) {
    return adminRequest<Paginated<AdminCacheMangaRow>>(`/admin/catalog/cache/manga?${paginationQuery(input)}`);
  },
  getCachedManga(mangaId: string) {
    return adminRequest<{ manga: AdminCacheMangaDetail | null }>(`/admin/catalog/cache/manga/${mangaId}`);
  },
  deleteCachedManga(mangaId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/catalog/cache/manga/${mangaId}`, { method: "DELETE" });
  },
  deleteCachedChapters(mangaId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/catalog/cache/manga/${mangaId}/chapters`, { method: "DELETE" });
  },
  listUsers(input: { query?: string; limit?: number; offset?: number } = {}) {
    return adminRequest<Paginated<AdminUser>>(`/admin/users?${paginationQuery(input)}`);
  },
  getUser(userId: string) {
    return adminRequest<{ user: AdminUser | null }>(`/admin/users/${userId}`);
  },
  updateUser(userId: string, input: { displayName?: string; avatarUrl?: string | null }) {
    return adminRequest<{ user: AdminUser }>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  revokeUserSessions(userId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/users/${userId}/sessions/revoke`, { method: "POST" });
  },
  deleteUser(userId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/users/${userId}`, { method: "DELETE" });
  },
  listUserLibrary(userId: string, input: { limit?: number; offset?: number } = {}) {
    return adminRequest<Paginated<AdminUserLibraryRow>>(`/admin/users/${userId}/library?${paginationQuery(input)}`);
  },
  updateUserLibrary(userId: string, mangaId: string, input: { status?: string; isFavorite?: boolean; lastChapterId?: string | null }) {
    return adminRequest<{ item: AdminUserLibraryRow }>(`/admin/users/${userId}/library/${mangaId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteUserLibrary(userId: string, mangaId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/users/${userId}/library/${mangaId}`, { method: "DELETE" });
  },
  listUserProgress(userId: string, input: { mangaId?: string; limit?: number; offset?: number } = {}) {
    const query = paginationQuery(input);
    if (input.mangaId) query.set("mangaId", input.mangaId);
    return adminRequest<Paginated<AdminUserProgressRow>>(`/admin/users/${userId}/progress?${query}`);
  },
  updateUserProgress(userId: string, chapterId: string, input: { mangaId: string; pageIndex: number; completed: boolean }) {
    return adminRequest<{ progress: AdminUserProgressRow }>(`/admin/users/${userId}/progress/${chapterId}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteUserProgress(userId: string, chapterId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/users/${userId}/progress/${chapterId}`, { method: "DELETE" });
  },
  listUserSearchHistory(userId: string, input: { limit?: number; offset?: number } = {}) {
    return adminRequest<Paginated<AdminSearchHistoryRow>>(`/admin/users/${userId}/search-history?${paginationQuery(input)}`);
  },
  clearUserSearchHistory(userId: string) {
    return adminRequest<{ ok: true; summary: { affectedCount: number } }>(`/admin/users/${userId}/search-history`, { method: "DELETE" });
  },
  adminAssetUrl(url: string | undefined | null) {
    if (!url) return undefined;
    if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
    return url;
  }
};
