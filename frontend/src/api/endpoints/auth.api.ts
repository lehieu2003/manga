import type { User } from "@/types";
import { refreshSession, request } from "../interceptors/auth.interceptor";

export const authApi = {
  register(input: { email: string; password: string; displayName: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  login(input: { email: string; password: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  me() {
    return request<{ user: User }>("/me");
  },
  refresh() {
    return refreshSession();
  },
  logout(refreshToken: string) {
    return request<{ ok: true }>(
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      },
      false
    );
  },
  updateMe(input: { displayName?: string; avatarUrl?: string | null }) {
    return request<{ user: User }>("/me", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/me/password", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }
};
