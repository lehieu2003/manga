# Manga Discovery MVP Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the Manga Discovery MVP without needing the original conversation.

## Summary

Manga Discovery should make finding a manga feel intentional instead of relying on one search box and cached genre chips. The MVP expands the existing search flow with MangaDex filters, sort modes, dedicated discovery views, and better empty states while keeping the app reader-first.

The slice should reuse the current catalog/search route and cached manga model where possible. It can extend query parameters and frontend types, but should not add auth, library, reader, or database migrations unless implementation proves the existing cache cannot support a required fallback.

## User Goals

- Search by title or keyword and refine results without leaving the page.
- Browse popular manga, latest updates, and genre-specific results from clear entry points.
- Filter by status, publication year, content rating, demographic, and included/excluded tags.
- Sort results by relevance, latest update, followed count, title, and created/updated date.
- Understand when results are live MangaDex data versus local cache fallback.
- Recover from empty or under-seeded local cache states with useful guidance.

## Key Changes

### Search and Filter UI

- Upgrade Search from a single search box plus genre chips into a discovery control panel.
- Keep the primary title/keyword input prominent.
- Add filter groups:
  - included tags
  - excluded tags
  - content rating
  - manga status
  - publication year
  - original language or demographic if MangaDex response support is available in the slice
- Add sort selector:
  - Relevance
  - Latest update
  - Followed count
  - Title A-Z
  - Created newest
  - Updated newest
- Show active filter chips with one-click removal and a clear-all action.
- Preserve genre route behavior, but represent the route genre as an active included tag/filter.

### Discovery Pages

- Add dedicated public routes for common browse modes:
  - Popular
  - Latest updates
- These pages can reuse the Search page layout with preselected sort/default filters.
- Home links for Popular picks, Fast search starters, and Browse by genre should route into the improved discovery experience instead of acting like isolated sections.
- Do not create a marketing landing page; first screen remains useful manga browsing.

### Backend Catalog Search

- Extend the existing manga search endpoint with optional query parameters for MangaDex filters and order.
- Continue using MangaDex live data first for non-cache-only searches.
- Keep cache fallback for network failures.
- Cache fallback can support only the filters represented in cached metadata:
  - title/description
  - tags
  - status
  - year
  - content rating
- If a live-only filter cannot be represented in cache, return cache fallback with a clear `source: "cache"` signal and let the UI explain that some filters may be approximate.
- Keep default translated languages as Vietnamese and English.

### Tag and Filter Metadata

- Prefer a backend-provided tag/filter metadata endpoint if the implementation needs stable MangaDex tag IDs.
- If the current cached genre endpoint is enough for the MVP, keep using it for included/excluded tag labels.
- Do not hardcode a large tag registry in multiple frontend modules.
- Keep tag labels user-readable and preserve the MangaDex tag IDs internally if live included/excluded tag filtering needs IDs.

### Empty and Cache States

- Replace generic "No manga found" copy with states that explain likely next actions:
  - broaden filters
  - clear excluded tags
  - sync more MangaDex data for cache-only genre browsing
  - retry when MangaDex is unavailable
- Keep the existing source banner, but make it specific:
  - live results
  - cached fallback
  - cache-only genre browsing
- Results should not crash when a manga is missing cover, year, content rating, or tags.

## Public Interfaces / Types

- Existing endpoint remains the main surface: `GET /api/manga/search`.
- Optional search query fields can be added:
  - `includedTags`
  - `excludedTags`
  - `contentRating`
  - `status`
  - `year`
  - `demographic`
  - `sort`
  - `languages`
- Frontend can add local types:
  - `MangaDiscoverySort`
  - `MangaDiscoveryFilters`
  - `MangaDiscoveryPreset = "search" | "popular" | "latest"`
- Backend should validate all query params and clamp list sizes to avoid abusive requests.
- No route changes to existing public URLs. New routes can be additive only.

## Test Plan

### Frontend Tests

- Search renders sort selector and filter groups.
- Selecting included and excluded tags updates query behavior and active chips.
- Clear-all resets query, filters, and sort to defaults.
- Popular route uses followed-count sort.
- Latest route uses latest-update sort.
- Genre route still preselects the genre/tag filter.
- Empty state changes copy when filters are active.
- Cached fallback banner remains visible when API response source is cache.
- Manga cards render when metadata is partial.

### Backend Tests

- Search endpoint validates new filters and sort params.
- MangaDex client maps sort mode to the expected MangaDex order query.
- Included and excluded tags are forwarded correctly.
- Cache fallback filters cached status, year, content rating, and tags where supported.
- Unsupported cache fallback filters do not crash and still return a paginated payload.

### Existing Verification

- Run `npm run test --workspaces`.
- Run `npm run typecheck --workspaces`.
- Run `npm run build --workspaces`.

## Implementation Notes

- Start with sort modes and content/status/year filters before deeper tag metadata work.
- Keep the Search page ergonomic on mobile: filters should collapse or stack cleanly.
- Avoid nested cards; use full-width filter bands and compact control groups.
- Keep manga covers as the strongest visual signal in result grids.
- Do not add new dependencies for the MVP unless MangaDex tag metadata parsing becomes unreasonably complex.

## Assumptions

- MangaDex remains the source of truth for live discovery.
- Local cache is a fallback and offline browsing helper, not a full discovery index.
- Vietnamese and English remain the default available translated languages.
- Mature/explicit content remains excluded unless the app later adds user content preferences.
- Author/artist search and display can be a later slice if relationship normalization expands beyond cover art.
