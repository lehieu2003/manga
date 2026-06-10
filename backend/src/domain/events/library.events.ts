import type { LibraryStatus } from "@prisma/client";

export type LibraryEvent =
  | { type: "library.item_upserted"; userId: string; mangaId: string; status?: LibraryStatus; isFavorite?: boolean }
  | { type: "library.item_removed"; userId: string; mangaId: string; removedCount: number };
