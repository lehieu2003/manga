import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { coverRoutes } from "../../../app/routes/v1/cover.routes.js";

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
});
