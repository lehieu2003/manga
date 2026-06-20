import type { FastifyReply, FastifyRequest } from "fastify";
import { cached, makeCacheKey } from "../../infrastructure/cache/cache.service.js";
import { getMangaDexCoverBaseUrls, getReader } from "../../infrastructure/mangadex/mangadex.client.js";
import { HttpError } from "../../shared/errors/http-error.js";
import { mediaCacheControl, proxyMangaDexImage } from "../services/media-proxy.service.js";

export async function proxyCoverImage(request: FastifyRequest, reply: FastifyReply, input: { mangaId: string; fileName: string }) {
  const urls = getMangaDexCoverBaseUrls().map((baseUrl) => `${baseUrl}/covers/${input.mangaId}/${input.fileName}`);
  try {
    return await proxyMangaDexImage({
      request,
      reply,
      urls,
      timeoutMs: 10_000,
      cacheControl: mediaCacheControl.cover,
      fetchFailedMessage: "Unable to fetch MangaDex cover",
      fetchFailedCode: "COVER_FETCH_FAILED",
      timeoutCode: "COVER_FETCH_TIMEOUT"
    });
  } catch (error) {
    if (!(error instanceof HttpError) || error.statusCode < 500) {
      throw error;
    }

    request.log.warn({ err: error, mangaId: input.mangaId, fileName: input.fileName }, "redirecting cover request after MangaDex cover proxy failure");
    const fallbackUrl = urls[0];
    if (!fallbackUrl) throw error;
    reply.header("Cache-Control", "no-store");
    reply.header("X-Media-Fallback", "cover-redirect");
    return reply.redirect(fallbackUrl, 302);
  }
}

export async function proxyChapterPageImage(request: FastifyRequest, reply: FastifyReply, input: { chapterId: string; mode: "data" | "data-saver"; fileName: string }) {
  const reader = await cached(makeCacheKey("chapter:reader:origin", { chapterId: input.chapterId }), 300, () => getReader(input.chapterId));
  const availablePages = input.mode === "data" ? reader.pages : reader.dataSaverPages;

  if (!availablePages.includes(input.fileName)) {
    throw new HttpError(404, "Chapter page was not found", "PAGE_NOT_FOUND");
  }

  const url = `${reader.baseUrl}/${input.mode}/${reader.hash}/${input.fileName}`;
  try {
    return await proxyMangaDexImage({
      request,
      reply,
      url,
      timeoutMs: 15_000,
      cacheControl: mediaCacheControl.page,
      fetchFailedMessage: "Unable to fetch MangaDex page",
      fetchFailedCode: "PAGE_FETCH_FAILED",
      timeoutCode: "PAGE_FETCH_TIMEOUT"
    });
  } catch (error) {
    if (!(error instanceof HttpError) || error.statusCode < 500) {
      throw error;
    }

    request.log.warn({ err: error, chapterId: input.chapterId, mode: input.mode, fileName: input.fileName }, "redirecting page request after MangaDex page proxy failure");
    reply.header("Cache-Control", "no-store");
    reply.header("X-Media-Fallback", "page-redirect");
    return reply.redirect(url, 302);
  }
}
