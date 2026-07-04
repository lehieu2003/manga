import type { User } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const URL_BASE = globalThis.location?.origin ?? "http://localhost";
export const API_ORIGIN = new URL(API_URL, URL_BASE).origin;

const ACCESS_TOKEN_KEY = "manga.accessToken";
const REFRESH_TOKEN_KEY = "manga.refreshToken";
const authTokenListeners = new Set<() => void>();

export function subscribeAuthTokens(listener: () => void) {
  authTokenListeners.add(listener);
  return () => authTokenListeners.delete(listener);
}

export function getAuthTokenSnapshot() {
  return Boolean(getAccessToken());
}

function emitAuthTokenChange() {
  for (const listener of authTokenListeners) listener();
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  emitAuthTokenChange();
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitAuthTokenChange();
}

export async function refreshSession() {
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

export async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
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
