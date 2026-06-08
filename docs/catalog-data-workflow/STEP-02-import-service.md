# Step 02: MangaDex Import Service

Status: done

Completed verification:

- `npm --workspace backend test -- catalog-import.service catalog.routes catalog-cache.service`
- `npm --workspace backend run typecheck`

## Goal

Move MangaDex fetch/normalize/upsert behavior into one explicit import service used by scripts and future admin endpoints.

## Key Changes

- Create a catalog import service responsible for calling MangaDex official APIs.
- Keep the existing MangaDex client as the low-level HTTP adapter.
- Keep cache persistence in a dedicated service/repository boundary.
- Refactor `sync:mangadex` and `backfill:chapters` to use the import service.

## Import Responsibilities

The import service handles:

- Fetching manga detail.
- Fetching manga chapter feed.
- Applying default languages `vi,en`.
- Filtering or counting readable chapters with `pages > 0`.
- Upserting `CachedManga`.
- Upserting `CachedChapter`.
- Returning a structured summary.

Example summary:

```json
{
  "mangaId": "32d76d19-8a05-4db0-9fc2-e0b0648fe9d0",
  "mangaSaved": true,
  "chaptersFetched": 100,
  "readableChaptersSaved": 96,
  "zeroPageChaptersSkipped": 4,
  "source": "mangadex"
}
```

## Non-Goals

- Do not delete old cached chapters.
- Do not add a scheduler or queue in this step.
- Do not add user-facing sync buttons in this step.

## Tests

- Unit test import summary counts.
- Unit test zero-page chapter handling.
- Integration-style test verifies import service calls save/upsert functions with normalized MangaDex data.
