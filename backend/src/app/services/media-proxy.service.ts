import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "../../shared/errors/http-error.js";

const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const USER_AGENT = "mangadex-reader/0.1";
const FORWARDED_REQUEST_HEADERS = ["if-none-match", "if-modified-since"] as const;
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-length", "etag", "last-modified"] as const;

export const mediaCacheControl = {
  cover: "public, max-age=604800, stale-while-revalidate=86400",
  page: "public, max-age=86400, stale-while-revalidate=3600"
} as const;

type ProxyImageOptions = {
  request: FastifyRequest;
  reply: FastifyReply;
  url?: string;
  urls?: string[];
  timeoutMs: number;
  cacheControl: string;
  fetchFailedMessage: string;
  fetchFailedCode: string;
  timeoutCode: string;
};

export async function proxyMangaDexImage(options: ProxyImageOptions) {
  const urls = options.urls?.length ? options.urls : options.url ? [options.url] : [];
  if (urls.length === 0) {
    throw new HttpError(500, "Image proxy did not receive an upstream URL", options.fetchFailedCode);
  }

  let response: Response | undefined;
  let lastError: HttpError | undefined;

  for (const url of urls) {
    try {
      response = await fetchUpstreamImage({ ...options, url });
      if (response.ok || response.status === 304) break;
      lastError = new HttpError(response.status, options.fetchFailedMessage, options.fetchFailedCode);
    } catch (error) {
      if (error instanceof HttpError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (!response || (!response.ok && response.status !== 304)) {
    throw lastError ?? new HttpError(502, options.fetchFailedMessage, options.fetchFailedCode);
  }

  return sendImageResponse(options, response);
}

async function fetchUpstreamImage(options: ProxyImageOptions & { url: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await fetch(options.url, {
      signal: controller.signal,
      headers: buildUpstreamHeaders(options.request)
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new HttpError(504, "Timed out while fetching MangaDex image", options.timeoutCode);
    }
    throw new HttpError(502, "Unable to reach MangaDex image origin", options.fetchFailedCode);
  } finally {
    clearTimeout(timeout);
  }
}

function sendImageResponse(options: ProxyImageOptions, response: Response) {
  options.reply.code(response.status);
  options.reply.header("Cache-Control", options.cacheControl);
  options.reply.header("Cross-Origin-Resource-Policy", "cross-origin");

  for (const header of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(header);
    if (value) options.reply.header(header, value);
  }

  if (response.status === 304) return options.reply.send();

  if (!response.body) {
    throw new HttpError(502, "MangaDex image response did not include a body", options.fetchFailedCode);
  }

  return options.reply.send(Readable.fromWeb(response.body as unknown as NodeReadableStream));
}

function buildUpstreamHeaders(request: FastifyRequest) {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: IMAGE_ACCEPT
  };

  for (const header of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers[header];
    if (typeof value === "string") headers[header] = value;
  }

  return headers;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
