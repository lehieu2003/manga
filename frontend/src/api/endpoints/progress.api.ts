import type { MangaProgressPayload } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const progressApi = {
  getMangaProgress(mangaId: string) {
    return request<MangaProgressPayload>(`/progress/manga/${mangaId}`);
  },
  saveProgress(chapterId: string, input: { mangaId: string; pageIndex: number; completed: boolean }) {
    return request(`/progress/${chapterId}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }
};
