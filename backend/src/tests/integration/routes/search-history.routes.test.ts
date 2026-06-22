import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  searchHistoryFindMany: vi.fn(),
  searchHistoryCount: vi.fn(),
  searchHistoryDeleteMany: vi.fn()
}));

vi.mock("../../../infrastructure/database/client.js", () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    searchHistory: {
      findMany: prismaMocks.searchHistoryFindMany,
      count: prismaMocks.searchHistoryCount,
      deleteMany: prismaMocks.searchHistoryDeleteMany
    }
  }
}));

describe("searchHistoryRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists authenticated user search history", async () => {
    const app = await makeSearchHistoryApp();
    prismaMocks.searchHistoryFindMany.mockResolvedValue([
      {
        id: "history-1",
        userId: "user-1",
        query: "one punch man",
        createdAt: new Date("2024-01-02T00:00:00.000Z")
      }
    ]);
    prismaMocks.searchHistoryCount.mockResolvedValue(1);

    const response = await app.inject({ method: "GET", url: "/api/me/search-history?limit=5&offset=0" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [{ id: "history-1", userId: "user-1", query: "one punch man", createdAt: "2024-01-02T00:00:00.000Z" }],
      limit: 5,
      offset: 0,
      total: 1
    });
    expect(prismaMocks.searchHistoryFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
      skip: 0
    });
    await app.close();
  });

  it("clears only the authenticated user's search history", async () => {
    const app = await makeSearchHistoryApp();
    prismaMocks.searchHistoryDeleteMany.mockResolvedValue({ count: 3 });

    const response = await app.inject({ method: "DELETE", url: "/api/me/search-history" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, summary: { affectedCount: 3 } });
    expect(prismaMocks.searchHistoryDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    await app.close();
  });
});

async function makeSearchHistoryApp() {
  const { searchHistoryRoutes } = await import("../../../app/routes/v1/search-history.routes.js");
  const app = Fastify();
  app.decorate("authenticate", async (request) => {
    request.user = { sub: "user-1", email: "reader@example.com", role: "USER" };
  });
  await app.register(searchHistoryRoutes, { prefix: "/api" });
  return app;
}
