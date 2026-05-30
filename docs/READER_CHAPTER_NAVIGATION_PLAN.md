# Reader and Chapter Navigation Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the MVP reader navigation slice without needing the original conversation.

## Summary

The MVP adds chapter navigation inside the reader while keeping the existing reader route and backend API surface. A reader can move to the previous or next chapter, jump through a chapter selector, keep reading when chapter navigation context is unavailable, and get more reliable vertical-mode progress.

This plan intentionally excludes original-quality switching, mobile gestures, and shortcut help. Those remain later reader improvements.

## Reader Behavior

- Keep the public route shape as `/read/:chapterId?mangaId=:mangaId`.
- When `mangaId` exists, load the manga chapter feed through the existing chapter endpoint and derive previous, current, and next chapter locally.
- When `mangaId` is missing, keep image reading available and disable the chapter navigation controls with a clear unavailable state.
- Add toolbar controls for previous chapter, next chapter, chapter selection, page count, reader mode, and image fit.
- Use natural reading order for navigation: lower chapter number or earlier publish date is previous, higher chapter number or later publish date is next.
- Fetch chapter feed in batches and continue fetching until the current chapter is found or the feed is exhausted.
- Keep a manual load-more control in the selector area when more feed pages are available.

## Progress and Preload

- Vertical mode tracks the page that is actually visible in the viewport using `IntersectionObserver`.
- Completion is saved when the final page becomes the active visible page.
- Existing debounced save and unload save behavior remains in place.
- Paged mode preloads the next one or two page images in the current chapter.
- When a next chapter is known, prefetch the next chapter reader payload with TanStack Query.
- Use data-saver reader URLs only in this MVP.

## Interfaces

- No backend endpoint, database schema, or auth changes are required.
- Frontend may use local helper types for chapter navigation state and reader quality.
- Chapter selector labels should include read/current/new state, chapter number, language, and title when available.
- If the loaded chapter feed cannot locate the current chapter, previous/next navigation stays disabled until the chapter appears in a loaded batch.

## Test Scenarios

- Reader toolbar shows page count and chapter navigation when `mangaId` is present.
- Previous and next chapter controls navigate to the expected reader routes.
- Previous is disabled at the first loaded chapter, and next is disabled at the last loaded chapter.
- Chapter selector can jump directly to another chapter.
- Reader works without `mangaId` and disables chapter navigation.
- Vertical mode saves progress from the observed visible page and marks completed on the final page.

## Defaults

- MVP scope only: no quality toggle, mobile gestures, or full shortcut tooltip.
- Default chapter languages remain Vietnamese and English.
- Backend API surface remains unchanged.
