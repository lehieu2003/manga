import { prisma } from "../../lib/prisma.js";
import { getChapters, searchManga } from "../mangadex/mangadex.client.js";
import { saveChapterBatch, saveMangaBatch } from "./catalog-cache.service.js";

export async function syncMangaDexCatalog(options: { limit: number; includeChapters: boolean }) {
  const result = await searchManga({
    limit: options.limit,
    offset: 0,
    languages: ["vi", "en"],
    tags: []
  });

  await saveMangaBatch(result.data);

  if (options.includeChapters) {
    for (const manga of result.data) {
      const chapters = await getChapters({
        mangaId: manga.id,
        limit: 32,
        offset: 0,
        translatedLanguage: ["vi", "en"]
      });
      await saveChapterBatch(manga.id, chapters.data);
    }
  }

  return {
    mangaCount: result.data.length,
    cachedTotal: await prisma.cachedManga.count()
  };
}
