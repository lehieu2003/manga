import { getChapters, getManga } from "../../infrastructure/mangadex/mangadex.client.js";
import { saveChapterBatch, saveManga } from "./catalog-cache.service.js";

const DEFAULT_LANGUAGES = ["vi", "en"];

export type CatalogImportSummary = {
  mangaId: string;
  mangaSaved: boolean;
  chaptersFetched: number;
  readableChaptersSaved: number;
  zeroPageChaptersSkipped: number;
  source: "mangadex";
};

export async function importMangaDetail(mangaId: string): Promise<CatalogImportSummary> {
  const manga = await getManga(mangaId);
  await saveManga(manga);

  return {
    mangaId,
    mangaSaved: true,
    chaptersFetched: 0,
    readableChaptersSaved: 0,
    zeroPageChaptersSkipped: 0,
    source: "mangadex"
  };
}

export async function importMangaChapters(input: { mangaId: string; limit?: number; offset?: number; languages?: string[] }): Promise<CatalogImportSummary> {
  const result = await getChapters({
    mangaId: input.mangaId,
    limit: input.limit ?? 100,
    offset: input.offset ?? 0,
    translatedLanguage: input.languages?.length ? input.languages : DEFAULT_LANGUAGES
  });
  const readableChapters = result.data.filter((chapter) => chapter.pages > 0);
  await saveChapterBatch(input.mangaId, readableChapters);

  return {
    mangaId: input.mangaId,
    mangaSaved: false,
    chaptersFetched: result.data.length,
    readableChaptersSaved: readableChapters.length,
    zeroPageChaptersSkipped: result.data.length - readableChapters.length,
    source: "mangadex"
  };
}

export async function importMangaWithChapters(input: { mangaId: string; chaptersLimit?: number; languages?: string[] }): Promise<CatalogImportSummary> {
  await importMangaDetail(input.mangaId);
  const chapters = await importMangaChapters({ mangaId: input.mangaId, limit: input.chaptersLimit, languages: input.languages });

  return {
    ...chapters,
    mangaSaved: true
  };
}
