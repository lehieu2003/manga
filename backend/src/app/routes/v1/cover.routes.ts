import type { FastifyInstance } from "fastify";
import { proxyCoverImage } from "../../controllers/media.controller.js";
import { coverParamsSchema } from "../../validators/media.validator.js";
import { mediaRouteSchemas } from "../../docs/route-schemas.js";

export async function coverRoutes(app: FastifyInstance) {
  app.get(
    "/covers/:mangaId/:fileName",
    {
      schema: mediaRouteSchemas.cover,
      config: { rateLimit: { max: 600, timeWindow: "1 minute" } }
    },
    async (request, reply) => {
      const { mangaId, fileName } = coverParamsSchema.parse(request.params);
      return proxyCoverImage(request, reply, { mangaId, fileName });
    }
  );
}
