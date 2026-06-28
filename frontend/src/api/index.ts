import { adminApi, clearAdminToken, getAdminToken, setAdminToken } from "./endpoints/admin.api";
import { authApi } from "./endpoints/auth.api";
import { bookmarksApi } from "./endpoints/bookmarks.api";
import { catalogApi } from "./endpoints/catalog.api";
import { chatApi } from "./endpoints/chat.api";
import { commentsApi } from "./endpoints/comments.api";
import { libraryApi } from "./endpoints/library.api";
import { progressApi } from "./endpoints/progress.api";
import { searchHistoryApi } from "./endpoints/search-history.api";
import { socialApi } from "./endpoints/social.api";
import { API_ORIGIN, clearTokens, getAccessToken, getAuthTokenSnapshot, getRefreshToken, setTokens, subscribeAuthTokens } from "./interceptors/auth.interceptor";

export { API_ORIGIN, clearTokens, getAccessToken, getAuthTokenSnapshot, getRefreshToken, setTokens, subscribeAuthTokens };
export { clearAdminToken, getAdminToken, setAdminToken };

export const api = {
  admin: adminApi,
  ...authApi,
  ...bookmarksApi,
  ...catalogApi,
  ...chatApi,
  ...commentsApi,
  ...libraryApi,
  ...progressApi,
  ...searchHistoryApi,
  ...socialApi
};

export function assetUrl(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  const mangadexCover = url.match(/^https:\/\/uploads\.mangadex\.(?:org|dev)\/covers\/([^/]+)\/(.+)$/);
  if (mangadexCover) return `${API_ORIGIN}/api/covers/${mangadexCover[1]}/${mangadexCover[2]}`;
  return url;
}
