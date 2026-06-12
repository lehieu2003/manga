import { describe, expect, it } from "vitest";
import { buildChatRetrievalFilters } from "../../domain/services/chat.service.js";

describe("buildChatRetrievalFilters", () => {
  it("prefers manga documents for recommendation and catalog questions", () => {
    expect(
      buildChatRetrievalFilters({
        intent: "recommendation",
        query: "completed action manga",
        filters: {},
        needsPersonalization: true
      })
    ).toMatchObject({ sourceType: "MANGA" });

    expect(
      buildChatRetrievalFilters({
        intent: "catalog_question",
        query: "school life romance",
        filters: { tags: ["School Life"] },
        needsPersonalization: false
      })
    ).toMatchObject({ sourceType: "MANGA", tags: ["School Life"] });
  });

  it("preserves explicit chapter intent and route manga context", () => {
    expect(
      buildChatRetrievalFilters(
        {
          intent: "reader_help",
          query: "latest chapter",
          filters: { sourceType: "CHAPTER" },
          needsPersonalization: true
        },
        { mangaId: "manga-1" }
      )
    ).toEqual({ sourceType: "CHAPTER", mangaId: "manga-1" });
  });

  it("does not force manga documents on reader routes", () => {
    expect(
      buildChatRetrievalFilters(
        {
          intent: "unknown",
          query: "where am I",
          filters: {},
          needsPersonalization: true
        },
        { chapterId: "chapter-1" }
      )
    ).toEqual({});
  });
});
