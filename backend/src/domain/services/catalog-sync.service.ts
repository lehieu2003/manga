import { prisma } from "../../infrastructure/database/client.js";
import { getChapters, searchManga } from "../../infrastructure/mangadex/mangadex.client.js";
import { saveChapterBatch, saveMangaBatch } from "./catalog-cache.service.js";

export async function syncMangaDexCatalog(options: { limit: number; includeChapters: boolean; query?: string; languages?: string[]; chaptersLimit?: number }) {
  const result = await searchManga({
    q: options.query,
    limit: options.limit,
    offset: 0,
    languages: options.languages ?? ["vi", "en"],
    tags: []
  });

  await saveMangaBatch(result.data);

  if (options.includeChapters) {
    for (const manga of result.data) {
      const chapters = await getChapters({
        mangaId: manga.id,
        limit: options.chaptersLimit ?? 32,
        offset: 0,
        translatedLanguage: options.languages ?? ["vi", "en"]
      });
      await saveChapterBatch(manga.id, chapters.data);
    }
  }

  return {
    mangaCount: result.data.length,
    cachedTotal: await prisma.cachedManga.count()
  };
}
