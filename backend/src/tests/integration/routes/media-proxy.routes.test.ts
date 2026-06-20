import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { coverRoutes } from "../../../app/routes/v1/cover.routes.js";
import { pageRoutes } from "../../../app/routes/v1/page.routes.js";

describe("media proxy routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("streams cover bytes and forwards cache headers", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("image-bytes", {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "content-length": "11",
          etag: "cover-etag",
          "last-modified": "Thu, 04 Jun 2026 01:00:00 GMT"
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const app = Fastify();
    await app.register(coverRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/covers/11111111-1111-4111-8111-111111111111/cover.webp",
      headers: { "if-none-match": "old-etag" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("image-bytes");
    expect(response.headers["content-type"]).toContain("image/webp");
    expect(response.headers["content-length"]).toBe("11");
    expect(response.headers.etag).toBe("cover-etag");
    expect(response.headers["last-modified"]).toBe("Thu, 04 Jun 2026 01:00:00 GMT");
    expect(response.headers["cache-control"]).toBe("public, max-age=604800, stale-while-revalidate=86400");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/covers\/11111111-1111-4111-8111-111111111111\/cover\.webp$/),
      expect.objectContaining({
        headers: expect.objectContaining({ "if-none-match": "old-etag" })
      })
    );

    await app.close();
  });

  it("passes through not-modified responses for conditional requests", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(null, {
        status: 304,
        headers: { etag: "cover-etag" }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const app = Fastify();
    await app.register(coverRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/covers/11111111-1111-4111-8111-111111111111/cover.webp",
      headers: { "if-none-match": "cover-etag" }
    });

    expect(response.statusCode).toBe(304);
    expect(response.body).toBe("");
    expect(response.headers.etag).toBe("cover-etag");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/covers\/11111111-1111-4111-8111-111111111111\/cover\.webp$/),
      expect.objectContaining({
        headers: expect.objectContaining({ "if-none-match": "cover-etag" })
      })
    );

    await app.close();
  });

  it("falls back to the alternate MangaDex cover origin when the primary origin fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(
        new Response("fallback-image", {
          status: 200,
          headers: { "content-type": "image/jpeg" }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const app = Fastify();
    await app.register(coverRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/covers/11111111-1111-4111-8111-111111111111/cover.jpg.512.jpg"
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("fallback-image");
    expect(response.headers["content-type"]).toContain("image/jpeg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).not.toBe(fetchMock.mock.calls[1]?.[0]);

    await app.close();
  });

  it("redirects to the cover CDN when all MangaDex cover proxy attempts fail", async () => {
    const fetchMock = vi.fn(async () => new Response("bad gateway", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const app = Fastify();
    await app.register(coverRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/covers/11111111-1111-4111-8111-111111111111/missing.jpg.512.jpg"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-media-fallback"]).toBe("cover-redirect");
    expect(response.headers.location).toContain("/covers/11111111-1111-4111-8111-111111111111/missing.jpg.512.jpg");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    await app.close();
  });

  it("redirects to the MangaDex page URL when the page proxy fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            baseUrl: "https://cmdxd98sb0x3ydev.mangadex.network",
            chapter: {
              hash: "chapter-hash",
              data: ["page-1.png"],
              dataSaver: ["page-1-saver.png"]
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const app = Fastify();
    await app.register(pageRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/pages/22222222-2222-4222-8222-222222222222/data/page-1.png"
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-media-fallback"]).toBe("page-redirect");
    expect(response.headers.location).toBe("https://uploads.mangadex.org/data/chapter-hash/page-1.png");

    await app.close();
  });
});
