import { createHash } from "node:crypto";

type CachedMangaSource = {
  id: string;
  title: string;
  altTitles: unknown;
  description: string;
  status: string | null;
  year: number | null;
  contentRating: string | null;
  tags: string[];
  authors: string[];
  artists: string[];
  chapters?: Array<{
    id: string;
    title: string;
    chapter: string | null;
    volume: string | null;
    translatedLanguage: string;
    publishAt: Date | null;
    pages: number;
    scanlationGroup: string | null;
  }>;
};

export type RagSourceDocument = {
  sourceType: "MANGA" | "CHAPTER";
  sourceId: string;
  parentSourceId?: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  contentHash: string;
};

export function buildMangaRagDocument(manga: CachedMangaSource): RagSourceDocument {
  const chapterLanguages = [...new Set((manga.chapters ?? []).map((chapter) => chapter.translatedLanguage))].sort();
  const readableChapters = (manga.chapters ?? []).filter((chapter) => chapter.pages > 0).length;
  const altTitles = normalizeAltTitles(manga.altTitles);
  const lines = compactLines([
    "Type: Manga",
    `Title: ${manga.title}`,
    altTitles.length ? `Alternative titles: ${altTitles.join(", ")}` : undefined,
    manga.description ? `Description: ${manga.description}` : undefined,
    manga.tags.length ? `Tags: ${manga.tags.join(", ")}` : undefined,
    manga.authors.length ? `Authors: ${manga.authors.join(", ")}` : undefined,
    manga.artists.length ? `Artists: ${manga.artists.join(", ")}` : undefined,
    manga.status ? `Status: ${manga.status}` : undefined,
    manga.year ? `Year: ${manga.year}` : undefined,
    manga.contentRating ? `Content rating: ${manga.contentRating}` : undefined,
    chapterLanguages.length ? `Available languages: ${chapterLanguages.join(", ")}` : undefined,
    readableChapters ? `Readable chapters: ${readableChapters}` : undefined
  ]);
  const content = lines.join("\n");

  return {
    sourceType: "MANGA",
    sourceId: manga.id,
    title: manga.title,
    content,
    metadata: {
      tags: manga.tags,
      authors: manga.authors,
      artists: manga.artists,
      status: manga.status,
      year: manga.year,
      contentRating: manga.contentRating,
      languages: chapterLanguages,
      readableChapters
    },
    contentHash: hashContent(content)
  };
}

export function buildChapterRagDocument(input: { mangaTitle: string; mangaId: string; chapter: NonNullable<CachedMangaSource["chapters"]>[number] }): RagSourceDocument {
  const chapterTitle = input.chapter.title || `Chapter ${input.chapter.chapter ?? "unknown"}`;
  const lines = compactLines([
    "Type: Chapter",
    `Manga: ${input.mangaTitle}`,
    `Chapter: ${[input.chapter.chapter, chapterTitle].filter(Boolean).join(" - ")}`,
    input.chapter.volume ? `Volume: ${input.chapter.volume}` : undefined,
    `Language: ${input.chapter.translatedLanguage}`,
    input.chapter.publishAt ? `Published: ${input.chapter.publishAt.toISOString()}` : undefined,
    `Pages: ${input.chapter.pages}`,
    input.chapter.scanlationGroup ? `Scanlation group: ${input.chapter.scanlationGroup}` : undefined
  ]);
  const content = lines.join("\n");

  return {
    sourceType: "CHAPTER",
    sourceId: input.chapter.id,
    parentSourceId: input.mangaId,
    title: `${input.mangaTitle} - ${chapterTitle}`,
    content,
    metadata: {
      mangaId: input.mangaId,
      chapter: input.chapter.chapter,
      volume: input.chapter.volume,
      language: input.chapter.translatedLanguage,
      pages: input.chapter.pages,
      scanlationGroup: input.chapter.scanlationGroup
    },
    contentHash: hashContent(content)
  };
}

function compactLines(lines: Array<string | undefined>) {
  return lines.filter((line): line is string => Boolean(line?.trim()));
}

function normalizeAltTitles(value: unknown) {
  if (!Array.isArray(value)) return [];
  const titles = new Set<string>();
  for (const item of value) {
    if (typeof item === "string") {
      titles.add(item);
      continue;
    }
    if (typeof item !== "object" || item === null) continue;
    for (const title of Object.values(item)) {
      if (typeof title === "string" && title.trim()) titles.add(title.trim());
    }
  }
  return [...titles].slice(0, 12);
}

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}
