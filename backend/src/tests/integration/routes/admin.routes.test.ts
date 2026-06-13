import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../app/middlewares/error.middleware.js";

const prismaMocks = vi.hoisted(() => ({
  userCount: vi.fn(),
  refreshCount: vi.fn(),
  mangaCount: vi.fn(),
  chapterCount: vi.fn(),
  libraryCount: vi.fn(),
  progressCount: vi.fn(),
  searchHistoryCount: vi.fn(),
  mangaFindFirst: vi.fn(),
  mangaFindMany: vi.fn(),
  mangaDeleteMany: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../../../shared/configs/app.config.js", () => ({
  env: {
    ADMIN_SYNC_TOKEN: "admin-sync-token"
  }
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    user: { count: prismaMocks.userCount },
    refreshSession: { count: prismaMocks.refreshCount },
    cachedManga: {
      count: prismaMocks.mangaCount,
      findFirst: prismaMocks.mangaFindFirst,
      findMany: prismaMocks.mangaFindMany,
      deleteMany: prismaMocks.mangaDeleteMany
    },
    cachedChapter: { count: prismaMocks.chapterCount },
    libraryItem: { count: prismaMocks.libraryCount },
    readingProgress: { count: prismaMocks.progressCount },
    searchHistory: { count: prismaMocks.searchHistoryCount },
    $transaction: prismaMocks.transaction
  }
}));

describe("adminRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing admin token", async () => {
    const app = await buildTestApp();

    const response = await app.inject({ method: "GET", url: "/api/admin/overview" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "ADMIN_AUTH_REQUIRED" } });

    await app.close();
  });

  it("returns admin overview counts", async () => {
    const app = await buildTestApp();
    prismaMocks.transaction.mockResolvedValue([12, 8, 240, 4810, 36, 92, 128, { fetchedAt: new Date("2026-06-08T10:00:00.000Z") }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/overview",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      users: 12,
      activeSessions: 8,
      cachedManga: 240,
      cachedChapters: 4810,
      libraryItems: 36,
      readingProgress: 92,
      searchHistory: 128,
      latestCatalogFetchAt: "2026-06-08T10:00:00.000Z"
    });

    await app.close();
  });

  it("deletes cached manga and returns affected count", async () => {
    const app = await buildTestApp();
    prismaMocks.mangaDeleteMany.mockResolvedValue({ count: 1 });

    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/catalog/cache/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, summary: { affectedCount: 1 } });
    expect(prismaMocks.mangaDeleteMany).toHaveBeenCalledWith({ where: { id: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0" } });

    await app.close();
  });
});

async function buildTestApp() {
  const { adminRoutes } = await import("../../../app/routes/v1/admin.routes.js");
  const app = Fastify();
  app.setErrorHandler(errorMiddleware);
  await app.register(adminRoutes, { prefix: "/api" });
  return app;
}

