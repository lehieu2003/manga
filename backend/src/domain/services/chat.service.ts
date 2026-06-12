import { ChatMessageRole } from "@prisma/client";
import { prisma } from "../../infrastructure/database/client.js";
import { openAiClient } from "../../infrastructure/openai/openai.client.js";
import { env } from "../../shared/configs/app.config.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { retrieveRagContext, type RagRetrievalFilters, type RagRetrievedDocument } from "./rag-retrieval.service.js";

type RouteContext = {
  mangaId?: string;
  chapterId?: string;
};

type IntentResult = {
  intent: "recommendation" | "catalog_question" | "continue_reading" | "reader_help" | "unknown";
  query: string;
  filters: RagRetrievalFilters;
  needsPersonalization: boolean;
};

export type ChatSource = {
  type: "manga" | "chapter";
  id: string;
  title: string;
  reason: string;
  coverUrl?: string;
  score?: number;
};

export type ChatSuggestedAction = {
  type: "open_manga" | "open_chapter";
  label: string;
  targetId: string;
};

export async function sendChatMessage(input: { userId: string; conversationId?: string; message: string; routeContext?: RouteContext }) {
  if (!env.RAG_CHAT_ENABLED) {
    throw new HttpError(503, "RAG chat is disabled", "RAG_CHAT_DISABLED");
  }
  const startedAt = Date.now();
  const conversation = await getOrCreateConversation(input.userId, input.conversationId, input.message);
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: ChatMessageRole.USER,
      content: input.message
    }
  });

  const intent = await classifyIntent(input.message, input.routeContext);
  const retrievalFilters = buildChatRetrievalFilters(intent, input.routeContext);
  const [documents, userContext] = await Promise.all([
    retrieveRagContext({ query: intent.query || input.message, filters: retrievalFilters, limit: 8 }),
    buildUserContext(input.userId)
  ]);

  const answer = await generateAnswer({ message: input.message, intent, documents, userContext, routeContext: input.routeContext });
  const sources = await toSources(documents);
  const suggestedActions = sources.slice(0, 4).map((source): ChatSuggestedAction => ({
    type: source.type === "chapter" ? "open_chapter" : "open_manga",
    label: source.type === "chapter" ? "Open chapter" : "Open manga",
    targetId: source.id
  }));

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: ChatMessageRole.ASSISTANT,
      content: answer.content,
      sources,
      suggestedActions,
      model: env.GPT_MODEL_MINI,
      tokenUsage: answer.usage ?? undefined,
      latencyMs: Date.now() - startedAt
    }
  });

  return {
    conversationId: conversation.id,
    message: {
      id: assistantMessage.id,
      role: "assistant" as const,
      content: assistantMessage.content,
      sources,
      suggestedActions,
      createdAt: assistantMessage.createdAt
    }
  };
}

export async function listChatConversations(userId: string) {
  return prisma.chatConversation.findMany({
    where: { userId, archived: false },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, createdAt: true, updatedAt: true }
  });
}

export async function listChatMessages(userId: string, conversationId: string) {
  await assertConversationOwner(userId, conversationId);
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" }
  });
  return {
    data: messages.map((message) => ({
      id: message.id,
      role: message.role.toLowerCase(),
      content: message.content,
      sources: message.sources ?? [],
      suggestedActions: message.suggestedActions ?? [],
      createdAt: message.createdAt
    }))
  };
}

export async function archiveChatConversation(userId: string, conversationId: string) {
  await assertConversationOwner(userId, conversationId);
  await prisma.chatConversation.update({ where: { id: conversationId }, data: { archived: true } });
  return { ok: true };
}

export async function getRagChatStatus() {
  const [cachedManga, mangaDocuments, chapterDocuments, conversations, messages] = await Promise.all([
    prisma.cachedManga.count(),
    prisma.ragDocument.count({ where: { sourceType: "MANGA" } }),
    prisma.ragDocument.count({ where: { sourceType: "CHAPTER" } }),
    prisma.chatConversation.count({ where: { archived: false } }),
    prisma.chatMessage.count()
  ]);

  return {
    cachedManga,
    ragDocuments: {
      total: mangaDocuments + chapterDocuments,
      manga: mangaDocuments,
      chapter: chapterDocuments
    },
    chat: {
      conversations,
      messages
    },
    coverage: {
      mangaIndexed: cachedManga > 0 ? mangaDocuments / cachedManga : 0
    }
  };
}

