import type { FastifyInstance } from "fastify";
import { handleClearSearchHistory, handleListSearchHistory } from "../../controllers/search-history.controller.js";
import { authRouteSchemas } from "../../docs/route-schemas.js";

export async function searchHistoryRoutes(app: FastifyInstance) {
  app.get("/me/search-history", { schema: authRouteSchemas.searchHistory, preHandler: app.authenticate }, handleListSearchHistory);
  app.delete("/me/search-history", { schema: authRouteSchemas.clearSearchHistory, preHandler: app.authenticate }, handleClearSearchHistory);
}
