import { prisma } from "../../infrastructure/database/client.js";
import { searchManga } from "../../infrastructure/mangadex/mangadex.client.js";
import { saveMangaBatch } from "./catalog-cache.service.js";
import { importMangaChapters } from "./catalog-import.service.js";

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
      await importMangaChapters({
        mangaId: manga.id,
        limit: options.chaptersLimit ?? 32,
        offset: 0,
        languages: options.languages ?? ["vi", "en"]
      });
    }
  }

  return {
    mangaCount: result.data.length,
    cachedTotal: await prisma.cachedManga.count()
  };
}
