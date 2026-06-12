import { indexCatalogForRag } from "../domain/services/rag-index.service.js";
import { prisma } from "../infrastructure/database/client.js";
import { assertOpenAiConfigured } from "../infrastructure/openai/openai.client.js";

async function main() {
  assertOpenAiConfigured();
  const args = new Set(process.argv.slice(2));
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const includeChapters = args.has("--chapters");
  const summary = await indexCatalogForRag({
    limit: Number.isFinite(limit) ? limit : undefined,
    includeChapters
  });
  console.info(JSON.stringify({ status: "completed", summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
