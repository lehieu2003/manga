export type MangaDexEntity<TAttributes = Record<string, unknown>> = {
  id: string;
  type: string;
  attributes: TAttributes;
  relationships?: Array<{
    id: string;
    type: string;
    attributes?: Record<string, unknown>;
  }>;
};

export type MangaDexListResponse<TAttributes = Record<string, unknown>> = {
  result: string;
  response: string;
  data: Array<MangaDexEntity<TAttributes>>;
  limit: number;
  offset: number;
  total: number;
};

export type MangaDexSingleResponse<TAttributes = Record<string, unknown>> = {
  result: string;
  response: string;
  data: MangaDexEntity<TAttributes>;
};

export type MangaSummary = {
  id: string;
  title: string;
  altTitles: string[];
  description: string;
  status?: string;
  year?: number;
  contentRating?: string;
  tags: string[];
  coverUrl?: string;
};

export type ChapterSummary = {
  id: string;
  title: string;
  chapter: string | null;
  volume: string | null;
  translatedLanguage: string;
  publishAt: string;
  pages: number;
  scanlationGroup?: string;
};

export type ReaderPayload = {
  baseUrl: string;
  hash: string;
  pages: string[];
  dataSaverPages: string[];
  pageUrls: string[];
  dataSaverPageUrls: string[];
};

export type SourceAware<T> = T & {
  source: "live" | "cache";
};
