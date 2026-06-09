# Step 05: Library, Progress, And History Admin

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`

## Goal

Let an admin manage the data attached to a user: library items, reading progress, and search history.

## Key Changes

- Add library admin endpoints:
  - `GET /api/admin/users/:userId/library`
  - `PATCH /api/admin/users/:userId/library/:mangaId`
  - `DELETE /api/admin/users/:userId/library/:mangaId`
- Add progress admin endpoints:
  - `GET /api/admin/users/:userId/progress`
  - `PATCH /api/admin/users/:userId/progress/:chapterId`
  - `DELETE /api/admin/users/:userId/progress/:chapterId`
- Add search history admin endpoints:
  - `GET /api/admin/users/:userId/search-history`
  - `DELETE /api/admin/users/:userId/search-history`
- Add Library, Progress, and Search History tabs to user detail.
- Invalidate relevant admin UI queries after mutations.

## API Behavior

List endpoints:

- Use offset pagination with default `limit=25` and max `100`.
- Return cached manga/chapter metadata when available.
- Return null metadata when related cached rows are missing instead of failing.

Library update:

```json
{
  "status": "READING",
  "isFavorite": true,
  "lastChapterId": "chapter-id"
}
```

Progress update:

```json
{
  "mangaId": "manga-id",
  "pageIndex": 12,
  "completed": false
}
```

Delete and clear endpoints return:

```json
{
  "ok": true,
  "summary": {
    "affectedCount": 1
  }
}
```

## UI Behavior

- Library tab supports status/favorite edits and item removal.
- Progress tab supports page/completed edits and progress removal.
- Search History tab supports browsing user queries and clearing all history for the user.
- Destructive item removal and clear-history actions require confirmation.
- Empty states distinguish "no data" from "failed to load".

## Tests

- Backend CRUD routes enforce admin token.
- Backend list routes paginate results.
- Backend update routes validate body shape.
- Backend delete routes return affected counts.
- Frontend user detail tabs render library, progress, and history data.
- Frontend edit/delete flows call the expected endpoints.
- Frontend destructive actions require confirmation.