export function buildChatRetrievalFilters(intent: IntentResult, routeContext?: RouteContext): RagRetrievalFilters {
  const filters: RagRetrievalFilters = {
    ...intent.filters,
    mangaId: intent.filters.mangaId ?? routeContext?.mangaId
  };

  if (!filters.sourceType && shouldPreferMangaDocuments(intent.intent, routeContext)) {
    filters.sourceType = "MANGA";
  }

  return filters;
}

async function getOrCreateConversation(userId: string, conversationId: string | undefined, message: string) {
  if (conversationId) {
    const conversation = await assertConversationOwner(userId, conversationId);
    if (conversation.archived) throw new HttpError(404, "Conversation not found", "CHAT_CONVERSATION_NOT_FOUND");
    return conversation;
  }

  return prisma.chatConversation.create({
    data: {
      userId,
      title: message.trim().slice(0, 64)
    }
  });
}

async function assertConversationOwner(userId: string, conversationId: string) {
  const conversation = await prisma.chatConversation.findFirst({ where: { id: conversationId, userId } });
  if (!conversation) throw new HttpError(404, "Conversation not found", "CHAT_CONVERSATION_NOT_FOUND");
  return conversation;
}

async function classifyIntent(message: string, routeContext?: RouteContext): Promise<IntentResult> {
  const fallback: IntentResult = {
    intent: "unknown",
    query: message,
    filters: routeContext?.mangaId ? { mangaId: routeContext.mangaId } : {},
    needsPersonalization: true
  };

  try {
    const response = await openAiClient.createChatCompletion({
      model: env.GPT_MODEL_NANO,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'Return only compact JSON with keys: intent, query, filters, needsPersonalization. Allowed intents: recommendation, catalog_question, continue_reading, reader_help, unknown. Filters may include tags, status, contentRating, year, mangaId, sourceType. Use sourceType "CHAPTER" only for chapter-specific questions.'
        },
        { role: "user", content: message }
      ]
    });
    const parsed = JSON.parse(stripJsonFence(response.content)) as Partial<IntentResult>;
    return {
      intent: isIntent(parsed.intent) ? parsed.intent : fallback.intent,
      query: typeof parsed.query === "string" && parsed.query.trim() ? parsed.query.trim() : fallback.query,
      filters: normalizeFilters(parsed.filters, routeContext),
      needsPersonalization: typeof parsed.needsPersonalization === "boolean" ? parsed.needsPersonalization : fallback.needsPersonalization
    };
  } catch {
    return fallback;
  }
}

async function buildUserContext(userId: string) {
  const [library, progress, searches] = await Promise.all([
    prisma.libraryItem.findMany({ where: { userId }, orderBy: [{ isFavorite: "desc" }, { lastReadAt: "desc" }], take: 12 }),
    prisma.readingProgress.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.searchHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  const mangaIds = [...new Set([...library.map((item) => item.mangaId), ...progress.map((item) => item.mangaId)])];
  const manga = await prisma.cachedManga.findMany({
    where: { id: { in: mangaIds } },
    select: { id: true, title: true, tags: true, status: true, year: true }
  });
  const mangaById = new Map(manga.map((item) => [item.id, item]));

  return [
    library.length
      ? `Library: ${library
          .map((item) => {
            const cached = mangaById.get(item.mangaId);
            return `${cached?.title ?? item.mangaId} (${item.status}${item.isFavorite ? ", favorite" : ""}${item.lastChapterId ? `, last chapter ${item.lastChapterId}` : ""})`;
          })
          .join("; ")}`
      : "Library: no saved manga yet.",
    progress.length
      ? `Recent progress: ${progress.map((item) => `${mangaById.get(item.mangaId)?.title ?? item.mangaId} chapter ${item.chapterId} page ${item.pageIndex}${item.completed ? " completed" : ""}`).join("; ")}`
      : "Recent progress: none.",
    searches.length ? `Recent searches: ${searches.map((item) => item.query).join(", ")}` : "Recent searches: none."
  ].join("\n");
}

async function generateAnswer(input: { message: string; intent: IntentResult; documents: RagRetrievedDocument[]; userContext: string; routeContext?: RouteContext }) {
  if (!input.documents.length) {
    return {
      content: "I could not find enough indexed catalog context for that question yet. Try a broader manga search, or run the RAG indexer after syncing more catalog data.",
      usage: undefined
    };
  }

  const context = input.documents
    .map((document, index) => `[${index + 1}] ${document.sourceType} ${document.title} (id: ${document.sourceId}, score: ${document.score.toFixed(3)})\n${document.content}`)
    .join("\n\n");

  return openAiClient.createChatCompletion({
    model: env.GPT_MODEL_MINI,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: buildAnswerSystemPrompt()
      },
      {
        role: "user",
        content: `User question: ${input.message}

Intent: ${input.intent.intent}
User context:
${input.userContext}

Retrieved context:
${context}

Write the assistant answer now.`
      }
    ]
  });
}

