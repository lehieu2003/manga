import type { FastifyInstance } from "fastify";
import { HttpError } from "../../../shared/errors/http-error.js";
import { getMangaDexUploadsBaseUrl } from "../../../infrastructure/mangadex/mangadex.client.js";
import { coverParamsSchema } from "../../validators/media.validator.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";

export async function coverRoutes(app: FastifyInstance) {
  app.get("/covers/:mangaId/:fileName", { schema: mediaRouteSchemas.cover }, async (request, reply) => {
    const { mangaId, fileName } = coverParamsSchema.parse(request.params);
    const url = `${getMangaDexUploadsBaseUrl()}/covers/${mangaId}/${fileName}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mangadex-reader/0.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new HttpError(response.status, "Unable to fetch MangaDex cover", "COVER_FETCH_FAILED");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
    return reply.send(bytes);
  });
}
