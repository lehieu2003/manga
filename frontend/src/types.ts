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
  coverUrl?: string;
};

export type GenreSummary = {
  name: string;
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
  source?: "live" | "cache";
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
