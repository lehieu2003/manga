import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../app/middlewares/error.middleware.js";

const adminRagMocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  listDocuments: vi.fn(),
  reindex: vi.fn()
}));

vi.mock("../../../shared/configs/app.config.js", () => ({
  env: {
    ADMIN_SYNC_TOKEN: "admin-sync-token"
  }
}));

vi.mock("../../../domain/services/admin-rag.service.js", () => ({
  getAdminRagStatus: adminRagMocks.getStatus,
  listAdminRagDocuments: adminRagMocks.listDocuments,
  reindexAdminRagCatalog: adminRagMocks.reindex
}));

describe("adminRagRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing admin token", async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: "GET", url: "/api/admin/rag/status" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "ADMIN_AUTH_REQUIRED" } });

    await app.close();
  });

  it("returns RAG status", async () => {
    const app = await buildTestApp();
    adminRagMocks.getStatus.mockResolvedValue({
      cached: { manga: 100, chapters: 2500 },
      ragDocuments: { total: 120, manga: 100, chapter: 20, latestIndexedAt: "2026-06-12T00:00:00.000Z", embeddingModel: "text-embedding-3-small" },
      chat: { activeConversations: 5, messages: 42 },
      coverage: { mangaIndexed: 1, chapterIndexed: 0.008 }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/rag/status",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      cached: { manga: 100, chapters: 2500 },
      ragDocuments: { total: 120, manga: 100, chapter: 20 },
      chat: { activeConversations: 5, messages: 42 },
      coverage: { mangaIndexed: 1, chapterIndexed: 0.008 }
    });

    await app.close();
  });

  it("accepts an admin JWT session", async () => {
    const app = await buildTestApp("ADMIN");
    adminRagMocks.getStatus.mockResolvedValue({
      cached: { manga: 1, chapters: 0 },
      ragDocuments: { total: 1, manga: 1, chapter: 0, latestIndexedAt: null, embeddingModel: null },
      chat: { activeConversations: 0, messages: 0 },
      coverage: { mangaIndexed: 1, chapterIndexed: 0 }
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/rag/status",
      headers: { authorization: "Bearer admin-token" }
    });

    expect(response.statusCode).toBe(200);

    await app.close();
  });

  it("rejects a non-admin JWT session", async () => {
    const app = await buildTestApp("USER");

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/rag/status",
      headers: { authorization: "Bearer user-token" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: "ADMIN_ROLE_REQUIRED" } });

    await app.close();
  });

  it("lists RAG documents with filters", async () => {
    const app = await buildTestApp();
    adminRagMocks.listDocuments.mockResolvedValue({ data: [], limit: 10, offset: 20, total: 0 });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/rag/documents?sourceType=MANGA&q=solo&limit=10&offset=20",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(adminRagMocks.listDocuments).toHaveBeenCalledWith({ sourceType: "MANGA", q: "solo", limit: 10, offset: 20 });
    expect(response.json()).toEqual({ data: [], limit: 10, offset: 20, total: 0 });

    await app.close();
  });

  it("runs synchronous reindex", async () => {
    const app = await buildTestApp();
    adminRagMocks.reindex.mockResolvedValue({ status: "completed", summary: { created: 2, updated: 1, skipped: 3, failed: 0 }, durationMs: 1234 });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/rag/reindex",
      headers: { "X-Admin-Token": "admin-sync-token" },
      payload: { limit: 50, chapters: true }
    });

    expect(response.statusCode).toBe(200);
    expect(adminRagMocks.reindex).toHaveBeenCalledWith({ limit: 50, chapters: true });
    expect(response.json()).toEqual({ status: "completed", summary: { created: 2, updated: 1, skipped: 3, failed: 0 }, durationMs: 1234 });

    await app.close();
  });
});

async function buildTestApp(role?: "USER" | "ADMIN") {
  const { adminRagRoutes } = await import("../../../app/routes/v1/admin-rag.routes.js");
  const app = Fastify({ logger: false });
  if (role) {
    app.decorateRequest("jwtVerify", async function (this: { user: unknown }) {
      this.user = { sub: "user-1", email: "reader@example.com", role };
    });
  }
  app.setErrorHandler(errorMiddleware);
  await app.register(adminRagRoutes, { prefix: "/api" });
  return app;
}
