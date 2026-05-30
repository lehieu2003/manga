import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findUnique = vi.fn();

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    readingProgress: {
      findMany
    },
    cachedChapter: {
      findUnique
    }
  }
}));

describe("progressRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns latest manga progress and all chapter progress for the authenticated user", async () => {
    const { progressRoutes } = await import("./progress.routes.js");
    const app = Fastify();
    app.decorate("authenticate", async (request) => {
      request.user = { sub: "user-1", email: "reader@example.com" };
    });
    await app.register(progressRoutes, { prefix: "/api" });

    findMany.mockResolvedValue([
      { id: "progress-2", userId: "user-1", mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0", chapterId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", pageIndex: 16, completed: false },
      { id: "progress-1", userId: "user-1", mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0", chapterId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", pageIndex: 31, completed: true }
    ]);
    findUnique.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      title: "Current Turn",
      chapter: "53",
      volume: null,
      translatedLanguage: "en",
      publishAt: new Date("2024-01-01T00:00:00.000Z"),
      pages: 32,
      scanlationGroup: "Group A"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/progress/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      progress: { id: "progress-2", userId: "user-1" },
      chaptersProgress: [{ id: "progress-2" }, { id: "progress-1" }],
      chapter: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", chapter: "53", pages: 32 }
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0" },
      orderBy: { updatedAt: "desc" }
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } });

    await app.close();
  });
});
