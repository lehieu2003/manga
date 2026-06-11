import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const chapterFindMany = vi.fn();
const chapterCount = vi.fn();
const chapterUpdateMany = vi.fn();
const mangaUpsert = vi.fn();
const tagFindFirst = vi.fn();
const tagFindMany = vi.fn();
const tagUpsert = vi.fn();
const mangaDexGetChapters = vi.fn();
const mangaDexGetReader = vi.fn();
const mangaDexGetTags = vi.fn();
const mangaDexSearch = vi.fn();
const mangaDexSearchCreators = vi.fn();

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    cachedChapter: {
      findMany: chapterFindMany,
      count: chapterCount,
      updateMany: chapterUpdateMany
    },
    cachedManga: {
      upsert: mangaUpsert
    },
    mangaDexTag: {
      findFirst: tagFindFirst,
      findMany: tagFindMany,
      upsert: tagUpsert
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
  getMangaTags: mangaDexGetTags,
  getManga: vi.fn(),
  getReader: mangaDexGetReader,
  searchManga: mangaDexSearch,
  searchMangaCreators: mangaDexSearchCreators
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

  it("searches cached chapters by server-side query", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const app = Fastify();
    await app.register(catalogRoutes, { prefix: "/api" });

    chapterFindMany.mockResolvedValue([
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Jump Target",
        chapter: "123",
        volume: null,
        translatedLanguage: "en",
        publishAt: new Date("2024-02-01T00:00:00.000Z"),
        pages: 24,
        scanlationGroup: "Group D"
      }
    ]);
    chapterCount.mockResolvedValue(1);

    const response = await app.inject({
      method: "GET",
      url: "/api/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?translatedLanguage=vi,en&limit=100&offset=0&q=jump"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", title: "Jump Target" }],
      total: 1,
      source: "db"
    });
    expect(chapterFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { chapter: { contains: "jump", mode: "insensitive" } },
            { title: { contains: "jump", mode: "insensitive" } },
            { scanlationGroup: { contains: "jump", mode: "insensitive" } }
          ]
        })
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

  it("maps genre names through the MangaDex tag registry before live search", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const app = Fastify();
    await app.register(catalogRoutes, { prefix: "/api" });

    tagFindFirst.mockResolvedValue({ fetchedAt: new Date() });
    tagFindMany.mockResolvedValue([{ id: "391b0423-d847-456f-aff0-8b0cfc03066b", name: "Action", group: "genre", aliases: [] }]);
    mangaDexSearch.mockResolvedValue({
      limit: 24,
      offset: 0,
      total: 1,
      data: [
        {
          id: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
          title: "Action Manga",
          altTitles: [],
          description: "",
          tags: ["Action"],
          authors: [],
          artists: []
        }
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/manga/search?genre=Action&limit=24&offset=0"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ source: "live", total: 1 });
    expect(mangaDexSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["391b0423-d847-456f-aff0-8b0cfc03066b"],
        includedTags: ["391b0423-d847-456f-aff0-8b0cfc03066b"]
      })
    );
    expect(mangaUpsert).toHaveBeenCalled();

    await app.close();
  });

  it("resolves author names to MangaDex creator ids before live search", async () => {
    const { catalogRoutes } = await import("../../../app/routes/v1/catalog.routes.js");
    const app = Fastify();
    await app.register(catalogRoutes, { prefix: "/api" });

    mangaDexSearchCreators.mockResolvedValue([{ id: "b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f", name: "ONE" }]);
    mangaDexSearch.mockResolvedValue({
      limit: 24,
      offset: 0,
      total: 1,
      data: [
        {
          id: "a96676e5-8ae2-425e-b549-7f15dd34a6d8",
          title: "One Punch-Man",
          altTitles: [],
          description: "",
          tags: ["Action"],
          authors: ["ONE"],
          artists: ["Yusuke Murata"]
        }
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/manga/search?author=ONE&limit=24&offset=0"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ source: "live", total: 1 });
    expect(mangaDexSearchCreators).toHaveBeenCalledWith({ q: "ONE", limit: 10 });
    expect(mangaDexSearch).toHaveBeenCalledWith(expect.objectContaining({ authorOrArtist: ["b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f"] }));

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