export function buildAnswerSystemPrompt() {
  return [
    "You are a manga discovery assistant inside a MangaDex reader app.",
    "Answer only from the retrieved catalog context and user context.",
    "Do not claim to know manga page image contents or chapter plot details unless text context explicitly says so.",
    "Do not use Markdown, bold markers, headings, tables, or numbered Markdown syntax.",
    "Keep the full answer under 90 words unless the user explicitly asks for detail.",
    "For recommendations, return at most 3 items.",
    "Use this plain-text recommendation format:",
    "Try these:",
    "- Title: one short reason from context.",
    "- Title: one short reason from context.",
    "End with one short next-step question only if useful.",
    "Do not repeat source IDs or retrieval scores; source cards are rendered separately."
  ].join("\n");
}

async function toSources(documents: RagRetrievedDocument[]): Promise<ChatSource[]> {
  const selectedDocuments = documents.slice(0, 6);
  const mangaIds = [
    ...new Set(
      selectedDocuments
        .map((document) => (document.sourceType === "CHAPTER" ? document.parentSourceId : document.sourceId))
        .filter((id): id is string => Boolean(id))
    )
  ];
  const mangaRows = mangaIds.length
    ? await prisma.cachedManga.findMany({
        where: { id: { in: mangaIds } },
        select: { id: true, coverUrl: true }
      })
    : [];
  const coverByMangaId = new Map(mangaRows.map((manga) => [manga.id, manga.coverUrl ?? undefined]));

  return selectedDocuments.map((document) => {
    const mangaId = document.sourceType === "CHAPTER" ? document.parentSourceId : document.sourceId;
    return {
      type: document.sourceType === "CHAPTER" ? "chapter" : "manga",
      id: document.sourceId,
      title: document.title,
      reason: `Retrieved catalog context with score ${document.score.toFixed(2)}`,
      coverUrl: mangaId ? coverByMangaId.get(mangaId) : undefined,
      score: document.score
    };
  });
}

function normalizeFilters(value: unknown, routeContext?: RouteContext): RagRetrievalFilters {
  if (typeof value !== "object" || value === null) return routeContext?.mangaId ? { mangaId: routeContext.mangaId } : {};
  const filters = value as Record<string, unknown>;
  return {
    sourceType: filters.sourceType === "CHAPTER" ? "CHAPTER" : filters.sourceType === "MANGA" ? "MANGA" : undefined,
    mangaId: typeof filters.mangaId === "string" ? filters.mangaId : routeContext?.mangaId,
    tags: normalizeStringArray(filters.tags),
    status: normalizeStringArray(filters.status),
    contentRating: normalizeStringArray(filters.contentRating),
    year: typeof filters.year === "number" ? filters.year : undefined
  };
}

function shouldPreferMangaDocuments(intent: IntentResult["intent"], routeContext?: RouteContext) {
  if (routeContext?.chapterId) return false;
  return intent === "recommendation" || intent === "catalog_question" || intent === "unknown";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return items.length ? items : undefined;
}

function isIntent(value: unknown): value is IntentResult["intent"] {
  return value === "recommendation" || value === "catalog_question" || value === "continue_reading" || value === "reader_help" || value === "unknown";
}

function stripJsonFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}
