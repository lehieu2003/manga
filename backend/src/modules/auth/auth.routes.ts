import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { hashPassword, hashToken, issueTokenPair, rotateRefreshToken, verifyPassword } from "./auth.service.js";

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(40)
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

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
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new HttpError(409, "Email is already registered", "EMAIL_EXISTS");
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        displayName: body.displayName
      }
    });

    const tokens = await issueTokenPair(app, user);
    return reply.code(201).send({ user: publicUser(user), ...tokens });
  });

  app.post("/auth/login", async (request) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
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
    await prisma.refreshSession.updateMany({
      where: { tokenHash: hashToken(body.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { ok: true };
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } });
    return { user: publicUser(user) };
  });
}
