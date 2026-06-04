import type { FastifyInstance } from "fastify";
import { HttpError } from "../../../shared/errors/http-error.js";
import { hashPassword, hashToken, issueTokenPair, revokeUserRefreshSessions, rotateRefreshToken, verifyPassword } from "../../../domain/services/auth.service.js";
import { userRepository, refreshSessionRepository } from "../../../domain/repositories/index.js";
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema, updateProfileSchema } from "../../validators/auth.validator.js";

function publicUser(user: { id: string; email: string; displayName: string; avatarUrl: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await userRepository.findByEmail(body.email);
    if (existing) {
      throw new HttpError(409, "Email is already registered", "EMAIL_EXISTS");
    }

    const user = await userRepository.create({
      email: body.email,
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName
    });

    const tokens = await issueTokenPair(app, user);
    return reply.code(201).send({ user: publicUser(user), ...tokens });
  });

  app.post("/auth/login", async (request) => {
    const body = loginSchema.parse(request.body);
    const user = await userRepository.findByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const tokens = await issueTokenPair(app, user);
    return { user: publicUser(user), ...tokens };
  });

  app.post("/auth/refresh", async (request) => {
    const body = refreshSchema.parse(request.body);
    const payload = await rotateRefreshToken(app, body.refreshToken);
    return { ...payload, user: publicUser(payload.user) };
  });

  app.post("/auth/logout", async (request) => {
    const body = refreshSchema.parse(request.body);
    await refreshSessionRepository.revokeByTokenHash(hashToken(body.refreshToken));
    return { ok: true };
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const user = await userRepository.findByIdOrThrow(request.user.sub);
    return { user: publicUser(user) };
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request) => {
    const body = updateProfileSchema.parse(request.body);
    if (body.displayName === undefined && body.avatarUrl === undefined) {
      throw new HttpError(400, "At least one profile field is required", "EMPTY_PROFILE_UPDATE");
    }

    const user = await userRepository.updateProfile(request.user.sub, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {})
    });
    return { user: publicUser(user) };
  });

  app.put("/me/password", { preHandler: app.authenticate }, async (request) => {
    const body = changePasswordSchema.parse(request.body);
    const user = await userRepository.findByIdOrThrow(request.user.sub);
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new HttpError(401, "Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }

    const updatedUser = await userRepository.updatePassword(user.id, await hashPassword(body.newPassword));
    await revokeUserRefreshSessions(updatedUser.id);
    const tokens = await issueTokenPair(app, updatedUser);
    return { user: publicUser(updatedUser), ...tokens };
  });
}
