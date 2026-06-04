import type { LibraryItem } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const libraryApi = {
  getLibrary() {
    return request<{ data: LibraryItem[] }>("/library");
  },
  getLibraryItem(mangaId: string) {
    return request<{ item: LibraryItem | null }>(`/library/${mangaId}`);
  },
  upsertLibrary(mangaId: string, input: Partial<Pick<LibraryItem, "status" | "isFavorite" | "lastChapterId">>) {
    return request<{ item: LibraryItem }>(`/library/${mangaId}`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  removeLibrary(mangaId: string) {
    return request<{ ok: true }>(`/library/${mangaId}`, {
      method: "DELETE"
    });
  }
};
