import { afterEach, describe, expect, it, vi } from "vitest";
import { applyMangaSort, getMangaTags, searchManga, searchMangaCreators } from "../../infrastructure/mangadex/mangadex.client.js";

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

describe("searchManga creators", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes authorOrArtist ids and requests creator relationships", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "ok",
        response: "collection",
        limit: 24,
        offset: 0,
        total: 0,
        data: []
      })
    });
    vi.stubGlobal("fetch", fetch);

    await searchManga({
      limit: 24,
      offset: 0,
      languages: ["en"],
      tags: [],
      authorOrArtist: ["b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f"]
    });

    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.searchParams.getAll("authorOrArtist[]")).toEqual(["b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f"]);
    expect(url.searchParams.getAll("includes[]")).toEqual(["cover_art", "author", "artist"]);
  });

  it("searches MangaDex creators by name", async () => {
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
            id: "b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f",
            type: "author",
            attributes: { name: "ONE" }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetch);

    await expect(searchMangaCreators({ q: "ONE", limit: 10 })).resolves.toEqual([{ id: "b5e3d267-6c88-4b61-8f1a-59f45a7a0f0f", name: "ONE" }]);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toBe("/author");
    expect(url.searchParams.get("name")).toBe("ONE");
  });
});
