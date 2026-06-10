import { afterEach, describe, expect, it, vi } from "vitest";
import { applyMangaSort, getMangaTags } from "../../infrastructure/mangadex/mangadex.client.js";

describe("applyMangaSort", () => {
  it("maps discovery sort modes to MangaDex order params", () => {
    const latest = new URLSearchParams();
    applyMangaSort(latest, "latest");
    expect(latest.get("order[latestUploadedChapter]")).toBe("desc");

    const title = new URLSearchParams();
    applyMangaSort(title, "title");
    expect(title.get("order[title]")).toBe("asc");

    const relevance = new URLSearchParams();
    applyMangaSort(relevance, "relevance");
    expect(relevance.get("order[relevance]")).toBe("desc");
    expect(relevance.get("order[followedCount]")).toBe("desc");
  });
});

describe("getMangaTags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes MangaDex tag names, groups, and aliases", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "ok",
        response: "collection",
        limit: 1,
        offset: 0,
        total: 1,
        data: [
          {
            id: "391b0423-d847-456f-aff0-8b0cfc03066b",
            type: "tag",
            attributes: {
              name: { en: "Action", vi: "Hanh dong" },
              group: "genre"
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetch);

    await expect(getMangaTags()).resolves.toEqual([
      {
        id: "391b0423-d847-456f-aff0-8b0cfc03066b",
        name: "Action",
        group: "genre",
        aliases: ["Hanh dong"]
      }
    ]);
    expect(String(fetch.mock.calls[0][0])).toMatch(/\/manga\/tag$/);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      headers: {
        Accept: "application/json",
        "User-Agent": expect.stringContaining("mangadex-reader")
      }
    });
  });
});
