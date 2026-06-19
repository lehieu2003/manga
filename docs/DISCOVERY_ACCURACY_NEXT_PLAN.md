# Discovery Accuracy Next Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: implement more accurate MangaDex discovery filters and author/artist search.

## Summary

Discovery currently works through title search, cached tags, content rating, status, year, and sort presets. The next step is to move live filtering to stable MangaDex IDs while preserving cache fallback behavior.

## User Goals

- Filter by tags accurately against MangaDex live search.
- See and search author/artist information.
- Use demographic and original-language filters.
- Understand when cache fallback makes results approximate.

## Key Changes

- Backend: normalize MangaDex tag registry, pass tag IDs to live search, preserve cached name fallback, and parse author/artist relationships consistently.
- Web: replace ad hoc cached tag choices with registry-backed filters and add author/artist and demographic/original-language controls.
- Mobile: mirror the stable filter metadata and keep controls compact.

## Public Interfaces / Types

- Add or extend a filter metadata endpoint that returns tag IDs, tag names, groups, aliases, demographics, content ratings, statuses, and language options.
- Extend search query support for included/excluded tag IDs, demographic, original language, and author/artist query.
- Keep existing tag-name query behavior as a compatibility fallback.
- Cached manga keeps author and artist arrays usable for fallback display/search.

## UX Behavior

- UI displays human-readable tag names while backend sends stable IDs.
- Active filters remain removable as chips.
- Cache fallback banner explains when some live-only filters may be approximate.
- Empty states suggest clearing filters, syncing cache, or retrying MangaDex.
- Mature/explicit content remains unavailable by default unless user preference controls are added.

## Edge Cases

- Missing relationship data does not break manga cards or detail pages.
- Tag registry refresh failure falls back to the last cached registry.
- Mixed old tag-name filters and new tag-ID filters are accepted during migration.
- Cache fallback can ignore unsupported live-only filters only when the response clearly marks `source: "cache"`.

## Test Plan

- Backend tests cover tag registry sync, tag ID search mapping, cached name fallback, author/artist parsing, demographic/original-language validation, and cache fallback behavior.
- Frontend tests cover filter metadata loading, active chips, tag ID submission, author/artist input, cache fallback banner, and empty states.
- Mobile tests cover filter metadata rendering and search request construction.

## Acceptance Criteria

- Live included/excluded tag filtering uses MangaDex tag IDs.
- Author and artist display is stable for cached and live data.
- Author/artist search works without crashing on partial metadata.
- Discovery UI keeps labels readable and filters removable.
- Existing search URLs and cached fallback remain usable.

## Assumptions

- MangaDex remains the source of truth for live discovery.
- Cached catalog is a fallback, not a complete search index.
- Vietnamese and English remain the default translated languages.
