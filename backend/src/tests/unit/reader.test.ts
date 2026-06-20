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
            baseUrl: "https://cmdxd98sb0x3ydev.mangadex.network",
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

    expect(reader.baseUrl).toBe("https://uploads.mangadex.org");
    expect(reader.pageUrls).toEqual(["/api/pages/1b9986f8-1f73-4d6d-8d1c-c4331c8c5f24/data/page-1.jpg"]);
    expect(reader.dataSaverPageUrls).toEqual(["/api/pages/1b9986f8-1f73-4d6d-8d1c-c4331c8c5f24/data-saver/page-1-saver.jpg"]);
  });

  it("falls back to the alternate MangaDex API origin when the primary origin is unreachable", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            baseUrl: "https://cmdxd98sb0x3ydev.mangadex.network",
            chapter: {
              hash: "hash",
              data: ["page-1.jpg"],
              dataSaver: ["page-1-saver.jpg"]
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetch);

    await expect(getReader("21551cd0-062d-4bad-bec9-8bca7d977795")).resolves.toMatchObject({
      baseUrl: "https://uploads.mangadex.org",
      pageUrls: ["/api/pages/21551cd0-062d-4bad-bec9-8bca7d977795/data/page-1.jpg"]
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]?.[0])).not.toBe(String(fetch.mock.calls[1]?.[0]));
  });
});
