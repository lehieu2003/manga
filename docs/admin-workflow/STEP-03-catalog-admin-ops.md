# Step 03: Catalog Admin Ops

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`

## Goal

Let an operator run MangaDex catalog sync/import from the admin UI and manage cached manga/chapter rows.

## Key Changes

- Reuse existing catalog admin endpoints in the UI:
  - `POST /api/admin/catalog/sync`
  - `POST /api/admin/catalog/manga/:id/import`
  - `POST /api/admin/catalog/manga/:id/chapters/import`
- Add cache management endpoints:
  - `GET /api/admin/catalog/cache/manga`
  - `GET /api/admin/catalog/cache/manga/:mangaId`
  - `DELETE /api/admin/catalog/cache/manga/:mangaId`
  - `DELETE /api/admin/catalog/cache/manga/:mangaId/chapters`
- Add admin UI sections for sync/import and cache browsing.
- Require confirmation for cache delete actions.

## API Behavior

Cache list endpoint:

- Accepts `query`, `limit`, and `offset`.
- Uses offset pagination with default `limit=25` and max `100`.
- Searches cached manga by title or id.
- Returns manga summary rows with chapter count when practical.

Cache delete endpoints:

```json
{
  "ok": true,
  "summary": {
    "affectedCount": 42
  }
}
```

Rules:

- Deleting a cached manga also deletes cached chapters through the existing relation cascade.
- Deleting chapters for one manga does not delete the manga row.
- Catalog sync/import responses keep their current successful response shapes.

## UI Behavior

- Catalog sync form supports query, limit, languages, include chapters, and chapters limit.
- Manga import form supports manga id, include chapters, languages, and chapter limit.
- Chapter import form supports manga id, languages, limit, and offset.
- Successful operations show summary counts.
- Failed operations show backend error messages.
- Cache table supports search, pagination, detail open, delete manga cache, and delete chapter cache.

## Tests

- Backend validates cache list query params and admin token.
- Backend cache delete endpoints return affected counts.
- Backend existing sync/import route tests still pass.
- Frontend sync form calls the expected endpoint and params.
- Frontend import forms call the expected endpoint and params.
- Frontend destructive cache actions require confirmation before API calls.
