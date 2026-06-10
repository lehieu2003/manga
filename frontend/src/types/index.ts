export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
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
  authors?: string[];
  artists?: string[];
  coverUrl?: string;
};

export type GenreSummary = {
  id?: string;
  name: string;
  group?: string;
  aliases?: string[];
  count: number;
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

export type Paginated<T> = {
  data: T[];
  limit: number;
  offset: number;
  total: number;
  source?: "live" | "cache" | "db";
  needsSync?: boolean;
};

export type ReaderPayload = {
  baseUrl: string;
  hash: string;
  pages: string[];
  dataSaverPages: string[];
  pageUrls: string[];
  dataSaverPageUrls: string[];
};

export type LibraryItem = {
  id: string;
  userId: string;
  mangaId: string;
  status: "READING" | "PLAN_TO_READ" | "COMPLETED" | "PAUSED" | "DROPPED";
  isFavorite: boolean;
  lastChapterId: string | null;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
  manga?: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> | null;
  readingProgress?: ReadingProgress | null;
};

export type ReadingProgress = {
  id: string;
  userId: string;
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MangaProgressPayload = {
  progress: ReadingProgress | null;
  chaptersProgress: ReadingProgress[];
  chapter?: ChapterSummary | null;
};

export type AdminOverview = {
  users: number;
  activeSessions: number;
  cachedManga: number;
  cachedChapters: number;
  libraryItems: number;
  readingProgress: number;
  searchHistory: number;
  latestCatalogFetchAt: string | null;
};

export type CatalogImportResponse = {
  status: "completed";
  summary: {
    mangaId: string;
    mangaSaved: boolean;
    chaptersFetched: number;
    readableChaptersSaved: number;
    zeroPageChaptersSkipped: number;
    source: "mangadex";
  };
};

export type CatalogSyncResponse = {
  status: "completed";
  summary: {
    mangaCount: number;
    cachedTotal: number;
  };
};

export type AdminCacheMangaRow = Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> & {
  fetchedAt: string;
  updatedAt: string;
  chapterCount: number;
};

export type AdminCacheMangaDetail = AdminCacheMangaRow &
  Pick<MangaSummary, "altTitles" | "description" | "contentRating">;

export type AdminUser = User & {
  counts: {
    activeSessions: number;
    libraryItems: number;
    readingProgress: number;
    searchHistory: number;
  };
};

export type AdminUserLibraryRow = LibraryItem;

export type AdminUserProgressRow = ReadingProgress & {
  manga?: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> | null;
  chapter?: Pick<ChapterSummary, "id" | "title" | "chapter" | "volume" | "translatedLanguage" | "pages" | "scanlationGroup"> | null;
};

export type AdminSearchHistoryRow = {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
};
