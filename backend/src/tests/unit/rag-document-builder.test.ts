import { describe, expect, it } from "vitest";
import { buildChapterRagDocument, buildMangaRagDocument } from "../../domain/services/rag-document-builder.service.js";

describe("RAG document builder", () => {
  it("builds stable manga document content and hash from cached metadata", () => {
    const manga = {
      id: "manga-1",
      title: "Bloom Shelf",
      altTitles: [{ en: "Bloom Shelf" }, { ja: "Flower Reader" }],
      description: "A quiet school romance about reading clubs.",
      status: "completed",
      year: 2024,
      contentRating: "safe",
      tags: ["Romance", "School Life"],
      authors: ["A. Author"],
      artists: ["B. Artist"],
      chapters: [
        {
          id: "chapter-1",
          title: "First page",
          chapter: "1",
          volume: null,
          translatedLanguage: "en",
          publishAt: new Date("2024-01-01T00:00:00.000Z"),
          pages: 24,
          scanlationGroup: null
        }
      ]
    };

    const first = buildMangaRagDocument(manga);
    const second = buildMangaRagDocument(manga);

    expect(first).toEqual(second);
    expect(first.content).toContain("Title: Bloom Shelf");
    expect(first.content).toContain("Tags: Romance, School Life");
    expect(first.metadata).toMatchObject({ status: "completed", readableChapters: 1 });
  });

  it("builds chapter metadata documents without page content claims", () => {
    const document = buildChapterRagDocument({
      mangaTitle: "Bloom Shelf",
      mangaId: "manga-1",
      chapter: {
        id: "chapter-1",
        title: "First page",
        chapter: "1",
        volume: "1",
        translatedLanguage: "en",
        publishAt: new Date("2024-01-01T00:00:00.000Z"),
        pages: 24,
        scanlationGroup: "Readers"
      }
    });

    expect(document.sourceType).toBe("CHAPTER");
    expect(document.parentSourceId).toBe("manga-1");
    expect(document.content).toContain("Manga: Bloom Shelf");
    expect(document.content).not.toContain("summary");
  });
});
