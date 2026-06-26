import type { FastifyInstance } from "fastify";
import { handleProxyChapterPageImage } from "../../controllers/media.controller.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";

export async function pageRoutes(app: FastifyInstance) {
  app.get(
    "/pages/:chapterId/:mode/:fileName",
    {
      schema: mediaRouteSchemas.page,
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } }
    },
    handleProxyChapterPageImage
  );
}
