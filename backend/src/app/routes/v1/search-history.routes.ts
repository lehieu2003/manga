import type { FastifyInstance } from "fastify";
import { clearSearchHistory, listSearchHistory } from "../../controllers/search-history.controller.js";
import { authRouteSchemas } from "../../docs/route-schemas.js";
import { searchHistoryQuerySchema } from "../../validators/search-history.validator.js";

export async function searchHistoryRoutes(app: FastifyInstance) {
  app.get("/me/search-history", { schema: authRouteSchemas.searchHistory, preHandler: app.authenticate }, async (request) => {
    return listSearchHistory(request.user.sub, searchHistoryQuerySchema.parse(request.query));
  });

  app.delete("/me/search-history", { schema: authRouteSchemas.clearSearchHistory, preHandler: app.authenticate }, async (request) => {
    return clearSearchHistory(app.log, request.user.sub);
  });
}
