import { afterEach, describe, expect, it, vi } from "vitest";
import { getReader } from "../../infrastructure/mangadex/mangadex.client.js";

describe("getReader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns local backend page proxy URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            baseUrl: "https://uploads.mangadex.dev",
            chapter: {
              hash: "hash",
              data: ["page-1.jpg"],
              dataSaver: ["page-1-saver.jpg"]
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );

    const reader = await getReader("1b9986f8-1f73-4d6d-8d1c-c4331c8c5f24");

    expect(reader.pageUrls).toEqual(["/api/pages/1b9986f8-1f73-4d6d-8d1c-c4331c8c5f24/data/page-1.jpg"]);
    expect(reader.dataSaverPageUrls).toEqual(["/api/pages/1b9986f8-1f73-4d6d-8d1c-c4331c8c5f24/data-saver/page-1-saver.jpg"]);
  });
});
