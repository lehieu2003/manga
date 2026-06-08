import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const chapterFindMany = vi.fn();
const chapterCount = vi.fn();
const chapterUpdateMany = vi.fn();
const mangaDexGetChapters = vi.fn();
const mangaDexGetReader = vi.fn();

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    cachedChapter: {
      findMany: chapterFindMany,
      count: chapterCount,
      updateMany: chapterUpdateMany
    },
    $transaction: async (operations: unknown[]) => Promise.all(operations)
  }
}));

vi.mock("../../../infrastructure/cache/client.js", () => ({
  redisReady: false,
  redis: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

vi.mock("../../../infrastructure/mangadex/mangadex.client.js", () => ({
  getChapters: mangaDexGetChapters,
  getManga: vi.fn(),
  getReader: mangaDexGetReader,
  searchManga: vi.fn()
}));

vi.mock("../../../domain/repositories/index.js", () => ({
  searchHistoryRepository: {
    create: vi.fn()
  }
}));

describe("catalogRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists readable cached chapters without calling MangaDex", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const app = Fastify();
    await app.register(catalogRoutes, { prefix: "/api" });

    chapterFindMany.mockResolvedValue([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Awakening",
        chapter: "1",
        volume: null,
        translatedLanguage: "en",
        publishAt: new Date("2024-01-01T00:00:00.000Z"),
        pages: 24,
        scanlationGroup: "Group A"
      }
    ]);
    chapterCount.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?translatedLanguage=vi,en&limit=100&offset=0"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pages: 24 }],
      limit: 100,
      offset: 0,
      total: 1,
      source: "db",
      needsSync: false
    });
    expect(chapterFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
          translatedLanguage: { in: ["vi", "en"] },
          pages: { gt: 0 }
        }
      })
    );
    expect(mangaDexGetChapters).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 202 needsSync when no readable cached chapters exist", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const app = Fastify();
    await app.register(catalogRoutes, { prefix: "/api" });

    chapterFindMany.mockResolvedValue([]);
    chapterCount.mockResolvedValue(0);

    const response = await app.inject({
      method: "GET",
      url: "/api/manga/32ee02ab-c8f5-4b2f-b4f4-4f8b903f720a/chapters?translatedLanguage=vi,en&limit=100&offset=0"
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      data: [],
      limit: 100,
      offset: 0,
      total: 0,
      source: "db",
      needsSync: true
    });
    expect(mangaDexGetChapters).not.toHaveBeenCalled();

    await app.close();
  });

  it("marks a cached chapter unreadable when MangaDex AtHome returns 404", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const { errorMiddleware } = await import("../../../app/middlewares/error.middleware.js");
    const { HttpError } = await import("../../../shared/errors/http-error.js");
    const app = Fastify();
    app.setErrorHandler(errorMiddleware);
    await app.register(catalogRoutes, { prefix: "/api" });
    mangaDexGetReader.mockRejectedValue(new HttpError(404, "MangaDex request failed: Not Found", "MANGADEX_ERROR"));

    const response = await app.inject({
      method: "GET",
      url: "/api/chapters/2e5d4148-0768-426d-8fe6-4433fcd4059c/reader"
    });

    expect(response.statusCode).toBe(404);
    expect(chapterUpdateMany).toHaveBeenCalledWith({
      where: { id: "2e5d4148-0768-426d-8fe6-4433fcd4059c" },
      data: expect.objectContaining({ pages: 0 })
    });

    await app.close();
  });
});
