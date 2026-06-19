# Mobile User Parity Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: bring the Flutter app closer to web parity for user-facing flows.

## Summary

The mobile app already covers core routes for home, search, library, settings, detail, reader, comments, notifications, and chat. The next work improves reliability and release readiness: gestures, persisted reader settings, offline/cache behavior, integration tests, and CI.

## User Goals

- Navigate the mobile reader with natural gestures.
- Keep reader preferences after restarting the app.
- Continue recent browsing with cached metadata and covers.
- Trust that mobile flows are tested before release.

## Key Changes

- Mobile: add reader gestures, persisted reader settings, cache recent metadata/covers/chapters, and integration tests.
- Backend: no mobile-only API unless offline metadata needs a compact sync endpoint later.
- CI: add Flutter analyze, tests, and Android debug build.

## Public Interfaces / Types

- Reuse existing backend contracts for auth, catalog, library, progress, comments, notifications, and chat.
- Add mobile-local reader settings model for mode, fit, quality, and navigation preference.
- Add mobile-local cache records for recent manga metadata, cover references, chapter metadata, and last successful fetch time.
- Add CI workflow entries for Flutter checks.

## UX Behavior

- Reader supports swipe/tap navigation in paged mode and keeps vertical scrolling natural.
- Settings persist locally and apply when reopening the reader.
- Cached recent content is clearly marked when the network is unavailable.
- Offline behavior is limited to recent metadata/covers/chapters; it does not promise full-library offline reading.

## Edge Cases

- Cache expiry avoids showing stale data as fresh.
- Auth failures clear protected offline actions but can still show non-sensitive cached public metadata.
- Reader gestures do not conflict with toolbar buttons, comment inputs, or system back navigation.
- CI should fail on analyzer errors, test failures, or Android debug build failures.

## Test Plan

- Flutter widget tests cover reader settings, gesture navigation, cached empty/offline states, and protected-route behavior.
- Flutter integration tests cover login, search, manga detail, library follow/remove, reader progress, comments, and notifications where stable.
- CI runs Flutter analyze, unit/widget tests, and Android debug build.

## Acceptance Criteria

- Mobile reader gestures and settings match the web behavior conceptually.
- Recent public content can render from cache during network failures.
- Mobile verification runs in CI.
- Existing mobile auth, search, library, detail, reader, comments, and settings tests still pass.

## Assumptions

- Web/backend contracts remain the source of truth.
- Offline/cache is recent-content support, not full offline mode.
- Android release signing and store metadata can follow after CI is reliable.
