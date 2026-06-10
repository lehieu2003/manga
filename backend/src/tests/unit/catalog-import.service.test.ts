import { afterEach, describe, expect, it, vi } from "vitest";

const getChapters = vi.fn();
const getManga = vi.fn();
const publish = vi.fn();
const saveChapterBatch = vi.fn();
const saveManga = vi.fn();

vi.mock("../../infrastructure/mangadex/mangadex.client.js", () => ({
  getChapters,
  getManga
}));

vi.mock("../../domain/services/catalog-cache.service.js", () => ({
  saveChapterBatch,
  saveManga
}));

vi.mock("../../domain/events/index.js", () => ({
  domainEvents: { publish }
}));

describe("catalog import service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("imports manga detail and returns a summary", async () => {
    const { importMangaDetail } = await import("../../domain/services/catalog-import.service.js");
    getManga.mockResolvedValue({
      id: "manga-1",
      title: "Manga",
      altTitles: [],
      description: "",
      tags: []
    });

    const result = await importMangaDetail("manga-1");

    expect(saveManga).toHaveBeenCalledWith(expect.objectContaining({ id: "manga-1" }));
    expect(publish).toHaveBeenCalledWith({ type: "catalog.manga_cached", mangaId: "manga-1" });
    expect(result).toEqual({
      mangaId: "manga-1",
      mangaSaved: true,
      chaptersFetched: 0,
      readableChaptersSaved: 0,
      zeroPageChaptersSkipped: 0,
      source: "mangadex"
    });
  });

  it("imports only readable chapters and reports skipped zero-page chapters", async () => {
    const { importMangaChapters } = await import("../../domain/services/catalog-import.service.js");
    getChapters.mockResolvedValue({
      limit: 100,
      offset: 0,
      total: 2,
      data: [
        { id: "chapter-1", title: "", chapter: "1", volume: null, translatedLanguage: "en", publishAt: "", pages: 24 },
        { id: "chapter-2", title: "", chapter: "2", volume: null, translatedLanguage: "en", publishAt: "", pages: 0 }
      ]
    });

    const result = await importMangaChapters({ mangaId: "manga-1", languages: ["en"], limit: 100 });

    expect(getChapters).toHaveBeenCalledWith({
      mangaId: "manga-1",
      limit: 100,
      offset: 0,
      translatedLanguage: ["en"]
    });
    expect(saveChapterBatch).toHaveBeenCalledWith("manga-1", [expect.objectContaining({ id: "chapter-1", pages: 24 })]);
    expect(publish).toHaveBeenCalledWith({
      type: "catalog.chapters_imported",
      mangaId: "manga-1",
      chaptersFetched: 2,
      readableChaptersSaved: 1,
      zeroPageChaptersSkipped: 1
    });
    expect(result).toEqual({
      mangaId: "manga-1",
      mangaSaved: false,
      chaptersFetched: 2,
      readableChaptersSaved: 1,
      zeroPageChaptersSkipped: 1,
      source: "mangadex"
    });
  });
});
