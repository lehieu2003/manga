import { env } from "../../shared/configs/app.config.js";
import { HttpError } from "../../shared/errors/http-error.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: Record<string, number>;
};

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  usage?: Record<string, number>;
};

const OPENAI_API_URL = "https://api.openai.com/v1";

export function assertOpenAiConfigured() {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(503, "RAG chat requires OPENAI_API_KEY to be configured", "RAG_CHAT_NOT_CONFIGURED");
  }
}

export const openAiClient = {
  async createEmbedding(input: string) {
    assertOpenAiConfigured();
    const payload = await requestOpenAi<EmbeddingResponse>("/embeddings", {
      model: env.GPT_EMBEDDING_MODEL,
      input
    });
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding?.length) throw new HttpError(502, "OpenAI embedding response was empty", "OPENAI_EMPTY_EMBEDDING");
    return { embedding, model: env.GPT_EMBEDDING_MODEL, usage: payload.usage };
  },

  async createChatCompletion(input: { model: string; messages: ChatMessage[]; temperature?: number }) {
    assertOpenAiConfigured();
    const payload = await requestOpenAi<ChatCompletionResponse>("/chat/completions", {
      model: input.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.2
    });
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new HttpError(502, "OpenAI chat response was empty", "OPENAI_EMPTY_RESPONSE");
    return { content, usage: payload.usage };
  }
};

async function requestOpenAi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${OPENAI_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new HttpError(response.status, payload?.error?.message ?? `OpenAI request failed with ${response.status}`, "OPENAI_REQUEST_FAILED");
  }

  return response.json() as Promise<T>;
}
