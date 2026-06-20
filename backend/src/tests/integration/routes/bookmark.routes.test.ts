import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  bookmarkFindMany: vi.fn(),
  bookmarkCount: vi.fn(),
  bookmarkFindUnique: vi.fn(),
  bookmarkUpsert: vi.fn(),
  bookmarkFindFirst: vi.fn(),
  bookmarkUpdate: vi.fn(),
  bookmarkDeleteMany: vi.fn(),
  cachedMangaFindMany: vi.fn(),
  cachedChapterFindMany: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    bookmark: {
      findMany: prismaMocks.bookmarkFindMany,
      count: prismaMocks.bookmarkCount,
      findUnique: prismaMocks.bookmarkFindUnique,
      upsert: prismaMocks.bookmarkUpsert,
      findFirst: prismaMocks.bookmarkFindFirst,
      update: prismaMocks.bookmarkUpdate,
      deleteMany: prismaMocks.bookmarkDeleteMany
    },
    cachedManga: {
      findMany: prismaMocks.cachedMangaFindMany
    },
    cachedChapter: {
      findMany: prismaMocks.cachedChapterFindMany
    }
  }
}));

describe("bookmarkRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists authenticated user bookmarks with cached metadata", async () => {
    const app = await makeBookmarkApp();
    prismaMocks.bookmarkFindMany.mockResolvedValue([makeBookmark()]);
    prismaMocks.bookmarkCount.mockResolvedValue(1);
    prismaMocks.cachedMangaFindMany.mockResolvedValue([
      {
        id: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
        title: "Chainsaw Man",
        coverUrl: "https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/cover.jpg",
        status: "ongoing",
        year: 2024,
        tags: ["Action"]
      }
    ]);
    prismaMocks.cachedChapterFindMany.mockResolvedValue([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        title: "Dog and Chainsaw",
        chapter: "1",
        volume: null,
        translatedLanguage: "en",
        pages: 20,
        scanlationGroup: "Group A"
      }
    ]);

    const response = await app.inject({ method: "GET", url: "/api/bookmarks?limit=10&offset=0" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: [
        {
          id: "bookmark-1",
          manga: { title: "Chainsaw Man", coverUrl: "/api/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/cover.jpg" },
          chapter: { chapter: "1", pages: 20 }
        }
      ],
      limit: 10,
      offset: 0,
      total: 1
    });
    expect(prismaMocks.bookmarkFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 10,
      skip: 0
    });
    await app.close();
  });

  it("upserts duplicate chapter bookmarks for the authenticated user", async () => {
    const app = await makeBookmarkApp();
    prismaMocks.bookmarkUpsert.mockResolvedValue(makeBookmark({ pageIndex: 7 }));

    const response = await app.inject({
      method: "POST",
      url: "/api/bookmarks",
      payload: {
        mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
        chapterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        pageIndex: 7
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ bookmark: { id: "bookmark-1", pageIndex: 7 } });
    expect(prismaMocks.bookmarkUpsert).toHaveBeenCalledWith({
      where: { userId_chapterId: { userId: "user-1", chapterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } },
      create: {
        userId: "user-1",
        mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
        chapterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        pageIndex: 7,
        note: undefined,
        isFavorite: false
      },
      update: {
        mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
        pageIndex: 7,
        note: undefined,
        isFavorite: false
      }
    });
    await app.close();
  });
});

async function makeBookmarkApp() {
  const { bookmarkRoutes } = await import("../../../app/routes/v1/bookmark.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: "user-1", email: "reader@example.com", role: "USER" };
  });
  await app.register(bookmarkRoutes, { prefix: "/api" });
  return app;
}

function makeBookmark(input: Partial<ReturnType<typeof makeBookmarkBase>> = {}) {
  return { ...makeBookmarkBase(), ...input };
}

function makeBookmarkBase() {
  return {
    id: "bookmark-1",
    userId: "user-1",
    mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
    chapterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    pageIndex: 4,
    note: null,
    isFavorite: false,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z")
  };
}
