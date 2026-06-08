import { importMangaChapters } from "../domain/services/catalog-import.service.js";
import { redis } from "../infrastructure/cache/client.js";
import { prisma } from "../infrastructure/database/client.js";

const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const delayArg = Number(process.argv.find((arg) => arg.startsWith("--delay-ms="))?.split("=")[1]);
const languagesArg = process.argv.find((arg) => arg.startsWith("--languages="))?.split("=")[1];

const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : undefined;
const delayMs = Number.isFinite(delayArg) && delayArg >= 0 ? delayArg : 350;
const translatedLanguage = languagesArg
  ? languagesArg
      .split(",")
      .map((language) => language.trim())
      .filter(Boolean)
  : ["vi", "en"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const cachedManga = await prisma.cachedManga.findMany({
    select: {
      id: true,
      title: true,
      chapters: {
        where: { pages: { gt: 0 } },
        select: { id: true },
        take: 1
      }
    },
    orderBy: [{ fetchedAt: "desc" }, { title: "asc" }]
  });

  const missingReadableChapters = cachedManga.filter((manga) => manga.chapters.length === 0);
  const targets = limit ? missingReadableChapters.slice(0, limit) : missingReadableChapters;
  const stillEmpty: string[] = [];
  const errors: string[] = [];
  let fetched = 0;
  let savedReadableChapters = 0;

  console.log(`Missing readable chapters before: ${missingReadableChapters.length}`);
  console.log(`Backfill target count: ${targets.length}`);
  console.log(`Languages: ${translatedLanguage.join(",")}`);

  for (const [index, manga] of targets.entries()) {
    try {
      const result = await importMangaChapters({
        mangaId: manga.id,
        limit: 100,
        offset: 0,
        languages: translatedLanguage
      });

      const readableCount = result.readableChaptersSaved;
      fetched += 1;
      savedReadableChapters += readableCount;

      if (readableCount === 0) {
        stillEmpty.push(`${manga.id} ${manga.title}`);
      }

      console.log(`${index + 1}/${targets.length} saved=${readableCount} ${manga.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${manga.id} ${manga.title}: ${message}`);
      console.log(`${index + 1}/${targets.length} error ${manga.title}: ${message}`);
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const refreshedManga = await prisma.cachedManga.findMany({
    select: {
      id: true,
      chapters: {
        where: { pages: { gt: 0 } },
        select: { id: true },
        take: 1
      }
    }
  });
  const missingReadableAfter = refreshedManga.filter((manga) => manga.chapters.length === 0).length;

  console.log(
    JSON.stringify(
      {
        fetched,
        savedReadableChapters,
        stillEmpty: stillEmpty.length,
        failed: errors.length,
        missingReadableAfter,
        stillEmptySample: stillEmpty.slice(0, 20),
        errorsSample: errors.slice(0, 20)
      },
      null,
      2
    )
  );
} finally {
  await prisma.$disconnect();
  redis.disconnect();
}
