import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorMiddleware } from "../../../app/middlewares/error.middleware.js";

const importMangaChapters = vi.fn();
const importMangaDetail = vi.fn();
const importMangaWithChapters = vi.fn();
const syncMangaDexCatalog = vi.fn();

vi.mock("../../../shared/configs/app.config.js", () => ({
  env: {
    ADMIN_SYNC_TOKEN: "admin-sync-token",
    SYNC_LIMIT: 48
  }
}));

vi.mock("../../../domain/services/catalog-import.service.js", () => ({
  importMangaChapters,
  importMangaDetail,
  importMangaWithChapters
}));

vi.mock("../../../domain/services/catalog-sync.service.js", () => ({
  syncMangaDexCatalog
}));

describe("adminCatalogRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  async function buildTestApp() {
    const { adminCatalogRoutes } = await import("../../../app/routes/v1/admin.catalog.routes.js");
    const app = Fastify();
    app.setErrorHandler(errorMiddleware);
    await app.register(adminCatalogRoutes, { prefix: "/api" });
    return app;
  }

  it("rejects missing admin token", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/catalog/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/import"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: "ADMIN_AUTH_REQUIRED" }
    });
    expect(importMangaChapters).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects invalid admin token", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/catalog/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/import",
      headers: { "X-Admin-Token": "wrong-token" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: "ADMIN_SYNC_TOKEN_INVALID" }
    });
    expect(importMangaChapters).not.toHaveBeenCalled();

    await app.close();
  });

  it("imports chapters with a valid admin token", async () => {
    const app = await buildTestApp();
    importMangaChapters.mockResolvedValue({
      mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
      mangaSaved: false,
      chaptersFetched: 2,
      readableChaptersSaved: 2,
      zeroPageChaptersSkipped: 0,
      source: "mangadex"
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/catalog/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/import?languages=en&limit=50&offset=10",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "completed",
      summary: {
        mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
        readableChaptersSaved: 2
      }
    });
    expect(importMangaChapters).toHaveBeenCalledWith({
      mangaId: "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
      limit: 50,
      offset: 10,
      languages: ["en"]
    });

    await app.close();
  });

  it("runs a catalog sync with a valid admin token", async () => {
    const app = await buildTestApp();
    syncMangaDexCatalog.mockResolvedValue({ mangaCount: 3, cachedTotal: 12 });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/catalog/sync?q=solo&limit=3&languages=vi,en&includeChapters=true&chaptersLimit=20",
      headers: { "X-Admin-Token": "admin-sync-token" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "completed",
      summary: { mangaCount: 3, cachedTotal: 12 }
    });
    expect(syncMangaDexCatalog).toHaveBeenCalledWith({
      limit: 3,
      includeChapters: true,
      query: "solo",
      languages: ["vi", "en"],
      chaptersLimit: 20
    });

    await app.close();
  });
});
