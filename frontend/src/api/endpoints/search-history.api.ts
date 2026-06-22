import type { Paginated, SearchHistoryItem } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const searchHistoryApi = {
  getSearchHistory(input: { limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    query.set("limit", String(input.limit ?? 8));
    query.set("offset", String(input.offset ?? 0));
    return request<Paginated<SearchHistoryItem>>(`/me/search-history?${query}`);
  },
  clearSearchHistory() {
    return request<{ ok: true; summary: { affectedCount: number } }>("/me/search-history", { method: "DELETE" });
  }
};
