import type { FastifyInstance } from "fastify";
import { getMangaDexUploadsBaseUrl } from "../../../infrastructure/mangadex/mangadex.client.js";
import { coverParamsSchema } from "../../validators/media.validator.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";
import { mediaCacheControl, proxyMangaDexImage } from "../../services/media-proxy.service.js";

export async function coverRoutes(app: FastifyInstance) {
  app.get(
    "/covers/:mangaId/:fileName",
    {
      schema: mediaRouteSchemas.cover,
      config: { rateLimit: { max: 600, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const { mangaId, fileName } = coverParamsSchema.parse(request.params);
      const url = `${getMangaDexUploadsBaseUrl()}/covers/${mangaId}/${fileName}`;
      return proxyMangaDexImage({
        request,
        reply,
        url,
        timeoutMs: 10_000,
        cacheControl: mediaCacheControl.cover,
        fetchFailedMessage: "Unable to fetch MangaDex cover",
        fetchFailedCode: "COVER_FETCH_FAILED",
        timeoutCode: "COVER_FETCH_TIMEOUT"
      });
    }
  );
}
