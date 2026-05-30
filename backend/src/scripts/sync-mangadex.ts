import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { syncMangaDexCatalog } from "../modules/catalog/sync.service.js";

const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const chaptersLimitArg = Number(process.argv.find((arg) => arg.startsWith("--chapters-limit="))?.split("=")[1]);
const queryArg = process.argv.find((arg) => arg.startsWith("--query="))?.split("=").slice(1).join("=");
const languagesArg = process.argv.find((arg) => arg.startsWith("--languages="))?.split("=")[1];
const includeChapters = process.argv.includes("--chapters");

try {
  const result = await syncMangaDexCatalog({
    limit: Number.isFinite(limitArg) && limitArg > 0 ? Math.min(limitArg, 100) : env.SYNC_LIMIT,
    includeChapters,
    query: queryArg || undefined,
    languages: languagesArg ? languagesArg.split(",").map((language) => language.trim()).filter(Boolean) : undefined,
    chaptersLimit: Number.isFinite(chaptersLimitArg) && chaptersLimitArg > 0 ? Math.min(chaptersLimitArg, 100) : undefined
  });
  console.log(`Synced ${result.mangaCount} MangaDex manga. Cached total: ${result.cachedTotal}.`);
} finally {
  await prisma.$disconnect();
  redis.disconnect();
}
