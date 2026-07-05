import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { domainEvents } from '../../domain/events/index.js';
import {
  emailVerificationCodeRepository,
  passwordResetTokenRepository,
  refreshSessionRepository,
  userRepository,
} from '../../domain/repositories/index.js';
import { emailSender } from '../../infrastructure/email/index.js';
import { env } from '../../shared/configs/app.config.js';
import {
  createEmailVerificationCode,
  createPasswordResetToken,
  hashPassword,
  hashToken,
  issueTokenPair,
  revokeUserRefreshSessions,
  rotateRefreshToken,
  verifyPassword,
} from '../../domain/services/auth.service.js';
import { verifyFirebaseIdToken } from '../../domain/services/firebase-auth.service.js';
import { HttpError } from '../../shared/errors/http-error.js';
import {
  changePasswordSchema,
  firebaseExchangeSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';
import type { z } from 'zod';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type FirebaseExchangeInput = z.infer<typeof firebaseExchangeSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshInput = z.infer<typeof refreshSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

const avatarExtensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function handleRegisterUser(request: FastifyRequest, reply: FastifyReply) {
  const body = registerSchema.parse(request.body);
  return reply.code(201).send(await registerUser(body));
}

export async function handleLoginUser(request: FastifyRequest) {
  const body = loginSchema.parse(request.body);
  return loginUser(request.server, body);
}

export async function handleFirebaseExchange(request: FastifyRequest) {
  const body = firebaseExchangeSchema.parse(request.body);
  return exchangeFirebaseToken(request.server, body);
}

export async function handleRefreshAuthToken(request: FastifyRequest) {
  const body = refreshSchema.parse(request.body);
  return refreshAuthToken(request.server, body);
}

export async function handleLogoutUser(request: FastifyRequest) {
  const body = refreshSchema.parse(request.body);
  return logoutUser(body);
}

export async function handleVerifyEmail(request: FastifyRequest) {
  const body = verifyEmailSchema.parse(request.body);
  return verifyEmail(request.server, body);
}

export async function handleResendEmailVerification(request: FastifyRequest) {
  const body = resendVerificationSchema.parse(request.body);
  return resendEmailVerification(body);
}

export async function handleRequestPasswordReset(request: FastifyRequest) {
  const body = forgotPasswordSchema.parse(request.body);
  return requestPasswordReset(body);
}

export async function handleResetPassword(request: FastifyRequest) {
  const body = resetPasswordSchema.parse(request.body);
  return resetPassword(body);
}

export async function handleGetCurrentUser(request: FastifyRequest) {
  return getCurrentUser(request.user.sub);
}

export async function handleUpdateCurrentUser(request: FastifyRequest) {
  const body = updateProfileSchema.parse(request.body);
  return updateCurrentUser(request.user.sub, body);
}

export async function handleUploadCurrentUserAvatar(request: FastifyRequest) {
  const file = await request.file();
  return uploadCurrentUserAvatar(
    request.user.sub,
    file,
    getRequestOrigin(request.headers),
  );
}

export async function handleChangeCurrentUserPassword(request: FastifyRequest) {
  const body = changePasswordSchema.parse(request.body);
  return changeCurrentUserPassword(request.server, request.user.sub, body);
}

function publicUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  passwordHash?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash),
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    if (existing.emailVerifiedAt) {
      throw new HttpError(409, 'Email is already registered', 'EMAIL_EXISTS');
    }
    const verification = await sendEmailVerificationCode(existing);
    return { pendingVerification: true, email: existing.email, expiresAt: verification.expiresAt };
  }

  const user = await userRepository.create({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    displayName: input.displayName,
    emailVerifiedAt: null,
  });

  const verification = await sendEmailVerificationCode(user);
  await domainEvents.publish({ type: 'auth.user_registered', userId: user.id });
  return { pendingVerification: true, email: user.email, expiresAt: verification.expiresAt };
}

export async function loginUser(app: FastifyInstance, input: LoginInput) {
  const user = await userRepository.findByEmail(input.email);

  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS',
    );
  }

  if (!user.emailVerifiedAt) {
    throw new HttpError(
      403,
      'Email verification is required before login',
      'EMAIL_NOT_VERIFIED',
    );
  }

  const tokens = await issueTokenPair(app, user);

  await domainEvents.publish({
    type: 'auth.user_logged_in',
    userId: user.id,
  });
  return { user: publicUser(user), ...tokens };
}

