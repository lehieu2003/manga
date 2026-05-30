# Chapter List Advanced MVP Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the MVP chapter-list upgrade without needing the original conversation.

## Summary

The MVP upgrades the manga detail chapter list into a faster browsing tool while keeping the existing backend chapter API. A reader can filter by language, filter by loaded scanlation group, search across the feed through client-side auto-loading, and continue scrolling without repeatedly clicking a load-more button.

This plan intentionally excludes server-side chapter search, volume grouping, collapse/expand, deduplication preferences, and advanced latest badges. Those remain later chapter-list improvements.

## Chapter Loading

- Keep using the existing paginated chapter feed endpoint.
- Load chapters in 100-item batches.
- Replace the primary load-more workflow with an infinite-scroll sentinel at the end of the list.
- Keep a fallback `Load more` button for retry and environments where automatic observation does not fire.
- When the sentinel enters the viewport and more pages are available, request the next chapter batch.

## Search and Filters

- Keep search matching chapter number and title.
- If search has no loaded match and more pages exist, automatically load additional batches until a match appears or the feed ends.
- Show a searching state while search-triggered loading is underway.
- Add language checkboxes for Vietnamese and English. Both are enabled by default.
- Language filters call the existing feed endpoint with the selected translated languages.
- Add scanlation group checkboxes from groups found in loaded chapters.
- Scanlation filtering is client-side in this MVP and becomes more complete as more chapters load.
- Add a clear-filters action that resets search, scanlation groups, and default languages.

## Interfaces

- No backend endpoint, database schema, or auth changes are required.
- Frontend state tracks selected languages, chapter search, and selected scanlation groups.
- The manga detail page owns selected language state because it affects the chapter query.
- The chapter list owns search and scanlation state because those filters operate on loaded chapter rows.
- If no language is selected, the list does not load chapters and keeps language controls visible so the reader can recover.

## Test Scenarios

- Infinite scroll sentinel calls load more when visible.
- Fallback `Load more` button still calls load more.
- Search filters loaded chapters by chapter number and title.
- Search with no loaded match auto-fetches more while more pages exist.
- Language checkbox changes cause the manga detail feed to refetch with the selected language list.
- Scanlation checkbox filters visible chapters by loaded scanlation group.
- Clear filters resets search, scanlation group filters, and default languages.
- No-language empty state keeps controls visible.

## Defaults

- Default languages remain Vietnamese and English.
- Search across the full feed is client-side auto-fetch, not server-side query.
- Scanlation options are limited to groups present in loaded chapters.
- Existing read/current/new state, sort behavior, current highlight, and latest badge remain unchanged.
