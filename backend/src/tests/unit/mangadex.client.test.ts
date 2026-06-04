import { describe, expect, it } from "vitest";
import { applyMangaSort } from "../../infrastructure/mangadex/mangadex.client.js";

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
