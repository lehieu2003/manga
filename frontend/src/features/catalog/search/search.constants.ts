import type { ContentRating, MangaDiscoverySort, MangaStatus } from "./search.types";

export const sortOptions: Array<{ value: MangaDiscoverySort; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "latest", label: "Latest update" },
  { value: "followed", label: "Followed count" },
  { value: "title", label: "Title A-Z" },
  { value: "created", label: "Created newest" },
  { value: "updated", label: "Updated newest" }
];

export const statusOptions: Array<{ value: MangaStatus; label: string }> = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "hiatus", label: "Hiatus" },
  { value: "cancelled", label: "Cancelled" }
];

export const contentRatingOptions: Array<{ value: ContentRating; label: string }> = [
  { value: "safe", label: "Safe" },
  { value: "suggestive", label: "Suggestive" }
];
