import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cached, makeCacheKey } from "../../lib/cache.js";
import { HttpError } from "../../lib/http-error.js";
import { getReader } from "../mangadex/mangadex.client.js";

const uuidSchema = z.string().uuid();
const modeSchema = z.enum(["data", "data-saver"]);
const fileNameSchema = z.string().regex(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/);

export async function pageRoutes(app: FastifyInstance) {
  app.get("/pages/:chapterId/:mode/:fileName", async (request, reply) => {
    const { chapterId, mode, fileName } = z.object({ chapterId: uuidSchema, mode: modeSchema, fileName: fileNameSchema }).parse(request.params);
    const reader = await cached(makeCacheKey("chapter:reader:origin", { chapterId }), 300, () => getReader(chapterId));
    const availablePages = mode === "data" ? reader.pages : reader.dataSaverPages;

    if (!availablePages.includes(fileName)) {
      throw new HttpError(404, "Chapter page was not found", "PAGE_NOT_FOUND");
    }

    const url = `${reader.baseUrl}/${mode}/${reader.hash}/${fileName}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mangadex-reader/0.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new HttpError(response.status, "Unable to fetch MangaDex page", "PAGE_FETCH_FAILED");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    reply.header("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
    return reply.send(bytes);
  });
}
