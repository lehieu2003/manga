import { afterEach, describe, expect, it, vi } from "vitest";

describe("media URL helpers", () => {
  const originalMediaBaseUrl = process.env.PUBLIC_MEDIA_BASE_URL;

  afterEach(() => {
    vi.resetModules();
    if (originalMediaBaseUrl === undefined) {
      delete process.env.PUBLIC_MEDIA_BASE_URL;
    } else {
      process.env.PUBLIC_MEDIA_BASE_URL = originalMediaBaseUrl;
    }
  });

  it("returns relative media proxy URLs by default", async () => {
    delete process.env.PUBLIC_MEDIA_BASE_URL;
    const { buildPageProxyUrl, normalizeCoverProxyUrl } = await import("../../shared/utils/media-url.js");

    expect(buildPageProxyUrl("11111111-1111-4111-8111-111111111111", "data-saver", "page-1.jpg")).toBe(
      "/api/pages/11111111-1111-4111-8111-111111111111/data-saver/page-1.jpg"
    );
    expect(normalizeCoverProxyUrl("https://uploads.mangadex.org/covers/11111111-1111-4111-8111-111111111111/cover.512.jpg")).toBe(
      "/api/covers/11111111-1111-4111-8111-111111111111/cover.512.jpg"
    );
    expect(normalizeCoverProxyUrl("https://uploads.mangadex.dev/covers/11111111-1111-4111-8111-111111111111/cover.512.jpg")).toBe(
      "/api/covers/11111111-1111-4111-8111-111111111111/cover.512.jpg"
    );
  });

  it("returns absolute media proxy URLs when a public media base URL is configured", async () => {
    process.env.PUBLIC_MEDIA_BASE_URL = "https://media.example.com/";
    const { buildPageProxyUrl, normalizeCoverProxyUrl } = await import("../../shared/utils/media-url.js");

    expect(buildPageProxyUrl("11111111-1111-4111-8111-111111111111", "data", "page-1.jpg")).toBe(
      "https://media.example.com/api/pages/11111111-1111-4111-8111-111111111111/data/page-1.jpg"
    );
    expect(normalizeCoverProxyUrl("/api/covers/11111111-1111-4111-8111-111111111111/cover.webp")).toBe(
      "https://media.example.com/api/covers/11111111-1111-4111-8111-111111111111/cover.webp"
    );
  });
});
