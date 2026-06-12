import { randomUUID } from "node:crypto";
import { RagSourceType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { openAiClient } from "../../infrastructure/openai/openai.client.js";
import { env } from "../../shared/configs/app.config.js";
import { buildChapterRagDocument, buildMangaRagDocument, type RagSourceDocument } from "./rag-document-builder.service.js";

type IndexSummary = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export async function indexCatalogForRag(input: { limit?: number; includeChapters?: boolean } = {}) {
  const summary: IndexSummary = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const mangaRows = await prisma.cachedManga.findMany({
    take: input.limit ?? 100,
    orderBy: { updatedAt: "desc" },
    include: {
      chapters: { orderBy: [{ publishAt: "desc" }, { chapter: "desc" }], take: input.includeChapters ? 120 : 40 }
    }
  });

  for (const manga of mangaRows) {
    const documents: RagSourceDocument[] = [buildMangaRagDocument(manga)];
    if (input.includeChapters) {
      documents.push(...manga.chapters.filter((chapter) => chapter.pages > 0).map((chapter) => buildChapterRagDocument({ mangaTitle: manga.title, mangaId: manga.id, chapter })));
    }

    for (const document of documents) {
      try {
        const result = await upsertRagDocument(document);
        summary[result] += 1;
      } catch {
        summary.failed += 1;
      }
    }
  }

  return summary;
}

export async function upsertRagDocument(document: RagSourceDocument): Promise<keyof Pick<IndexSummary, "created" | "updated" | "skipped">> {
  const existing = await prisma.ragDocument.findUnique({
    where: { sourceType_sourceId: { sourceType: document.sourceType, sourceId: document.sourceId } },
    select: { id: true, contentHash: true, embeddingModel: true }
  });

  if (existing?.contentHash === document.contentHash && existing.embeddingModel === env.GPT_EMBEDDING_MODEL) {
    return "skipped";
  }

  const { embedding, model } = await openAiClient.createEmbedding(document.content);
  const vector = toVectorLiteral(embedding);
  const now = new Date();
  const metadataJson = JSON.stringify(document.metadata);

  if (existing) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "RagDocument"
        SET "parentSourceId" = $1,
            "title" = $2,
            "content" = $3,
            "metadata" = $4::jsonb,
            "contentHash" = $5,
            "embedding" = $6::vector,
            "embeddingModel" = $7,
            "indexedAt" = $8,
            "updatedAt" = $9
        WHERE "id" = $10
      `,
      document.parentSourceId ?? null,
      document.title,
      document.content,
      metadataJson,
      document.contentHash,
      vector,
      model,
      now,
      now,
      existing.id
    );
    return "updated";
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "RagDocument" (
        "id", "sourceType", "sourceId", "parentSourceId", "title", "content", "metadata", "contentHash", "embedding", "embeddingModel", "indexedAt", "createdAt", "updatedAt"
      )
      VALUES ($1, $2::"RagSourceType", $3, $4, $5, $6, $7::jsonb, $8, $9::vector, $10, $11, $12, $13)
    `,
    randomUUID(),
    document.sourceType,
    document.sourceId,
    document.parentSourceId ?? null,
    document.title,
    document.content,
    metadataJson,
    document.contentHash,
    vector,
    model,
    now,
    now,
    now
  );
  return "created";
}

export function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

export function toRagSourceType(value: string): RagSourceType {
  return value === "CHAPTER" ? RagSourceType.CHAPTER : RagSourceType.MANGA;
}
