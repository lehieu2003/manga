import type { Prisma, RagSourceType } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { indexCatalogForRag } from "./rag-index.service.js";

export type AdminRagDocumentQuery = {
  q?: string;
  sourceType?: RagSourceType;
  limit: number;
  offset: number;
};

export async function getAdminRagStatus() {
  const [cachedManga, cachedChapters, mangaDocuments, chapterDocuments, conversations, messages, latestDocument] = await prisma.$transaction([
    prisma.cachedManga.count(),
    prisma.cachedChapter.count(),
    prisma.ragDocument.count({ where: { sourceType: "MANGA" } }),
    prisma.ragDocument.count({ where: { sourceType: "CHAPTER" } }),
    prisma.chatConversation.count({ where: { archived: false } }),
    prisma.chatMessage.count(),
    prisma.ragDocument.findFirst({
      orderBy: { indexedAt: "desc" },
      select: { indexedAt: true, embeddingModel: true }
    })
  ]);

  return {
    cached: {
      manga: cachedManga,
      chapters: cachedChapters
    },
    ragDocuments: {
      total: mangaDocuments + chapterDocuments,
      manga: mangaDocuments,
      chapter: chapterDocuments,
      latestIndexedAt: latestDocument?.indexedAt?.toISOString() ?? null,
      embeddingModel: latestDocument?.embeddingModel ?? null
    },
    chat: {
      activeConversations: conversations,
      messages
    },
    coverage: {
      mangaIndexed: cachedManga > 0 ? mangaDocuments / cachedManga : 0,
      chapterIndexed: cachedChapters > 0 ? chapterDocuments / cachedChapters : 0
    }
  };
}

export async function listAdminRagDocuments(query: AdminRagDocumentQuery) {
  const where = ragDocumentWhere(query);
  const [data, total] = await prisma.$transaction([
    prisma.ragDocument.findMany({
      where,
      orderBy: [{ indexedAt: "desc" }, { title: "asc" }],
      take: query.limit,
      skip: query.offset,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        parentSourceId: true,
        title: true,
        content: true,
        metadata: true,
        contentHash: true,
        embeddingModel: true,
        indexedAt: true,
        updatedAt: true
      }
    }),
    prisma.ragDocument.count({ where })
  ]);

  return {
    data: data.map(({ content, ...document }) => ({
      ...document,
      contentPreview: preview(content),
      indexedAt: document.indexedAt?.toISOString() ?? null,
      updatedAt: document.updatedAt.toISOString()
    })),
    limit: query.limit,
    offset: query.offset,
    total
  };
}

export async function reindexAdminRagCatalog(input: { limit?: number; chapters?: boolean }) {
  const startedAt = Date.now();
  const summary = await indexCatalogForRag({ limit: input.limit, includeChapters: input.chapters });
  return {
    status: "completed" as const,
    summary,
    durationMs: Date.now() - startedAt
  };
}

function ragDocumentWhere(query: AdminRagDocumentQuery): Prisma.RagDocumentWhereInput {
  return {
    ...(query.sourceType ? { sourceType: query.sourceType } : {}),
    ...(query.q
      ? {
          OR: [{ sourceId: query.q }, { parentSourceId: query.q }, { title: { contains: query.q, mode: "insensitive" } }, { content: { contains: query.q, mode: "insensitive" } }]
        }
      : {})
  };
}

function preview(content: string) {
  return content.length > 280 ? `${content.slice(0, 277)}...` : content;
}
