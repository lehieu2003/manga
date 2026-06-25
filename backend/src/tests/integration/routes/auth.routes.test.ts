import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../../../shared/errors/http-error.js";
import { hashPassword, hashToken } from "../../../domain/services/auth.service.js";

const prismaMocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  emailVerificationCreate: vi.fn(),
  emailVerificationFindFirst: vi.fn(),
  emailVerificationUpdateMany: vi.fn(),
  refreshUpdateMany: vi.fn(),
  refreshCreate: vi.fn(),
  passwordResetCreate: vi.fn(),
  passwordResetFindUnique: vi.fn(),
  passwordResetUpdate: vi.fn(),
  passwordResetUpdateMany: vi.fn()
}));

const emailMocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerificationOtp: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    user: {
      findUnique: prismaMocks.userFindUnique,
      findUniqueOrThrow: prismaMocks.userFindUniqueOrThrow,
      create: prismaMocks.userCreate,
      update: prismaMocks.userUpdate
    },
    emailVerificationCode: {
      create: prismaMocks.emailVerificationCreate,
      findFirst: prismaMocks.emailVerificationFindFirst,
      updateMany: prismaMocks.emailVerificationUpdateMany
    },
    refreshSession: {
      updateMany: prismaMocks.refreshUpdateMany,
      create: prismaMocks.refreshCreate
    },
    passwordResetToken: {
      create: prismaMocks.passwordResetCreate,
      findUnique: prismaMocks.passwordResetFindUnique,
      update: prismaMocks.passwordResetUpdate,
      updateMany: prismaMocks.passwordResetUpdateMany
    }
  }
}));

vi.mock("../../../infrastructure/email/index.js", () => ({
  emailSender: {
    sendPasswordResetEmail: emailMocks.sendPasswordResetEmail,
    sendEmailVerificationOtp: emailMocks.sendEmailVerificationOtp
  }
}));

