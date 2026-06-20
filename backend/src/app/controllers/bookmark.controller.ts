import type { z } from "zod";
import { bookmarkRepository, cachedCatalogRepository } from "../../domain/repositories/index.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { normalizeCoverProxyUrl } from "../../shared/utils/media-url.js";
import type { bookmarkListQuerySchema, createBookmarkSchema, updateBookmarkSchema } from "../validators/bookmark.validator.js";

type BookmarkListQuery = z.infer<typeof bookmarkListQuerySchema>;
type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;

export async function listBookmarks(userId: string, input: BookmarkListQuery) {
  const result = await bookmarkRepository.findByUser(userId, input);
  const [manga, chapters] = await Promise.all([
    cachedCatalogRepository.findMangaByIds([...new Set(result.data.map((item) => item.mangaId))]),
    cachedCatalogRepository.findChaptersByIds([...new Set(result.data.map((item) => item.chapterId))])
  ]);
  const mangaById = new Map(manga.map((item) => [item.id, item]));
  const chapterById = new Map(chapters.map((item) => [item.id, item]));

  return {
    ...result,
    data: result.data.map((item) => attachBookmarkMetadata(item, mangaById, chapterById))
  };
}

export async function getBookmarkByChapter(userId: string, chapterId: string) {
  const bookmark = await bookmarkRepository.findByUserAndChapter(userId, chapterId);
  return { bookmark };
}

export async function createBookmark(userId: string, input: CreateBookmarkInput) {
  const bookmark = await bookmarkRepository.upsert({ userId, ...input });
  return { bookmark };
}

export async function updateBookmark(userId: string, id: string, input: UpdateBookmarkInput) {
  const bookmark = await bookmarkRepository.update(userId, id, input);
  if (!bookmark) throw new HttpError(404, "Bookmark not found", "BOOKMARK_NOT_FOUND");
  return { bookmark };
}

export async function removeBookmark(userId: string, id: string) {
  const result = await bookmarkRepository.remove(userId, id);
  if (!result.count) throw new HttpError(404, "Bookmark not found", "BOOKMARK_NOT_FOUND");
  return { ok: true };
}

function attachBookmarkMetadata<
  TBookmark extends {
    mangaId: string;
    chapterId: string;
  }
>(
  bookmark: TBookmark,
  mangaById: Map<string, Awaited<ReturnType<typeof cachedCatalogRepository.findMangaByIds>>[number]>,
  chapterById: Map<string, Awaited<ReturnType<typeof cachedCatalogRepository.findChaptersByIds>>[number]>
) {
  const manga = mangaById.get(bookmark.mangaId);
  const chapter = chapterById.get(bookmark.chapterId);

  return {
    ...bookmark,
    manga: manga
      ? {
          id: manga.id,
          title: manga.title,
          coverUrl: normalizeCoverProxyUrl(manga.coverUrl),
          status: manga.status,
          year: manga.year,
          tags: manga.tags
        }
      : null,
    chapter: chapter
      ? {
          id: chapter.id,
          title: chapter.title,
          chapter: chapter.chapter,
          volume: chapter.volume,
          translatedLanguage: chapter.translatedLanguage,
          pages: chapter.pages,
          scanlationGroup: chapter.scanlationGroup
        }
      : null
  };
}
