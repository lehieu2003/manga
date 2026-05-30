import { describe, expect, it } from "vitest";
import { countGenres } from "./catalog-cache.service.js";

describe("countGenres", () => {
  it("counts cached manga tags and sorts by popularity", () => {
    const result = countGenres([
      { tags: ["Action", "Comedy"] },
      { tags: ["Action", "Romance"] },
      { tags: ["Fantasy"] }
    ]);

    expect(result).toEqual([
      { name: "Action", count: 2 },
      { name: "Comedy", count: 1 },
      { name: "Fantasy", count: 1 },
      { name: "Romance", count: 1 }
    ]);
  });
});
