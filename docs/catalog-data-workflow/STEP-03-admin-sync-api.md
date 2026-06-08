# Step 03: Admin Sync API

Status: done

Completed verification:

- `npm --workspace backend test -- admin.catalog.routes catalog-import.service catalog.routes swagger.routes`
- `npm --workspace backend run typecheck`

## Goal

Expose protected manual sync endpoints so developers/operators can import MangaDex data without mixing sync behavior into frontend read routes.

## Auth

Use an environment token for the first version:

- Add `ADMIN_SYNC_TOKEN`.
- Require `X-Admin-Token`.
- Missing token returns `401`.
- Wrong token returns `403`.

Do not add user roles or admin UI in this step.

## Endpoints

```text
POST /api/admin/catalog/manga/:id/import
POST /api/admin/catalog/manga/:id/chapters/import
POST /api/admin/catalog/sync
```

Expected behavior:

- Manga import endpoint imports manga detail and optionally chapters.
- Chapter import endpoint imports chapter feed for one manga.
- Batch sync endpoint mirrors existing script behavior for query/limit/languages/chapter options.
- All endpoints return structured import summaries.

## Response Shape

Successful import:

```json
{
  "status": "completed",
  "summary": {
    "mangaId": "uuid",
    "chaptersFetched": 100,
    "readableChaptersSaved": 96
  }
}
```

Failed upstream request:

```json
{
  "error": {
    "code": "MANGADEX_ERROR",
    "message": "MangaDex request failed"
  }
}
```

## Tests

- Missing admin token is rejected.
- Wrong admin token is rejected.
- Correct admin token calls the import service.
- Import response includes summary counts.
