export type CatalogEvent =
  | { type: "catalog.manga_cached"; mangaId: string }
  | { type: "catalog.sync_completed"; mangaCount: number; cachedTotal: number };
