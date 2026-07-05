import type { User } from "@/types";
import { refreshSession, request } from "../interceptors/auth.interceptor";

export const authApi = {
  register(input: { email: string; password: string; displayName: string }) {
    return request<{ pendingVerification: true; email: string; expiresAt: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  verifyEmail(input: { email: string; code: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/email/verify", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  resendVerification(input: { email: string }) {
    return request<{ ok: true }>("/auth/email/verification", {
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
  exchangeFirebaseToken(input: { idToken: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/auth/firebase/exchange", {
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
  forgotPassword(input: { email: string }) {
    return request<{ ok: true }>("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  resetPassword(input: { token: string; newPassword: string }) {
    return request<{ ok: true }>("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateMe(input: { displayName?: string; avatarUrl?: string | null }) {
    return request<{ user: User }>("/me", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);
    return request<{ user: User }>("/me/avatar", {
      method: "POST",
      body: formData
    });
  },
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return request<{ user: User; accessToken: string; refreshToken: string }>("/me/password", {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }
};
