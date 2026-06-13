import type { FastifyBaseLogger } from "fastify";
import type { z } from "zod";
import { getAdminRagStatus, listAdminRagDocuments, reindexAdminRagCatalog } from "../../domain/services/admin-rag.service.js";
import type { adminRagDocumentsQuerySchema, adminRagReindexBodySchema } from "../validators/admin-rag.validator.js";

type AdminRagDocumentsQuery = z.infer<typeof adminRagDocumentsQuerySchema>;
type AdminRagReindexBody = z.infer<typeof adminRagReindexBodySchema>;

export function getAdminRagStatusView() {
  return getAdminRagStatus();
}

export function listAdminRagDocumentPage(query: AdminRagDocumentsQuery) {
  return listAdminRagDocuments(query);
}

export async function reindexAdminRag(logger: FastifyBaseLogger, input: AdminRagReindexBody) {
  const startedAt = Date.now();
  logger.info({ limit: input.limit, chapters: input.chapters }, "Admin RAG reindex started");

  try {
    const result = await reindexAdminRagCatalog(input);
    logger.info({ summary: result.summary, durationMs: result.durationMs }, "Admin RAG reindex completed");
    return result;
  } catch (error) {
    logger.error({ error, durationMs: Date.now() - startedAt }, "Admin RAG reindex failed");
    throw error;
  }
}
