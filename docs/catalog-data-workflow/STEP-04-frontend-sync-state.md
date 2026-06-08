# Step 04: Frontend Sync State

Status: done

Completed verification:

- `npm --workspace frontend test -- manga-detail-continue chapter-list search-page`
- `npm --workspace frontend run typecheck`

## Goal

Update frontend chapter UX so cache misses are shown as sync/data availability states, not as filter failures.

## Key Changes

- Teach the catalog API client to preserve `202 needsSync` metadata.
- Update manga detail chapter section to distinguish:
  - readable chapters exist
  - filters match no loaded chapters
  - DB cache has not imported readable chapters yet
- Keep existing route paths and public imports stable.

## UX Rules

- If the API returns chapters, render the existing chapter list.
- If the API returns `202` and `needsSync: true`, show a sync-needed state.
- Do not show `No chapter matches your filters.` for `needsSync`.
- Keep language and scanlation filters as client-side controls over loaded chapter data.

## Non-Goals

- Do not let normal users call admin sync endpoints.
- Do not add a public sync button in this step.
- Do not change reader route format.

## Tests

- Manga detail renders chapters for DB-backed responses.
- Manga detail renders sync-needed state for `202 needsSync`.
- Chapter filter empty state still appears when chapters are loaded but filters exclude them.
