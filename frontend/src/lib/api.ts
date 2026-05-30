import type { ChapterSummary, GenreSummary, LibraryItem, MangaProgressPayload, MangaSummary, Paginated, ReaderPayload, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const API_ORIGIN = new URL(API_URL).origin;
const ACCESS_TOKEN_KEY = "manga.accessToken";
const REFRESH_TOKEN_KEY = "manga.refreshToken";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("manga:auth-cleared"));
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Session expired");
  }

  const payload = (await response.json()) as { user: User; accessToken: string; refreshToken: string };
  setTokens(payload.accessToken, payload.refreshToken);
  return payload;
}

async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (response.status === 401 && allowRefresh && getRefreshToken()) {
    await refreshSession();
    return request<T>(path, options, false);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  async register(input: { email: string; password: string; displayName: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async login(input: { email: string; password: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async me() {
    return request<{ user: User }>("/me");
  },
  async refresh() {
    return refreshSession();
  },
  async searchManga(params: {
    q?: string;
    limit?: number;
    offset?: number;
    languages?: string;
    genres?: string[];
    includedTags?: string[];
    excludedTags?: string[];
    contentRating?: string[];
    status?: string[];
    year?: number;
    demographic?: string[];
    sort?: "relevance" | "latest" | "followed" | "title" | "created" | "updated";
  }) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    query.set("limit", String(params.limit ?? 24));
    query.set("offset", String(params.offset ?? 0));
    query.set("languages", params.languages ?? "vi,en");
    if (params.genres?.length) query.set("genres", params.genres.join(","));
    if (params.includedTags?.length) query.set("includedTags", params.includedTags.join(","));
    if (params.excludedTags?.length) query.set("excludedTags", params.excludedTags.join(","));
    if (params.contentRating?.length) query.set("contentRating", params.contentRating.join(","));
    if (params.status?.length) query.set("status", params.status.join(","));
    if (params.year) query.set("year", String(params.year));
    if (params.demographic?.length) query.set("demographic", params.demographic.join(","));
    if (params.sort) query.set("sort", params.sort);
    return request<Paginated<MangaSummary>>(`/manga/search?${query}`);
  },
  async getGenres() {
    return request<{ data: GenreSummary[] }>("/genres");
  },
  async getManga(id: string) {
    return request<MangaSummary>(`/manga/${id}`);
  },
  async getChapters(mangaId: string, params: { limit?: number; offset?: number; translatedLanguage?: string[] } = {}) {
    const query = new URLSearchParams();
    query.set("translatedLanguage", (params.translatedLanguage ?? ["vi", "en"]).join(","));
    query.set("limit", String(params.limit ?? 100));
    query.set("offset", String(params.offset ?? 0));
    return request<Paginated<ChapterSummary>>(`/manga/${mangaId}/chapters?${query}`);
  },
  async getReader(chapterId: string) {
    return request<ReaderPayload>(`/chapters/${chapterId}/reader`);
  },
  async getLibrary() {
    return request<{ data: LibraryItem[] }>("/library");
  },
  async getLibraryItem(mangaId: string) {
    return request<{ item: LibraryItem | null }>(`/library/${mangaId}`);
  },
  async getMangaProgress(mangaId: string) {
    return request<MangaProgressPayload>(`/progress/manga/${mangaId}`);
  },
  async upsertLibrary(mangaId: string, input: Partial<Pick<LibraryItem, "status" | "isFavorite" | "lastChapterId">>) {
    return request<{ item: LibraryItem }>(`/library/${mangaId}`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  async removeLibrary(mangaId: string) {
    return request<{ ok: true }>(`/library/${mangaId}`, {
      method: "DELETE"
    });
  },
  async saveProgress(chapterId: string, input: { mangaId: string; pageIndex: number; completed: boolean }) {
    return request(`/progress/${chapterId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }
};

export function assetUrl(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return url;
}
