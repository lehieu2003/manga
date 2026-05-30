import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ChapterSummary, MangaSummary } from "../mangadex/mangadex.types.js";

const UPLOADS_PATTERN = /^https:\/\/uploads\.mangadex\.(org|dev)\/covers\/([^/]+)\/(.+)$/;

export async function saveMangaBatch(manga: MangaSummary[]) {
  await Promise.all(manga.map((item) => saveManga(item)));
}

export async function saveManga(manga: MangaSummary) {
  await prisma.cachedManga.upsert({
    where: { id: manga.id },
    create: toCachedMangaData(manga),
    update: toCachedMangaData(manga)
  });
}

export async function saveChapterBatch(mangaId: string, chapters: ChapterSummary[]) {
  await Promise.all(
    chapters.map((chapter) =>
      prisma.cachedChapter.upsert({
        where: { id: chapter.id },
        create: toCachedChapterData(mangaId, chapter),
        update: toCachedChapterData(mangaId, chapter)
      })
    )
  );
}

export async function searchCachedManga(input: { q?: string; limit: number; offset: number }) {
  const where: Prisma.CachedMangaWhereInput = input.q
    ? {
        OR: [
          { title: { contains: input.q, mode: "insensitive" } },
          { description: { contains: input.q, mode: "insensitive" } }
        ]
      }
    : {};

  const [data, total] = await prisma.$transaction([
    prisma.cachedManga.findMany({
      where,
      orderBy: [{ fetchedAt: "desc" }, { title: "asc" }],
      take: input.limit,
      skip: input.offset
    }),
    prisma.cachedManga.count({ where })
  ]);

  return {
    limit: input.limit,
    offset: input.offset,
    total,
    data: data.map(fromCachedManga)
  };
}

export async function getCachedManga(id: string) {
  const manga = await prisma.cachedManga.findUnique({ where: { id } });
  return manga ? fromCachedManga(manga) : null;
}

export async function getCachedChapters(input: { mangaId: string; limit: number; offset: number; translatedLanguage: string[] }) {
  const where: Prisma.CachedChapterWhereInput = {
    mangaId: input.mangaId,
    translatedLanguage: { in: input.translatedLanguage }
  };

  const [data, total] = await prisma.$transaction([
    prisma.cachedChapter.findMany({
      where,
      orderBy: [{ volume: "asc" }, { chapter: "asc" }, { publishAt: "asc" }],
      take: input.limit,
      skip: input.offset
    }),
    prisma.cachedChapter.count({ where })
  ]);

  return {
    limit: input.limit,
    offset: input.offset,
    total,
    data: data.map(fromCachedChapter)
  };
}

function toCachedMangaData(manga: MangaSummary) {
  return {
    id: manga.id,
    title: manga.title,
    altTitles: manga.altTitles,
    description: manga.description,
    status: manga.status,
    year: manga.year,
    contentRating: manga.contentRating,
    tags: manga.tags,
    coverUrl: toLocalCoverUrl(manga.coverUrl),
    fetchedAt: new Date()
  };
}

function toCachedChapterData(mangaId: string, chapter: ChapterSummary) {
  return {
    id: chapter.id,
    mangaId,
    title: chapter.title,
    chapter: chapter.chapter,
    volume: chapter.volume,
    translatedLanguage: chapter.translatedLanguage,
    publishAt: chapter.publishAt ? new Date(chapter.publishAt) : null,
    pages: chapter.pages,
    scanlationGroup: chapter.scanlationGroup,
    fetchedAt: new Date()
  };
}

function fromCachedManga(manga: {
  id: string;
  title: string;
  altTitles: Prisma.JsonValue;
  description: string;
  status: string | null;
  year: number | null;
  contentRating: string | null;
  tags: string[];
  coverUrl: string | null;
}): MangaSummary {
  return {
    id: manga.id,
    title: manga.title,
    altTitles: Array.isArray(manga.altTitles) ? manga.altTitles.filter((item): item is string => typeof item === "string") : [],
    description: manga.description,
    status: manga.status ?? undefined,
    year: manga.year ?? undefined,
    contentRating: manga.contentRating ?? undefined,
    tags: manga.tags,
    coverUrl: toLocalCoverUrl(manga.coverUrl ?? undefined)
  };
}

function fromCachedChapter(chapter: {
  id: string;
  title: string;
  chapter: string | null;
  volume: string | null;
  translatedLanguage: string;
  publishAt: Date | null;
  pages: number;
  scanlationGroup: string | null;
}): ChapterSummary {
  return {
    id: chapter.id,
    title: chapter.title,
    chapter: chapter.chapter,
    volume: chapter.volume,
    translatedLanguage: chapter.translatedLanguage,
    publishAt: chapter.publishAt?.toISOString() ?? "",
    pages: chapter.pages,
    scanlationGroup: chapter.scanlationGroup ?? undefined
  };
}

function toLocalCoverUrl(coverUrl: string | undefined) {
  if (!coverUrl) return undefined;
  const match = coverUrl.match(UPLOADS_PATTERN);
  if (!match) return coverUrl;
  return `/api/covers/${match[2]}/${match[3]}`;
}