export async function exchangeFirebaseToken(
  app: FastifyInstance,
  input: FirebaseExchangeInput,
) {
  const identity = await verifyFirebaseIdToken(input.idToken);
  let user = await userRepository.findByFirebaseUid(identity.uid);

  if (!user) {
    if (!identity.emailVerified) {
      throw new HttpError(
        403,
        'Google account email must be verified before login',
        'FIREBASE_EMAIL_NOT_VERIFIED',
      );
    }

    const existing = await userRepository.findByEmail(identity.email);
    if (existing) {
      if (existing.firebaseUid && existing.firebaseUid !== identity.uid) {
        throw new HttpError(
          409,
          'Email is already linked to another Firebase account',
          'FIREBASE_EMAIL_LINK_CONFLICT',
        );
      }

      user = await userRepository.linkFirebaseUid(existing.id, {
        firebaseUid: identity.uid,
        ...(existing.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
      });
    } else {
      user = await userRepository.create({
        email: identity.email,
        passwordHash: null,
        firebaseUid: identity.uid,
        displayName: displayNameFromFirebase(identity.displayName, identity.email),
        avatarUrl: identity.picture,
        emailVerifiedAt: new Date(),
      });
      await domainEvents.publish({ type: 'auth.user_registered', userId: user.id });
    }
  }

  const tokens = await issueTokenPair(app, user);
  await domainEvents.publish({
    type: 'auth.user_logged_in',
    userId: user.id,
  });
  return { user: publicUser(user), ...tokens };
}

export async function refreshAuthToken(
  app: FastifyInstance,
  input: RefreshInput,
) {
  const payload = await rotateRefreshToken(app, input.refreshToken);
  await domainEvents.publish({
    type: 'auth.refresh_token_rotated',
    userId: payload.user.id,
  });
  return { ...payload, user: publicUser(payload.user) };
}

export async function logoutUser(input: RefreshInput) {
  const tokenHash = hashToken(input.refreshToken);
  await refreshSessionRepository.revokeByTokenHash(tokenHash);
  await domainEvents.publish({ type: 'auth.user_logged_out', tokenHash });
  return { ok: true };
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await userRepository.findByEmail(input.email);
  if (!user) return { ok: true };

  await passwordResetTokenRepository.markUserTokensUsed(user.id);
  const token = createPasswordResetToken();
  const expiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_TOKEN_MINUTES * 60 * 1000,
  );

  await passwordResetTokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  await emailSender.sendPasswordResetEmail({
    to: user.email,
    displayName: user.displayName,
    resetUrl: `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`,
    expiresAt,
  });
  await domainEvents.publish({
    type: 'auth.password_reset_requested',
    userId: user.id,
  });
  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const resetToken =
    await passwordResetTokenRepository.findActiveByTokenHash(tokenHash);

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= new Date()
  ) {
    throw new HttpError(
      400,
      'Password reset link is invalid or expired',
      'INVALID_PASSWORD_RESET_TOKEN',
    );
  }

  const consumed = await passwordResetTokenRepository.markUsed(resetToken.id);
  if (consumed.count !== 1) {
    throw new HttpError(
      400,
      'Password reset link is invalid or expired',
      'INVALID_PASSWORD_RESET_TOKEN',
    );
  }

  await userRepository.updatePassword(
    resetToken.userId,
    await hashPassword(input.newPassword),
  );
  await revokeUserRefreshSessions(resetToken.userId);
  await domainEvents.publish({
    type: 'auth.password_reset_completed',
    userId: resetToken.userId,
  });
  return { ok: true };
}

export async function verifyEmail(app: FastifyInstance, input: VerifyEmailInput) {
  const user = await userRepository.findByEmail(input.email);
  if (!user) {
    throw new HttpError(400, 'Verification code is invalid or expired', 'INVALID_EMAIL_VERIFICATION_CODE');
  }
  if (user.emailVerifiedAt) {
    const tokens = await issueTokenPair(app, user);
    return { user: publicUser(user), ...tokens };
  }

  const verification = await emailVerificationCodeRepository.findLatestByUserId(user.id);
  if (!verification || verification.expiresAt <= new Date() || verification.codeHash !== hashToken(input.code)) {
    throw new HttpError(400, 'Verification code is invalid or expired', 'INVALID_EMAIL_VERIFICATION_CODE');
  }

  const consumed = await emailVerificationCodeRepository.markUsed(verification.id);
  if (consumed.count !== 1) {
    throw new HttpError(400, 'Verification code is invalid or expired', 'INVALID_EMAIL_VERIFICATION_CODE');
  }

  const verifiedUser = await userRepository.markEmailVerified(user.id);
  const tokens = await issueTokenPair(app, verifiedUser);
  await domainEvents.publish({ type: 'auth.email_verified', userId: verifiedUser.id });
  return { user: publicUser(verifiedUser), ...tokens };
}

