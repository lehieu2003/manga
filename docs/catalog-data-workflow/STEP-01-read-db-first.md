# Step 01: Read API DB-First

Status: planned

## Goal

Make user-facing chapter reads stable by reading PostgreSQL cache first and removing MangaDex live calls from the chapter list read path.

## Key Changes

- Change `GET /api/manga/:id/chapters` into a read-only DB-backed endpoint.
- Query `CachedChapter` by `mangaId`, `translatedLanguage`, `limit`, and `offset`.
- Filter reader-facing chapter rows to `pages > 0`.
- Keep existing frontend route and query parameters stable.
- Do not call MangaDex from this endpoint.
- Do not write PostgreSQL from this endpoint.

## API Behavior

When readable cached chapters exist:

```json
{
  "data": [],
  "limit": 100,
  "offset": 0,
  "total": 481,
  "source": "db",
  "needsSync": false
}
```

When no readable cached chapters exist:

```json
{
  "data": [],
  "limit": 100,
  "offset": 0,
  "total": 0,
  "source": "db",
  "needsSync": true
}
```

Use HTTP `202` for the cache-miss response so callers can distinguish "sync needed" from a real empty filter result.

## Acceptance Checks

- Manga id `32d76d19-8a05-4db0-9fc2-e0b0648fe9d0` returns cached readable chapters when they exist in DB.
- Rows with `pages = 0` are excluded from the response.
- Redis does not cache an empty live MangaDex response for this read route.
- The route remains paginated and keeps the existing `limit` max.

## Tests

- Backend route test: DB has readable chapters, response is `200`, `source: "db"`, and `total > 0`.
- Backend route test: DB has only zero-page chapters, response is `202` and `needsSync: true`.
- Backend route test: MangaDex client is not called by the read endpoint.
