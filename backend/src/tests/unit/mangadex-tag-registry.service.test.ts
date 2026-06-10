import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const findMany = vi.fn();
const upsert = vi.fn();
const getMangaTags = vi.fn();

vi.mock("../../infrastructure/database/client.js", () => ({
  prisma: {
    mangaDexTag: {
      findFirst,
      findMany,
      upsert
    }
  }
}));

vi.mock("../../infrastructure/mangadex/mangadex.client.js", () => ({
  getMangaTags
}));

describe("mangadex tag registry service", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("refreshes stale tags and resolves names to MangaDex tag ids", async () => {
    const { resolveMangaDexTagFilters } = await import("../../domain/services/mangadex-tag-registry.service.js");
    findFirst.mockResolvedValue(null);
    getMangaTags.mockResolvedValue([
      { id: "391b0423-d847-456f-aff0-8b0cfc03066b", name: "Action", group: "genre", aliases: ["Hanh dong"] },
      { id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d", name: "Romance", group: "genre", aliases: [] }
    ]);
    findMany.mockResolvedValue([
      { id: "391b0423-d847-456f-aff0-8b0cfc03066b", name: "Action", group: "genre", aliases: ["Hanh dong"] },
      { id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d", name: "Romance", group: "genre", aliases: [] }
    ]);

    const result = await resolveMangaDexTagFilters({ included: ["action", "Hanh dong"], excluded: ["Romance"] });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      includedTagIds: ["391b0423-d847-456f-aff0-8b0cfc03066b"],
      excludedTagIds: ["423e2eae-a7a2-4a8b-ac03-a8351462d71d"],
      unresolvedIncluded: [],
      unresolvedExcluded: []
    });
  });

  it("passes through UUID tag filters and reports unresolved names", async () => {
    const { resolveMangaDexTagFilters } = await import("../../domain/services/mangadex-tag-registry.service.js");
    findFirst.mockResolvedValue({ fetchedAt: new Date() });
    findMany.mockResolvedValue([{ id: "423e2eae-a7a2-4a8b-ac03-a8351462d71d", name: "Romance", group: "genre", aliases: [] }]);

    const result = await resolveMangaDexTagFilters({
      included: ["391b0423-d847-456f-aff0-8b0cfc03066b", "Unknown"],
      excluded: []
    });

    expect(getMangaTags).not.toHaveBeenCalled();
    expect(result).toEqual({
      includedTagIds: ["391b0423-d847-456f-aff0-8b0cfc03066b"],
      excludedTagIds: [],
      unresolvedIncluded: ["Unknown"],
      unresolvedExcluded: []
    });
  });
});
