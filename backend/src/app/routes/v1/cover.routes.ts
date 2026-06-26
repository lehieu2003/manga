import type { FastifyInstance } from "fastify";
import { handleProxyCoverImage } from "../../controllers/media.controller.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";

export async function coverRoutes(app: FastifyInstance) {
  app.get(
    "/covers/:mangaId/:fileName",
    {
      schema: mediaRouteSchemas.cover,
      config: { rateLimit: { max: 600, timeWindow: "1 minute" } }
    },
    handleProxyCoverImage
  );
}
