import type { FastifyInstance } from "fastify";
import { syncMangaDexCatalog } from "../../../domain/services/catalog-sync.service.js";
import { importMangaChapters, importMangaDetail, importMangaWithChapters } from "../../../domain/services/catalog-import.service.js";
import { env } from "../../../shared/configs/app.config.js";
import { requireAdminToken } from "../../middlewares/admin.middleware.js";
import { mangaParamsSchema } from "../../validators/catalog.validator.js";
import { adminCatalogRouteSchemas } from "../../docs/route-schemas.js";

function parseCsv(value: unknown, fallback: string[]) {
  if (typeof value !== "string") return fallback;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function parsePositiveNumber(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

export async function adminCatalogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    requireAdminToken(request);
  });

  app.post("/admin/catalog/manga/:id/import", { schema: adminCatalogRouteSchemas.importManga }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = request.query as Record<string, unknown>;
    const includeChapters = query.includeChapters === "true";

    const summary = includeChapters
      ? await importMangaWithChapters({
          mangaId: id,
          chaptersLimit: parsePositiveNumber(query.chaptersLimit, 100, 100),
          languages: parseCsv(query.languages, ["vi", "en"])
        })
      : await importMangaDetail(id);

    return { status: "completed" as const, summary };
  });

  app.post("/admin/catalog/manga/:id/chapters/import", { schema: adminCatalogRouteSchemas.importMangaChapters }, async (request) => {
    const { id } = mangaParamsSchema.parse(request.params);
    const query = request.query as Record<string, unknown>;
    const summary = await importMangaChapters({
      mangaId: id,
      limit: parsePositiveNumber(query.limit, 100, 100),
      offset: Math.max(0, Number(query.offset) || 0),
      languages: parseCsv(query.languages, ["vi", "en"])
    });

    return { status: "completed" as const, summary };
  });

  app.post("/admin/catalog/sync", { schema: adminCatalogRouteSchemas.syncCatalog }, async (request) => {
    const query = request.query as Record<string, unknown>;
    const result = await syncMangaDexCatalog({
      limit: parsePositiveNumber(query.limit, env.SYNC_LIMIT, 100),
      includeChapters: query.includeChapters === "true",
      query: typeof query.q === "string" && query.q.trim() ? query.q.trim() : undefined,
      languages: parseCsv(query.languages, ["vi", "en"]),
      chaptersLimit: parsePositiveNumber(query.chaptersLimit, 32, 100)
    });

    return { status: "completed" as const, summary: result };
  });
}
