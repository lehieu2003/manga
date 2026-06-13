import type { FastifyInstance } from 'fastify';
import { domainEvents } from '../../domain/events/index.js';
import {
  refreshSessionRepository,
  userRepository,
} from '../../domain/repositories/index.js';
import {
  hashPassword,
  hashToken,
  issueTokenPair,
  revokeUserRefreshSessions,
  rotateRefreshToken,
  verifyPassword,
} from '../../domain/services/auth.service.js';
import { HttpError } from '../../shared/errors/http-error.js';
import type {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';
import type { z } from 'zod';

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshInput = z.infer<typeof refreshSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

function publicUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  avatarUrl: string | null;
  createdAt: Date;
}) {
  const { id, email, displayName, role, avatarUrl, createdAt } = user;
  console.log(`Public user data for ID ${id}:`, {
    id,
    email,
    displayName,
    role,
    avatarUrl,
    createdAt,
  });
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function registerUser(app: FastifyInstance, input: RegisterInput) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw new HttpError(409, 'Email is already registered', 'EMAIL_EXISTS');
  }

  const user = await userRepository.create({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    displayName: input.displayName,
  });

  const tokens = await issueTokenPair(app, user);
  await domainEvents.publish({ type: 'auth.user_registered', userId: user.id });
  return { user: publicUser(user), ...tokens };
}

export async function loginUser(app: FastifyInstance, input: LoginInput) {
  const user = await userRepository.findByEmail(input.email);

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new HttpError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS',
    );
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

export async function changeCurrentUserPassword(
  app: FastifyInstance,
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await userRepository.findByIdOrThrow(userId);
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
