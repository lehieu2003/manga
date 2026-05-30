import { env } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { syncMangaDexCatalog } from "../modules/catalog/sync.service.js";

const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const includeChapters = process.argv.includes("--chapters");

try {
  const result = await syncMangaDexCatalog({
    limit: Number.isFinite(limitArg) && limitArg > 0 ? Math.min(limitArg, 100) : env.SYNC_LIMIT,
    includeChapters
  });
  console.log(`Synced ${result.mangaCount} MangaDex manga. Cached total: ${result.cachedTotal}.`);
} finally {
  await prisma.$disconnect();
  redis.disconnect();
}
