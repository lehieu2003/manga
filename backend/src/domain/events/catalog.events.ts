export type CatalogEvent =
  | { type: "catalog.manga_cached"; mangaId: string }
  | { type: "catalog.chapters_imported"; mangaId: string; chaptersFetched: number; readableChaptersSaved: number; zeroPageChaptersSkipped: number }
  | { type: "catalog.sync_completed"; mangaCount: number; cachedTotal: number };
