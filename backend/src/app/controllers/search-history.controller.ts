import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { z } from "zod";
import { searchHistoryRepository } from "../../domain/repositories/index.js";
import { searchHistoryQuerySchema } from "../validators/search-history.validator.js";

type SearchHistoryQuery = z.infer<typeof searchHistoryQuerySchema>;

export async function handleListSearchHistory(request: FastifyRequest) {
  return listSearchHistory(request.user.sub, searchHistoryQuerySchema.parse(request.query));
}

export async function handleClearSearchHistory(request: FastifyRequest) {
  return clearSearchHistory(request.log, request.user.sub);
}

export async function listSearchHistory(userId: string, query: SearchHistoryQuery) {
  const result = await searchHistoryRepository.findByUser(userId, query);
  return {
    data: result.data.map((item) => ({
      id: item.id,
      userId: item.userId,
      query: item.query,
      createdAt: item.createdAt.toISOString()
    })),
    limit: query.limit,
    offset: query.offset,
    total: result.total
  };
}

export async function clearSearchHistory(logger: FastifyBaseLogger, userId: string) {
  const result = await searchHistoryRepository.clearByUser(userId);
  logger.info({ userId, affectedCount: result.count }, "cleared user search history");
  return { ok: true, summary: { affectedCount: result.count } };
}
