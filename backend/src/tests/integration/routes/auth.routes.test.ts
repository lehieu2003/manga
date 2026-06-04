import Fastify from "fastify";
import { ZodError } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../../shared/errors/http-error.js";
import { hashPassword, hashToken } from "../../../domain/services/auth.service.js";

const prismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userUpdate: vi.fn(),
  refreshUpdateMany: vi.fn(),
  refreshCreate: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    user: {
      findUnique: prismaMocks.userFindUnique,
      findUniqueOrThrow: prismaMocks.userFindUniqueOrThrow,
      update: prismaMocks.userUpdate
    },
    refreshSession: {
      updateMany: prismaMocks.refreshUpdateMany,
      create: prismaMocks.refreshCreate
    }
  }
}));

describe("auth account routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("updates the authenticated user's display name and avatar URL", async () => {
    const app = await makeAuthApp();
    const updatedUser = makeUser({ displayName: "Shelf Keeper", avatarUrl: "https://example.com/avatar.png" });
    prismaMocks.userUpdate.mockResolvedValue(updatedUser);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/me",
      payload: { displayName: "Shelf Keeper", avatarUrl: "https://example.com/avatar.png" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { displayName: "Shelf Keeper", avatarUrl: "https://example.com/avatar.png" } });
    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { displayName: "Shelf Keeper", avatarUrl: "https://example.com/avatar.png" }
    });
    await app.close();
  });

  it("rejects an invalid avatar URL", async () => {
    const app = await makeAuthApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/me",
      payload: { avatarUrl: "not-a-url" }
    });

    expect(response.statusCode).toBe(400);
    expect(prismaMocks.userUpdate).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects password change when the current password is wrong", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUniqueOrThrow.mockResolvedValue(makeUser({ passwordHash: await hashPassword("correct-password") }));

    const response = await app.inject({
      method: "PUT",
      url: "/api/me/password",
      payload: { currentPassword: "wrong-password", newPassword: "new-password-1" }
    });

    expect(response.statusCode).toBe(401);
    expect(prismaMocks.userUpdate).not.toHaveBeenCalled();
    await app.close();
  });

  it("changes password, revokes old refresh sessions, and returns fresh tokens", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUniqueOrThrow.mockResolvedValue(makeUser({ passwordHash: await hashPassword("correct-password") }));
    prismaMocks.userUpdate.mockResolvedValue(makeUser({ passwordHash: "new-hash" }));
    prismaMocks.refreshUpdateMany.mockResolvedValue({ count: 2 });
    prismaMocks.refreshCreate.mockResolvedValue({});

    const response = await app.inject({
      method: "PUT",
      url: "/api/me/password",
      payload: { currentPassword: "correct-password", newPassword: "new-password-1" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { id: "user-1" }, accessToken: "access-token" });
    expect(response.json().refreshToken).toEqual(expect.any(String));
    expect(prismaMocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    expect(prismaMocks.refreshCreate).toHaveBeenCalled();
    await app.close();
  });

  it("revokes logout refresh token and tolerates repeated logout", async () => {
    const app = await makeAuthApp();
    prismaMocks.refreshUpdateMany.mockResolvedValue({ count: 0 });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      payload: { refreshToken: "refresh-token-long-enough" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(prismaMocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken("refresh-token-long-enough"), revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    await app.close();
  });
});

async function makeAuthApp() {
  const { authRoutes } = await import("../../../app/routes/v1/auth.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: "user-1", email: "reader@example.com" };
  });
  app.decorate("jwt", { sign: () => "access-token" } as never);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Request validation failed" } });
    if (error instanceof HttpError) return reply.code(error.statusCode).send({ error: { message: error.message, code: error.code } });
    if (isStatusError(error)) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: typeof error.code === "string" ? error.code : "REQUEST_ERROR", message: typeof error.message === "string" ? error.message : "Request error" } });
    }
    return reply.code(500).send({ error: { code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unexpected server error" } });
  });
  await app.register(authRoutes, { prefix: "/api" });
  return app;
}

function isStatusError(error: unknown): error is { statusCode: number; code?: unknown; message?: unknown } {
  return typeof error === "object" && error !== null && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number";
}

function makeUser(overrides: Partial<ReturnType<typeof makeBaseUser>> = {}) {
  return { ...makeBaseUser(), ...overrides };
}

function makeBaseUser() {
  const user: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: Date;
  } = {
    id: "user-1",
    email: "reader@example.com",
    passwordHash: "hash",
    displayName: "Reader",
    avatarUrl: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z")
  };
  return user;
}
