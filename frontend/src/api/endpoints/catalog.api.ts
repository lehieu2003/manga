import type { ChapterSummary, GenreSummary, MangaSummary, Paginated, ReaderPayload } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const catalogApi = {
  searchManga(params: {
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
    author?: string;
    artist?: string;
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
    if (params.author?.trim()) query.set("author", params.author.trim());
    if (params.artist?.trim()) query.set("artist", params.artist.trim());
    if (params.sort) query.set("sort", params.sort);
    return request<Paginated<MangaSummary>>(`/manga/search?${query}`);
  },
  getGenres() {
    return request<{ data: GenreSummary[] }>("/genres");
  },
  getManga(id: string) {
    return request<MangaSummary>(`/manga/${id}`);
  },
  getChapters(mangaId: string, params: { limit?: number; offset?: number; translatedLanguage?: string[]; q?: string } = {}) {
    const query = new URLSearchParams();
    query.set("translatedLanguage", (params.translatedLanguage ?? ["vi", "en"]).join(","));
    query.set("limit", String(params.limit ?? 100));
    query.set("offset", String(params.offset ?? 0));
    if (params.q?.trim()) query.set("q", params.q.trim());
    return request<Paginated<ChapterSummary>>(`/manga/${mangaId}/chapters?${query}`);
  },
  getReader(chapterId: string) {
    return request<ReaderPayload>(`/chapters/${chapterId}/reader`);
  }
};
