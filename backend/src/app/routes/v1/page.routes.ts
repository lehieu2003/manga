import type { FastifyInstance } from "fastify";
import { cached, makeCacheKey } from "../../../infrastructure/cache/cache.service.js";
import { HttpError } from "../../../shared/errors/http-error.js";
import { getReader } from "../../../infrastructure/mangadex/mangadex.client.js";
import { pageParamsSchema } from "../../validators/media.validator.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";
import { mediaCacheControl, proxyMangaDexImage } from "../../services/media-proxy.service.js";

export async function pageRoutes(app: FastifyInstance) {
  app.get(
    "/pages/:chapterId/:mode/:fileName",
    {
      schema: mediaRouteSchemas.page,
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const { chapterId, mode, fileName } = pageParamsSchema.parse(request.params);
      const reader = await cached(makeCacheKey("chapter:reader:origin", { chapterId }), 300, () => getReader(chapterId));
      const availablePages = mode === "data" ? reader.pages : reader.dataSaverPages;

      if (!availablePages.includes(fileName)) {
        throw new HttpError(404, "Chapter page was not found", "PAGE_NOT_FOUND");
      }

      const url = `${reader.baseUrl}/${mode}/${reader.hash}/${fileName}`;
      return proxyMangaDexImage({
        request,
        reply,
        url,
        timeoutMs: 15_000,
        cacheControl: mediaCacheControl.page,
        fetchFailedMessage: "Unable to fetch MangaDex page",
        fetchFailedCode: "PAGE_FETCH_FAILED",
        timeoutCode: "PAGE_FETCH_TIMEOUT"
      });
    }
  );
}
