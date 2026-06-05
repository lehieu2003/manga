import { env } from "../configs/app.config.js";

const UPLOADS_COVER_PATTERN = /^https:\/\/uploads\.mangadex\.(org|dev)\/covers\/([^/]+)\/(.+)$/;

export function buildMediaUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!env.PUBLIC_MEDIA_BASE_URL) return normalizedPath;
  return `${env.PUBLIC_MEDIA_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}

export function buildCoverProxyUrl(mangaId: string, fileName: string) {
  return buildMediaUrl(`/api/covers/${mangaId}/${fileName}`);
}

export function buildPageProxyUrl(chapterId: string, mode: "data" | "data-saver", fileName: string) {
  return buildMediaUrl(`/api/pages/${chapterId}/${mode}/${fileName}`);
}

export function normalizeCoverProxyUrl(coverUrl: string | null | undefined) {
  if (!coverUrl) return undefined;
  if (coverUrl.startsWith("/api/covers/")) return buildMediaUrl(coverUrl);

  const match = coverUrl.match(UPLOADS_COVER_PATTERN);
  if (!match) return coverUrl;

  return buildCoverProxyUrl(match[2], match[3]);
}
