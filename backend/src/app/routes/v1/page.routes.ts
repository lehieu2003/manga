import type { FastifyInstance } from "fastify";
import { proxyChapterPageImage } from "../../controllers/media.controller.js";
import { pageParamsSchema } from "../../validators/media.validator.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";

export async function pageRoutes(app: FastifyInstance) {
  app.get(
    "/pages/:chapterId/:mode/:fileName",
    {
      schema: mediaRouteSchemas.page,
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const { chapterId, mode, fileName } = pageParamsSchema.parse(request.params);
      return proxyChapterPageImage(request, reply, { chapterId, mode, fileName });
    }
  );
}
