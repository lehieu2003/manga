import type { FastifyInstance } from "fastify";
import { cached, makeCacheKey } from "../../../infrastructure/cache/cache.service.js";
import { HttpError } from "../../../shared/errors/http-error.js";
import { getReader } from "../../../infrastructure/mangadex/mangadex.client.js";
import { pageParamsSchema } from "../../validators/media.validator.js";

export async function pageRoutes(app: FastifyInstance) {
  app.get("/pages/:chapterId/:mode/:fileName", async (request, reply) => {
    const { chapterId, mode, fileName } = pageParamsSchema.parse(request.params);
    const reader = await cached(makeCacheKey("chapter:reader:origin", { chapterId }), 300, () => getReader(chapterId));
    const availablePages = mode === "data" ? reader.pages : reader.dataSaverPages;

    if (!availablePages.includes(fileName)) {
      throw new HttpError(404, "Chapter page was not found", "PAGE_NOT_FOUND");
    }

    const url = `${reader.baseUrl}/${mode}/${reader.hash}/${fileName}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mangadex-reader/0.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new HttpError(response.status, "Unable to fetch MangaDex page", "PAGE_FETCH_FAILED");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
    return reply.send(bytes);
  });
}
