# Chapter List Advanced Phase 2 Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the phase 2 chapter-list upgrade without needing the original conversation.

## Summary

The first chapter-list upgrade added language filters, loaded scanlation-group filters, server-side chapter search, infinite scroll, and a fallback load-more button. Phase 2 keeps the existing backend chapter API and makes long manga easier to scan with duplicate reduction, volume grouping, and collapse/expand behavior.

This plan is frontend-first. It does not change backend routes, database schema, auth behavior, or the chapter feed response shape.

## Chapter Loading

- Keep using the existing paginated chapter feed endpoint.
- Load chapters in 100-item batches.
- Replace the primary load-more workflow with an infinite-scroll sentinel at the end of the list.
- Keep a fallback `Load more` button for retry and environments where automatic observation does not fire.
- When the sentinel enters the viewport and more pages are available, request the next chapter batch.

## Search and Filters

- Keep search matching chapter number and title.
- Keep sending chapter search to the server-side chapter query.
- Add language checkboxes for Vietnamese and English. Both are enabled by default.
- Language filters call the existing feed endpoint with the selected translated languages.
- Add scanlation group checkboxes from groups found in loaded chapters.
- Scanlation filtering is client-side in this MVP and becomes more complete as more chapters load.
- Add a clear-filters action that resets search, scanlation groups, and default languages.

## Phase 2 Display Pipeline

- Process loaded chapters as: raw chapters -> filter by search and scanlation -> dedupe -> sort -> collapse -> group by volume -> render.
- Dedupe is enabled by default and chooses one representative chapter per chapter number.
- Dedupe prefers the selected language order, then selected scanlation group order, then newest publish date, then chapter id.
- Group by volume is enabled by default.
- Chapters with a volume render under `Volume {volume}`.
- Chapters without a volume render under `No Volume`.
- Collapse applies when the post-filter and post-dedupe list has more than 30 chapters and search is empty.
- Collapsed mode renders the first 20 chapters in the current sort mode.
- `Show all chapters` expands the loaded list, and `Show fewer` returns to collapsed mode.
- Search results are never collapsed.

## Interfaces

- No backend endpoint, database schema, or auth changes are required.
- Frontend state tracks selected languages, chapter search, and selected scanlation groups.
- Frontend state also tracks whether the current loaded chapter list is expanded.
- The manga detail page owns selected language state because it affects the chapter query.
- The chapter list owns search and scanlation state because those filters operate on loaded chapter rows.
- Dedupe, grouping, and collapse stay device-local UI behavior and are not persisted in this phase.
- If no language is selected, the list does not load chapters and keeps language controls visible so the reader can recover.

## Test Scenarios

- Infinite scroll sentinel calls load more when visible.
- Fallback `Load more` button still calls load more.
- Search filters loaded chapters by chapter number and title.
- Language checkbox changes cause the manga detail feed to refetch with the selected language list.
- Scanlation checkbox filters visible chapters by loaded scanlation group.
- Clear filters resets search, scanlation group filters, and default languages.
- No-language empty state keeps controls visible.
- Dedupe chooses the expected chapter by language, scanlation group, publish date, and id fallback.
- Volume grouping renders `Volume {volume}` and `No Volume` sections in the current sort order.
- Collapse renders 20 of more than 30 chapters, then `Show all chapters` and `Show fewer` toggle the visible rows.
- Active search bypasses collapse so matching results stay visible.

## Defaults

- Default languages remain Vietnamese and English.
- Search across the full feed uses the backend chapter query.
- Scanlation options are limited to groups present in loaded chapters.
- Dedupe, group by volume, and collapse are enabled by default.
- Collapse threshold is 30 chapters, and collapsed visible count is 20.
- Existing read/current/new state, sort behavior, current highlight, and latest badge remain unchanged.
