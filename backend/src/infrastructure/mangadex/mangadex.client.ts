import { env } from "../../shared/configs/app.config.js";
import { HttpError } from "../../shared/errors/http-error.js";
import type { ChapterSummary, MangaDexListResponse, MangaDexSingleResponse, MangaSummary, ReaderPayload } from "./mangadex.types.js";

const USER_AGENT = "mangadex-reader/0.1 (+https://github.com/local/mangadex-reader)";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MangaSearchSort = "relevance" | "latest" | "followed" | "title" | "created" | "updated";

export type MangaSearchInput = {
  q?: string;
  limit: number;
  offset: number;
  languages: string[];
  tags: string[];
  includedTags?: string[];
  excludedTags?: string[];
  contentRating?: string[];
  status?: string[];
  year?: number;
  demographic?: string[];
  sort?: MangaSearchSort;
};

export function getMangaDexUploadsBaseUrl() {
  if (env.MANGADEX_UPLOADS_BASE_URL) return env.MANGADEX_UPLOADS_BASE_URL;
  return env.MANGADEX_BASE_URL.includes(".dev") ? "https://uploads.mangadex.dev" : "https://uploads.mangadex.org";
}

function firstLocalized(value: Record<string, string> | undefined, preferred = ["vi", "en", "ja-ro", "ja"]) {
  if (!value) return "";
  for (const lang of preferred) {
    if (value[lang]) return value[lang];
  }
  return Object.values(value)[0] ?? "";
}

function appendArrayParams(params: URLSearchParams, key: string, values: string[]) {
  for (const value of values) {
    params.append(`${key}[]`, value);
  }
}

async function requestMangaDex<T>(path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(path, env.MANGADEX_BASE_URL);
  if (params) {
    url.search = params.toString();
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT
        },
        signal: controller.signal
      });

      if (response.status === 429 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }

      if (!response.ok) {
        throw new HttpError(response.status, `MangaDex request failed: ${response.statusText}`, "MANGADEX_ERROR");
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (attempt === 0 && error instanceof Error && error.name === "AbortError") {
        continue;
      }
      if (error instanceof Error) {
        throw new HttpError(502, `Unable to reach MangaDex: ${error.message}`, "MANGADEX_UNREACHABLE");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new HttpError(504, "MangaDex request timed out", "MANGADEX_TIMEOUT");
}

function normalizeManga(entity: MangaDexSingleResponse["data"]): MangaSummary {
  const attrs = entity.attributes as Record<string, unknown>;
  const cover = entity.relationships?.find((relationship) => relationship.type === "cover_art");
  const fileName = cover?.attributes?.fileName;
  const tags = ((attrs.tags as Array<{ attributes?: { name?: Record<string, string> } }>) ?? [])
    .map((tag) => firstLocalized(tag.attributes?.name, ["en", "vi"]))
    .filter(Boolean);
  const altTitles = ((attrs.altTitles as Array<Record<string, string>>) ?? [])
    .map((title) => firstLocalized(title))
    .filter(Boolean)
    .slice(0, 8);

  return {
    id: entity.id,
    title: firstLocalized(attrs.title as Record<string, string> | undefined),
    altTitles,
    description: firstLocalized(attrs.description as Record<string, string> | undefined),
    status: attrs.status as string | undefined,
    year: attrs.year as number | undefined,
    contentRating: attrs.contentRating as string | undefined,
    tags,
    coverUrl: typeof fileName === "string" ? `${getMangaDexUploadsBaseUrl()}/covers/${entity.id}/${fileName}.512.jpg` : undefined
  };
}

function normalizeChapter(entity: MangaDexListResponse["data"][number]): ChapterSummary {
  const attrs = entity.attributes as Record<string, unknown>;
  const group = entity.relationships?.find((relationship) => relationship.type === "scanlation_group");
  return {
    id: entity.id,
    title: (attrs.title as string | null) ?? "",
    chapter: (attrs.chapter as string | null) ?? null,
    volume: (attrs.volume as string | null) ?? null,
    translatedLanguage: (attrs.translatedLanguage as string | undefined) ?? "en",
    publishAt: (attrs.publishAt as string | undefined) ?? "",
    pages: (attrs.pages as number | undefined) ?? 0,
    scanlationGroup: group?.attributes?.name as string | undefined
  };
}

export async function searchManga(input: {
  q?: string;
  limit: number;
  offset: number;
  languages: string[];
  tags: string[];
  includedTags?: string[];
  excludedTags?: string[];
  contentRating?: string[];
  status?: string[];
  year?: number;
  demographic?: string[];
  sort?: MangaSearchSort;
}) {
  const includedTags = [...new Set([...(input.tags ?? []), ...(input.includedTags ?? [])])].filter((tag) => UUID_PATTERN.test(tag));
  const excludedTags = (input.excludedTags ?? []).filter((tag) => UUID_PATTERN.test(tag));
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset)
  });

  applyMangaSort(params, input.sort ?? (input.q ? "relevance" : "followed"));
  if (input.q) params.set("title", input.q);
  if (input.year) params.set("year", String(input.year));
  appendArrayParams(params, "availableTranslatedLanguage", input.languages);
  appendArrayParams(params, "includes", ["cover_art"]);
  appendArrayParams(params, "contentRating", input.contentRating?.length ? input.contentRating : ["safe", "suggestive"]);
  appendArrayParams(params, "status", input.status ?? []);
  appendArrayParams(params, "publicationDemographic", input.demographic ?? []);
  appendArrayParams(params, "includedTags", includedTags);
  appendArrayParams(params, "excludedTags", excludedTags);

  const result = await requestMangaDex<MangaDexListResponse>("/manga", params);
  return {
    limit: result.limit,
    offset: result.offset,
    total: result.total,
    data: result.data.map(normalizeManga)
  };
}

