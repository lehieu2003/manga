import { describe, expect, it } from "vitest";
import { makeCacheKey } from "../src/lib/cache.js";

describe("makeCacheKey", () => {
  it("creates stable cache keys independent of property order", () => {
    expect(makeCacheKey("search", { q: "one", limit: 10 })).toEqual(makeCacheKey("search", { limit: 10, q: "one" }));
  });
});
