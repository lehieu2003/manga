# Step 02: Admin Overview API/UI

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`

## Goal

Add the first end-to-end admin screen that proves admin token auth, admin API calls, loading state, success state, and error state.

## Key Changes

- Add `GET /api/admin/overview`.
- Add admin API client support for `X-Admin-Token`.
- Add overview dashboard under `/admin`.
- Keep the UI compact and operational, matching the existing manga cafe theme.
- Do not add destructive actions in this step.

## API Behavior

`GET /api/admin/overview` returns:

```json
{
  "users": 12,
  "activeSessions": 8,
  "cachedManga": 240,
  "cachedChapters": 4810,
  "libraryItems": 36,
  "readingProgress": 92,
  "searchHistory": 128,
  "latestCatalogFetchAt": "2026-06-08T10:00:00.000Z"
}
```

Rules:

- `latestCatalogFetchAt` is `null` when no cached manga exists.
- Counts are exact enough for admin display; no caching is required in v1.
- Missing or invalid admin token follows the shared admin error behavior.

## UI Behavior

- Overview renders KPI tiles for all response fields.
- Loading state uses skeleton or muted placeholders.
- Error state shows the backend message and a clear-token action.
- The dashboard should be useful on desktop first, but remain readable on mobile.

## Tests

- Backend route rejects missing admin token.
- Backend route rejects wrong admin token.
- Backend route returns counts from Prisma.
- Frontend overview renders loading, success, and error states.
- Frontend admin API client sends `X-Admin-Token`.