export function applyMangaSort(params: URLSearchParams, sort: MangaSearchSort) {
  if (sort === "latest") {
    params.set("order[latestUploadedChapter]", "desc");
    return;
  }
  if (sort === "title") {
    params.set("order[title]", "asc");
    return;
  }
  if (sort === "created") {
    params.set("order[createdAt]", "desc");
    return;
  }
  if (sort === "updated") {
    params.set("order[updatedAt]", "desc");
    return;
  }
  if (sort === "relevance") {
    params.set("order[relevance]", "desc");
  }
  params.set("order[followedCount]", "desc");
}

export async function getManga(id: string) {
  const params = new URLSearchParams();
  appendArrayParams(params, "includes", ["cover_art"]);
  const result = await requestMangaDex<MangaDexSingleResponse>(`/manga/${id}`, params);
  return normalizeManga(result.data);
}

export async function getChapters(input: { mangaId: string; limit: number; offset: number; translatedLanguage: string[] }) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
    "order[volume]": "asc",
    "order[chapter]": "asc"
  });
  appendArrayParams(params, "translatedLanguage", input.translatedLanguage);
  appendArrayParams(params, "includes", ["scanlation_group"]);

  const result = await requestMangaDex<MangaDexListResponse>(`/manga/${input.mangaId}/feed`, params);
  return {
    limit: result.limit,
    offset: result.offset,
    total: result.total,
    data: result.data.map(normalizeChapter)
  };
}

export async function getReader(chapterId: string): Promise<ReaderPayload> {
  const result = await requestMangaDex<{
    baseUrl: string;
    chapter: { hash: string; data: string[]; dataSaver: string[] };
  }>(`/at-home/server/${chapterId}`);

  const { baseUrl, chapter } = result;
  return {
    baseUrl,
    hash: chapter.hash,
    pages: chapter.data,
    dataSaverPages: chapter.dataSaver,
    pageUrls: chapter.data.map((page) => `/api/pages/${chapterId}/data/${page}`),
    dataSaverPageUrls: chapter.dataSaver.map((page) => `/api/pages/${chapterId}/data-saver/${page}`)
  };
}
