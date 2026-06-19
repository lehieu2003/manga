# Reader Experience Next Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: implement reader quality, gestures, shortcuts, and persisted settings.

## Summary

The reader already supports vertical and paged modes, progress, fit controls, and chapter navigation. The next work makes it feel dependable across devices: quality selection, local setting persistence, mobile/web gestures, and discoverable shortcuts.

## User Goals

- Choose between data-saver and original page images.
- Keep reader preferences after reload.
- Navigate pages naturally with tap or swipe.
- Learn available shortcuts without leaving the reader.

## Key Changes

- Backend: ensure reader payload can expose both `data-saver` and `original` page URLs or a mode switch that resolves either safely.
- Web: add quality control, device-local settings persistence, tap zones, swipe handling, and shortcut help.
- Mobile: add the same quality and settings concepts, then platform-native gestures.

## Public Interfaces / Types

- Keep `GET /api/chapters/:id/reader` backward compatible.
- Either add a `mode=data-saver|original` query parameter or return both URL sets in the reader payload.
- Add frontend reader settings type with mode, image fit, quality, and navigation preference.
- No user-synced settings table in this slice.

## UX Behavior

- Default quality remains `data-saver`.
- Quality toggle is available in the reader toolbar and does not reset page progress.
- Paged mode supports tap left/right and swipe left/right.
- Vertical mode keeps scroll behavior and does not hijack normal page scrolling.
- Shortcut help appears as a compact toolbar action or modal and lists keyboard, tap, and swipe controls.

## Edge Cases

- If original images fail, the UI offers retry and can switch back to data-saver.
- Gesture handling ignores taps on toolbar controls, links, comment UI, and form fields.
- Settings persistence handles invalid old local values by falling back to defaults.
- Reader still works when `mangaId` is missing, but chapter selector remains unavailable.

## Test Plan

- Backend tests cover reader payload or mode query for both qualities.
- Frontend tests cover quality toggle, settings persistence, paged tap navigation, swipe navigation, and shortcut help.
- Mobile widget tests cover persisted reader settings and gesture navigation once implemented.

## Acceptance Criteria

- Quality can be changed and survives reload.
- Reader mode and image fit continue to persist locally.
- Gestures navigate pages in paged mode without breaking toolbar interactions.
- Shortcut help is visible, compact, and accurate.
- Progress saving behavior is unchanged.

## Assumptions

- Device-local persistence is the default for this phase.
- User-synced reader settings can be added later.
- Data-saver remains the safe default for performance and bandwidth.
