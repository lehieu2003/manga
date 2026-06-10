# Focused Gap Roadmap

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: pick the next milestone, implement it safely, and verify the acceptance criteria before moving on.

## Current Baseline

MangaDex Reader already has a working fullstack reader: Fastify backend, Prisma/PostgreSQL catalog cache, Redis cache, React web app, and Flutter mobile app. Web and mobile both cover the core reader-facing flows: discovery, manga detail, chapter list, reader, library, auth, account settings, and light/dark theme switching.

The remaining work below focuses on gaps that affect contract safety, discovery accuracy, reader ergonomics, personalization depth, account maturity, and mobile release readiness. The milestones are intentionally ordered so backend contracts and data shape stabilize before frontend and mobile surfaces expand.

## Milestone Order

1. Backend Contract Hardening
2. MangaDex Discovery Accuracy
3. Reader and Chapter UX
4. Library and Personalization
5. Auth and Account
6. Mobile Readiness

Each milestone should be implemented as one or more small vertical slices. Do not start a dependent UI expansion until the backend contract for that behavior is stable and covered by tests.

## Detailed Step-by-Step Plan

### Milestone 1: Backend Contract Hardening

Goal: make the backend easier to extend without changing current public behavior.

Steps:

1. Refactor remaining route handler logic into thin controllers.
2. Keep the existing API routes, request shapes, response shapes, and status codes backward compatible.
3. Add a runtime domain event publisher interface and an in-process event bus.
4. Start publishing events for high-value domain actions such as catalog import, user auth changes, library updates, and progress saves.
5. Add tests that check route schemas and Zod validators stay aligned where practical.
6. Add OpenAPI response examples for public catalog, auth, library, progress, admin, and media routes.
7. Run backend typecheck and tests before moving to the next milestone.

Acceptance criteria:

- Route modules mostly register routes and delegate behavior.
- Domain events can be emitted at runtime without adding queue infrastructure yet.
- OpenAPI docs include useful response examples for current API consumers.
- Existing web and mobile clients continue to work without API changes.

### Milestone 2: MangaDex Discovery Accuracy

Goal: make discovery filters use MangaDex-native metadata instead of relying only on cached tag names.

Steps:

1. Add MangaDex tag registry support in the backend.
2. Store or cache tag IDs with user-readable tag names.
3. Update search validation so included and excluded tag filters can accept stable tag IDs.
4. Keep cached tag-name filtering as a compatibility fallback while clients migrate.
5. Update live MangaDex search to send included and excluded tag IDs.
6. Add author and artist relationship parsing to catalog responses.
7. Add author/artist search support once relationship data is normalized enough to query safely.
8. Update web and mobile discovery UI only after backend responses are stable.

Acceptance criteria:

- Live tag filtering works through MangaDex tag IDs.
- Cached fallback still returns usable results when MangaDex is unavailable.
- Author/artist data can be displayed and searched without crashing on partial MangaDex metadata.
- Search UI labels stay user-readable while backend uses stable IDs internally.

### Milestone 3: Reader and Chapter UX

Goal: make reading and chapter browsing better for long manga without overloading the current list.

Steps:

1. Add reader quality selection for data-saver and original page URLs.
2. Persist reader settings per device first: reader mode, image fit, and quality.
3. Add web tap zones or swipe gestures for paged reading.
4. Add a compact shortcut/help tooltip for reader controls.
5. Add server-side chapter search so searching does not depend only on loaded chapter batches.
6. Add chapter grouping by volume.
7. Add collapse and expand behavior for latest chapters when manga has many chapters.
8. Add dedupe preferences for language and scanlation group.
9. Improve latest badge rules so badges can consider language and publish window.

Acceptance criteria:

- Reader quality can be changed without breaking progress saving.
- Reader settings survive reloads on the same device.
- Long chapter lists remain scannable.
- Chapter search can find matches outside the currently loaded client batch.
- Existing reader routes remain backward compatible.

### Milestone 4: Library and Personalization

Goal: separate personal reading actions from manga following and make the shelf more useful.

Steps:

1. Add chapter bookmarks separate from following manga.
2. Add favorite chapter support.
3. Add richer reading statuses only after final status names are chosen.
4. Add search history UI using the existing backend data.
5. Add reading activity timeline after progress and bookmark data are stable.
6. Add reading streak only after activity timeline semantics are clear.
7. Connect analytics-style summaries to the app only after the source metrics are reliable.

Acceptance criteria:

- Users can mark a chapter without changing manga follow status.
- Search history is visible and actionable.
- New personalization data does not corrupt existing library and progress records.
- Timeline and streak behavior is deterministic and testable.

### Milestone 5: Auth and Account

Goal: mature account management without committing too early to external providers.

Steps:

1. Add forgot and reset password with a token lifecycle.
2. Introduce an email sender abstraction before wiring a real provider.
3. Add email verification using the same email infrastructure.
4. Add multi-device session management UI.
5. Add avatar upload after storage infrastructure is implemented.
6. Treat OAuth as a later optional slice unless a specific provider is chosen.

Acceptance criteria:

- Password reset tokens expire and cannot be reused.
- Email flows are testable without a production email provider.
- Users can inspect and revoke sessions.
- Avatar upload has a real storage backend and does not rely on arbitrary URL input only.

### Milestone 6: Mobile Readiness

Goal: make the Flutter app ready for reliable CI and eventual release.

Steps:

1. Add a Flutter CI job that runs analyze, tests, and Android debug build.
2. Add integration tests for auth, search, library, manga detail, and reader flows.
3. Persist mobile reader settings using the same device-local policy as web.
4. Add mobile offline/cache behavior for covers, manga metadata, and recent chapters.
5. Finalize Android application ID.
6. Add release signing configuration.
7. Review app icon, app display name, production API config, and store metadata.

Acceptance criteria:

- Pull requests verify mobile code automatically.
- Core mobile user flows are covered beyond widget-level tests.
- Reader settings and recent content survive app restarts.
- Android release build has a production-ready identity and signing path.

## Cross-Cutting Test Strategy

Backend milestones:

- Run backend typecheck.
- Run backend unit and integration tests.
- Add regression tests for every new route, validator, and important domain event.
- Verify OpenAPI output when route contracts change.

Frontend milestones:

- Run frontend typecheck.
- Run frontend unit tests.
- Run frontend build.
- Add tests for visible user behavior, not implementation details.

Mobile milestones:

- Run Flutter analyze.
- Run Flutter widget tests.
- Add integration tests for end-to-end user flows.
- Run Android debug build in CI.

Full repo verification before merging a major milestone:

- Run workspace typecheck.
- Run workspace tests.
- Run workspace builds.
- Run Flutter verification for mobile changes.

## Assumptions and Defaults

- Existing public API routes remain backward compatible unless a milestone explicitly introduces a versioned replacement.
- Backend contract work happens before frontend or mobile expansion for the same capability.
- Reader settings start as device-local persistence. User-synced settings can come later.
- OAuth provider choice, email provider, and object storage provider are future decisions.
- The roadmap is one durable planning document. Milestone-specific implementation briefs can be added later only when a milestone is ready to start.
