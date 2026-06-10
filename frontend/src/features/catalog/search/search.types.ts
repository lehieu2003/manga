export type MangaDiscoverySort = "relevance" | "latest" | "followed" | "title" | "created" | "updated";
export type MangaStatus = "ongoing" | "completed" | "hiatus" | "cancelled";
export type ContentRating = "safe" | "suggestive";
export type DiscoveryPreset = "latest" | "popular" | "search";

export type DiscoveryState = {
  query: string;
  includedTags: string[];
  excludedTags: string[];
  contentRating: ContentRating[];
  status: MangaStatus[];
  year: string;
  author: string;
  artist: string;
  sort: MangaDiscoverySort;
};

export type DiscoveryAction =
  | { type: "queryChanged"; value: string }
  | { type: "includedTagToggled"; value: string }
  | { type: "excludedTagToggled"; value: string }
  | { type: "contentRatingToggled"; value: ContentRating }
  | { type: "statusToggled"; value: MangaStatus }
  | { type: "yearChanged"; value: string }
  | { type: "authorChanged"; value: string }
  | { type: "artistChanged"; value: string }
  | { type: "sortChanged"; value: MangaDiscoverySort }
  | { type: "cleared"; routeGenre: string; defaultSort: MangaDiscoverySort };
