import { describe, expect, it } from "vitest";
import { assetUrl } from "@/api";

describe("assetUrl", () => {
  it("routes direct MangaDex cover URLs through the backend proxy", () => {
    expect(assetUrl("https://uploads.mangadex.dev/covers/manga-1/cover.jpg.512.jpg")).toBe(
      "http://localhost:4000/api/covers/manga-1/cover.jpg.512.jpg"
    );
  });

  it("keeps non-MangaDex absolute URLs unchanged", () => {
    expect(assetUrl("https://example.com/image.jpg")).toBe("https://example.com/image.jpg");
  });
});