export async function resendEmailVerification(input: ResendVerificationInput) {
  const user = await userRepository.findByEmail(input.email);
  if (!user || user.emailVerifiedAt) return { ok: true };
  await sendEmailVerificationCode(user);
  await domainEvents.publish({ type: 'auth.email_verification_requested', userId: user.id });
  return { ok: true };
}

export async function getCurrentUser(userId: string) {
  const user = await userRepository.findByIdOrThrow(userId);
  return { user: publicUser(user) };
}

export async function updateCurrentUser(
  userId: string,
  input: UpdateProfileInput,
) {
  if (input.displayName === undefined && input.avatarUrl === undefined) {
    throw new HttpError(
      400,
      'At least one profile field is required',
      'EMPTY_PROFILE_UPDATE',
    );
  }

  const user = await userRepository.updateProfile(userId, {
    ...(input.displayName !== undefined
      ? { displayName: input.displayName }
      : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });
  await domainEvents.publish({ type: 'auth.profile_updated', userId: user.id });
  return { user: publicUser(user) };
}

export async function uploadCurrentUserAvatar(
  userId: string,
  file: MultipartFile | undefined,
  requestOrigin: string,
) {
  if (!file) {
    throw new HttpError(400, 'Avatar file is required', 'AVATAR_FILE_REQUIRED');
  }

  const extension = avatarExtensions.get(file.mimetype);
  if (!extension) {
    file.file.resume();
    throw new HttpError(
      400,
      'Avatar must be a JPEG, PNG, WebP, or GIF image',
      'INVALID_AVATAR_TYPE',
    );
  }

  const avatarDir = resolve(env.UPLOAD_DIR, 'avatars');
  await mkdir(avatarDir, { recursive: true });
  const fileName = `${userId}-${Date.now()}-${randomUUID()}.${extension}`;
  const filePath = join(avatarDir, fileName);

  await pipeline(file.file, createWriteStream(filePath));

  const uploadBaseUrl = (env.PUBLIC_UPLOAD_BASE_URL ?? `${requestOrigin.replace(/\/$/, '')}/uploads`).replace(/\/$/, '');
  const avatarUrl = `${uploadBaseUrl}/avatars/${encodeURIComponent(fileName)}`;
  const user = await userRepository.updateProfile(userId, { avatarUrl });
  await domainEvents.publish({ type: 'auth.profile_updated', userId: user.id });
  return { user: publicUser(user) };
}

export async function changeCurrentUserPassword(
  app: FastifyInstance,
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await userRepository.findByIdOrThrow(userId);
  if (!user.passwordHash) {
    throw new HttpError(
      400,
      'This account uses Google sign-in and does not have a local password',
      'LOCAL_PASSWORD_UNAVAILABLE',
    );
  }
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(
      401,
      'Current password is incorrect',
      'INVALID_CURRENT_PASSWORD',
    );
  }

  const updatedUser = await userRepository.updatePassword(
    user.id,
    await hashPassword(input.newPassword),
  );
  await revokeUserRefreshSessions(updatedUser.id);
  const tokens = await issueTokenPair(app, updatedUser);
  await domainEvents.publish({
    type: 'auth.password_changed',
    userId: updatedUser.id,
  });
  return { user: publicUser(updatedUser), ...tokens };
}

async function sendEmailVerificationCode(user: { id: string; email: string; displayName: string }) {
  await emailVerificationCodeRepository.markUserCodesUsed(user.id);
  const code = createEmailVerificationCode();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_CODE_MINUTES * 60 * 1000);
  await emailVerificationCodeRepository.create({
    userId: user.id,
    codeHash: hashToken(code),
    expiresAt,
  });
  await emailSender.sendEmailVerificationOtp({
    to: user.email,
    displayName: user.displayName,
    code,
    expiresAt,
  });
  return { expiresAt };
}

function displayNameFromFirebase(displayName: string | null, email: string) {
  const trimmed = displayName?.trim();
  if (trimmed && trimmed.length >= 2) return trimmed.slice(0, 40);
  return email.split('@')[0]?.slice(0, 40) || 'Manga Reader';
}

function getRequestOrigin(headers: { host?: string; ['x-forwarded-proto']?: string | string[] }) {
  const protoHeader = headers['x-forwarded-proto'];
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  return `${protocol ?? 'http'}://${headers.host ?? 'localhost:4000'}`;
}
