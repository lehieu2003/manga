import { adminApi, clearAdminToken, getAdminToken, setAdminToken } from "./endpoints/admin.api";
import { authApi } from "./endpoints/auth.api";
import { catalogApi } from "./endpoints/catalog.api";
import { libraryApi } from "./endpoints/library.api";
import { progressApi } from "./endpoints/progress.api";
import { API_ORIGIN, clearTokens, getAccessToken, getAuthTokenSnapshot, getRefreshToken, setTokens, subscribeAuthTokens } from "./interceptors/auth.interceptor";

export { clearTokens, getAccessToken, getAuthTokenSnapshot, getRefreshToken, setTokens, subscribeAuthTokens };
export { clearAdminToken, getAdminToken, setAdminToken };

export const api = {
  admin: adminApi,
  ...authApi,
  ...catalogApi,
  ...libraryApi,
  ...progressApi
};

export function assetUrl(url: string | undefined) {
  if (!url) return undefined;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return url;
}
