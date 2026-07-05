import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(40)
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export const firebaseExchangeSchema = z.object({
  idToken: z.string().min(20)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  avatarUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().url().max(500).nullable().optional()
  )
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase())
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8).max(128)
});

export const verifyEmailSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{6}$/)
});

export const resendVerificationSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase())
});
