import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../../lib/http-error.js";
import { getMangaDexUploadsBaseUrl } from "../mangadex/mangadex.client.js";

const uuidSchema = z.string().uuid();
const fileNameSchema = z.string().regex(/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)(\.512\.jpg)?$/);

export async function coverRoutes(app: FastifyInstance) {
  app.get("/covers/:mangaId/:fileName", async (request, reply) => {
    const { mangaId, fileName } = z.object({ mangaId: uuidSchema, fileName: fileNameSchema }).parse(request.params);
    const url = `${getMangaDexUploadsBaseUrl()}/covers/${mangaId}/${fileName}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mangadex-reader/0.1",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new HttpError(response.status, "Unable to fetch MangaDex cover", "COVER_FETCH_FAILED");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    reply.header("Cache-Control", "public, max-age=86400");
    reply.header("Content-Type", response.headers.get("content-type") ?? "image/jpeg");
    return reply.send(bytes);
  });
}
