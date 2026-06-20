import type { Bookmark, BookmarkListResponse } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const bookmarksApi = {
  getBookmarks(params: { limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 50));
    query.set("offset", String(params.offset ?? 0));
    return request<BookmarkListResponse>(`/bookmarks?${query}`);
  },
  getChapterBookmark(chapterId: string) {
    return request<{ bookmark: Bookmark | null }>(`/bookmarks/chapter/${chapterId}`);
  },
  createBookmark(input: { mangaId: string; chapterId: string; pageIndex: number; note?: string | null; isFavorite?: boolean }) {
    return request<{ bookmark: Bookmark }>("/bookmarks", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateBookmark(id: string, input: Partial<Pick<Bookmark, "pageIndex" | "note" | "isFavorite">>) {
    return request<{ bookmark: Bookmark }>(`/bookmarks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  removeBookmark(id: string) {
    return request<{ ok: true }>(`/bookmarks/${id}`, {
      method: "DELETE"
    });
  }
};
