import type { LibraryTab } from "./library.types";

export const libraryTabs: Array<{ label: string; value: LibraryTab }> = [
  { label: "Reading", value: "READING" },
  { label: "Favorites", value: "FAVORITES" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Paused", value: "PAUSED" }
];
