import type { LibraryItem } from "@/types";
import type { LibrarySortMode } from "./library.types";

export function filterLibraryItems(items: LibraryItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    const manga = item.manga;
    return [manga?.title, item.status, manga?.status, ...(manga?.tags ?? [])].filter(Boolean).some((value) => value!.toLowerCase().includes(needle));
  });
}

export function sortLibraryItems(items: LibraryItem[], sortMode: LibrarySortMode) {
  return items.toSorted((a, b) => {
    if (sortMode === "title") return getLibraryTitle(a).localeCompare(getLibraryTitle(b));
    if (sortMode === "status") return a.status.localeCompare(b.status) || getLibraryTitle(a).localeCompare(getLibraryTitle(b));
    if (sortMode === "favorite") return Number(b.isFavorite) - Number(a.isFavorite) || getLibraryActivityTime(b) - getLibraryActivityTime(a);
    if (sortMode === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    return getLibraryActivityTime(b) - getLibraryActivityTime(a);
  });
}

export function getLibraryActivityTime(item: LibraryItem) {
  return new Date(item.readingProgress?.updatedAt ?? item.lastReadAt ?? item.updatedAt ?? item.createdAt).getTime();
}

export function formatLibraryDate(item: LibraryItem) {
  const time = getLibraryActivityTime(item);
  return Number.isFinite(time) ? `Last read ${new Date(time).toLocaleDateString()}` : "Not started";
}

export function sortLabel(sortMode: LibrarySortMode) {
  if (sortMode === "updated") return "Recently updated";
  if (sortMode === "title") return "Title A-Z";
  if (sortMode === "status") return "Status";
  if (sortMode === "favorite") return "Favorite first";
  return "Last read";
}

function getLibraryTitle(item: LibraryItem) {
  return item.manga?.title ?? item.mangaId;
}