describe("auth account routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("registers a new account as pending verification and sends an OTP", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUnique.mockResolvedValue(null);
    prismaMocks.userCreate.mockResolvedValue(makeUser({ emailVerifiedAt: null }));
    prismaMocks.emailVerificationUpdateMany.mockResolvedValue({ count: 0 });
    prismaMocks.emailVerificationCreate.mockResolvedValue({});
    emailMocks.sendEmailVerificationOtp.mockResolvedValue(undefined);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "reader@example.com", password: "password-1", displayName: "Reader" }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ pendingVerification: true, email: "reader@example.com" });
    expect(prismaMocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: "reader@example.com",
        passwordHash: expect.any(String),
        displayName: "Reader",
        emailVerifiedAt: null
      }
    });
    expect(emailMocks.sendEmailVerificationOtp).toHaveBeenCalledWith({
      to: "reader@example.com",
      displayName: "Reader",
      code: expect.stringMatching(/^\d{6}$/),
      expiresAt: expect.any(Date)
    });
    await app.close();
  });

  it("rejects login until email is verified", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUnique.mockResolvedValue(makeUser({ passwordHash: await hashPassword("password-1"), emailVerifiedAt: null }));

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "reader@example.com", password: "password-1" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: "EMAIL_NOT_VERIFIED" } });
    expect(prismaMocks.refreshCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("verifies an email OTP and returns fresh tokens", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUnique.mockResolvedValue(makeUser({ emailVerifiedAt: null }));
    prismaMocks.emailVerificationFindFirst.mockResolvedValue({
      id: "otp-1",
      userId: "user-1",
      codeHash: hashToken("123456"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date()
    });
    prismaMocks.emailVerificationUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.userUpdate.mockResolvedValue(makeUser({ emailVerifiedAt: new Date("2024-01-01T00:00:00.000Z") }));
    prismaMocks.refreshCreate.mockResolvedValue({});

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/email/verify",
      payload: { email: "reader@example.com", code: "123456" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { id: "user-1" }, accessToken: "access-token" });
    expect(prismaMocks.emailVerificationUpdateMany).toHaveBeenCalledWith({
      where: { id: "otp-1", usedAt: null },
      data: { usedAt: expect.any(Date) }
    });
    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerifiedAt: expect.any(Date) }
    });
    expect(prismaMocks.refreshCreate).toHaveBeenCalled();
    await app.close();
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

  it("uploads the authenticated user's avatar image", async () => {
    const app = await makeAuthApp();
    const updatedUser = makeUser({ avatarUrl: "http://api.test/uploads/avatars/user-1-avatar.png" });
    prismaMocks.userUpdate.mockResolvedValue(updatedUser);

    const response = await app.inject({
      method: "POST",
      url: "/api/me/avatar",
      headers: {
        host: "api.test",
        "content-type": `multipart/form-data; boundary=${multipartBoundary}`
      },
      payload: multipartPayload({
        contentType: "image/png",
        fileName: "avatar.png",
        body: "avatar-bytes"
      })
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { avatarUrl: "http://api.test/uploads/avatars/user-1-avatar.png" } });
    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarUrl: expect.stringMatching(/^http:\/\/api\.test\/uploads\/avatars\/user-1-\d+-[a-f0-9-]+\.png$/) }
    });
    await app.close();
  });

  it("rejects avatar uploads that are not images", async () => {
    const app = await makeAuthApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/me/avatar",
      headers: {
        host: "api.test",
        "content-type": `multipart/form-data; boundary=${multipartBoundary}`
      },
      payload: multipartPayload({
        contentType: "text/plain",
        fileName: "avatar.txt",
        body: "not-an-image"
      })
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "INVALID_AVATAR_TYPE" } });
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

  it("returns generic success when requesting reset for an unknown email", async () => {
    const app = await makeAuthApp();
    prismaMocks.userFindUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/password/forgot",
      payload: { email: "missing@example.com" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(prismaMocks.passwordResetCreate).not.toHaveBeenCalled();
    await app.close();
  });

  it("creates a one-time reset token for an existing user", async () => {
    const app = await makeAuthApp();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    prismaMocks.userFindUnique.mockResolvedValue(makeUser());
    prismaMocks.passwordResetUpdateMany.mockResolvedValue({ count: 0 });
    prismaMocks.passwordResetCreate.mockResolvedValue({});
    emailMocks.sendPasswordResetEmail.mockResolvedValue(undefined);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/password/forgot",
      payload: { email: "reader@example.com" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(prismaMocks.passwordResetUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: expect.any(Date) }
    });
    expect(prismaMocks.passwordResetCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date)
      }
    });
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "reader@example.com",
      displayName: "Reader",
      resetUrl: expect.stringContaining("/reset-password?token="),
      expiresAt: expect.any(Date)
    });
    await app.close();
  });

  it("rejects invalid or expired reset tokens", async () => {
    const app = await makeAuthApp();
    prismaMocks.passwordResetFindUnique.mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/password/reset",
      payload: { token: "reset-token-long-enough", newPassword: "new-password-1" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: "INVALID_PASSWORD_RESET_TOKEN" } });
    expect(prismaMocks.userUpdate).not.toHaveBeenCalled();
    await app.close();
  });

  it("resets password, marks token used, and revokes sessions", async () => {
    const app = await makeAuthApp();
    prismaMocks.passwordResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      tokenHash: hashToken("reset-token-long-enough"),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
      user: makeUser()
    });
    prismaMocks.userUpdate.mockResolvedValue(makeUser({ passwordHash: "new-hash" }));
    prismaMocks.passwordResetUpdateMany.mockResolvedValue({ count: 1 });
    prismaMocks.refreshUpdateMany.mockResolvedValue({ count: 2 });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/password/reset",
      payload: { token: "reset-token-long-enough", newPassword: "new-password-1" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(prismaMocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: expect.any(String) }
    });
    expect(prismaMocks.passwordResetUpdateMany).toHaveBeenCalledWith({
      where: { id: "reset-1", usedAt: null },
      data: { usedAt: expect.any(Date) }
    });
    expect(prismaMocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
    await app.close();
  });
});

async function makeAuthApp() {
  const { authRoutes } = await import("../../../app/routes/v1/auth.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: "user-1", email: "reader@example.com", role: "USER" };
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
  await app.register(multipart);
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
    role: "USER" | "ADMIN";
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  } = {
    id: "user-1",
    email: "reader@example.com",
    passwordHash: "hash",
    displayName: "Reader",
    role: "USER",
    avatarUrl: null,
    emailVerifiedAt: new Date("2024-01-01T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z")
  };
  return user;
}

const multipartBoundary = "avatar-boundary";

function multipartPayload(input: { fileName: string; contentType: string; body: string }) {
  return Buffer.from(
    [
      `--${multipartBoundary}`,
      `Content-Disposition: form-data; name="avatar"; filename="${input.fileName}"`,
      `Content-Type: ${input.contentType}`,
      "",
      input.body,
      `--${multipartBoundary}--`,
      ""
    ].join("\r\n")
  );
}
