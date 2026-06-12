import { prisma } from "../../infrastructure/database/client.js";
import { openAiClient } from "../../infrastructure/openai/openai.client.js";
import { toVectorLiteral } from "./rag-index.service.js";

export type RagRetrievedDocument = {
  id: string;
  sourceType: "MANGA" | "CHAPTER";
  sourceId: string;
  parentSourceId: string | null;
  title: string;
  content: string;
  metadata: unknown;
  score: number;
};

type RawRetrievedDocument = Omit<RagRetrievedDocument, "metadata"> & {
  metadata: unknown;
};

export async function retrieveRagContext(input: { query: string; filters?: RagRetrievalFilters; limit?: number }) {
  const { embedding } = await openAiClient.createEmbedding(input.query);
  const vector = toVectorLiteral(embedding);
  const limit = input.limit ?? 8;
  const filters = input.filters ?? {};
  const conditions = [`"embedding" IS NOT NULL`];
  const params: unknown[] = [vector];
  let index = 2;

  if (filters.sourceType) {
    conditions.push(`"sourceType" = $${index}::"RagSourceType"`);
    params.push(filters.sourceType);
    index += 1;
  }
  if (filters.mangaId) {
    conditions.push(`("sourceId" = $${index} OR "parentSourceId" = $${index})`);
    params.push(filters.mangaId);
    index += 1;
  }
  if (filters.status?.length) {
    conditions.push(`"metadata"->>'status' = ANY($${index}::text[])`);
    params.push(filters.status);
    index += 1;
  }
  if (filters.contentRating?.length) {
    conditions.push(`"metadata"->>'contentRating' = ANY($${index}::text[])`);
    params.push(filters.contentRating);
    index += 1;
  }
  if (filters.year) {
    conditions.push(`("metadata"->>'year')::int = $${index}`);
    params.push(filters.year);
    index += 1;
  }
  if (filters.tags?.length) {
    conditions.push(`"metadata"->'tags' ?| $${index}::text[]`);
    params.push(filters.tags);
    index += 1;
  }

  params.push(limit);
  const rows = await prisma.$queryRawUnsafe<RawRetrievedDocument[]>(
    `
      SELECT
        "id",
        "sourceType"::text as "sourceType",
        "sourceId",
        "parentSourceId",
        "title",
        "content",
        "metadata",
        1 - ("embedding" <=> $1::vector) as "score"
      FROM "RagDocument"
      WHERE ${conditions.join(" AND ")}
      ORDER BY "embedding" <=> $1::vector
      LIMIT $${index}
    `,
    ...params
  );

  return rows.filter((row) => row.score >= 0.15);
}

export type RagRetrievalFilters = {
  sourceType?: "MANGA" | "CHAPTER";
  mangaId?: string;
  tags?: string[];
  status?: string[];
  contentRating?: string[];
  year?: number;
};
