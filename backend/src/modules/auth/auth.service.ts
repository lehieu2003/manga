import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config.js";
import { HttpError } from "../../lib/http-error.js";

const REFRESH_BYTES = 48;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken() {
  return crypto.randomBytes(REFRESH_BYTES).toString("base64url");
}

export async function issueTokenPair(app: FastifyInstance, user: { id: string; email: string }) {
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt
    }
  });

  return { accessToken, refreshToken, expiresAt };
}

export async function revokeUserRefreshSessions(userId: string) {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function rotateRefreshToken(app: FastifyInstance, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new HttpError(401, "Refresh token is invalid or expired", "INVALID_REFRESH_TOKEN");
  }

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });

  const tokens = await issueTokenPair(app, session.user);
  return { user: session.user, ...tokens };
}
