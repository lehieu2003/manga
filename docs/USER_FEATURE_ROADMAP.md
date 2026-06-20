# User Feature Roadmap

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: pick the next user-facing feature, open the linked plan, and implement it without needing the original conversation.

## Summary

This roadmap covers the remaining gaps for the normal `USER` role. It focuses on product capabilities that a reader can use directly. Backend, ops, and admin work appear here only when they are required to deliver the user-facing feature safely.

Priority guide:

- P0: account safety or high-impact reading flow gaps.
- P1: personalization and discovery improvements that make the app feel complete.
- P2: polish, release readiness, or larger follow-up capabilities.

## Roadmap

| Domain | Priority | Feature Area | Plan |
| --- | --- | --- | --- |
| Account | P0 | Forgot/reset password, email verification, session management | [Auth and Account Next Plan](AUTH_ACCOUNT_NEXT_PLAN.md) |
| Reader | P0 | Quality toggle, gestures, shortcuts, persisted settings | [Reader Experience Next Plan](READER_EXPERIENCE_NEXT_PLAN.md) |
| Library | P1 | Bookmarks, favorite chapters, custom lists, activity, search history | [Library Personalization Next Plan](LIBRARY_PERSONALIZATION_NEXT_PLAN.md) |
| Discovery | P1 | MangaDex tag IDs, author/artist search, richer filters | [Discovery Accuracy Next Plan](DISCOVERY_ACCURACY_NEXT_PLAN.md) |
| Social | P1 | Ratings, reviews, reports, block/mute, moderation states | [Social Moderation Next Plan](SOCIAL_MODERATION_NEXT_PLAN.md) |
| Mobile | P2 | Mobile gestures, offline cache, flow tests, CI | [Mobile User Parity Plan](MOBILE_USER_PARITY_PLAN.md) |

## Implementation Order

1. Account P0: password reset first, then email verification, then session UI.
2. Reader P0: quality toggle and persisted settings before gestures.
3. Library P1: bookmarks and search history before activity timeline or streaks.
4. Discovery P1: MangaDex tag registry before author/artist search.
5. Social P1: report content before block/mute, ratings before reviews.
6. Mobile P2: reader parity and CI before offline/cache behavior.

## Cross-Cutting Defaults

- Preserve existing public routes unless a plan explicitly adds a new route.
- Keep existing API contracts backward compatible.
- Add Prisma migrations only when a feature stores new durable user data.
- Keep web and mobile clients on the same backend contracts.
- Add tests for observable behavior, not implementation details.
- Do not open mature or explicit content by default without a dedicated user preference.

## Completion Rule

A feature is not complete until its plan-level acceptance criteria are satisfied, user-facing docs/status are updated, and the relevant backend, frontend, and mobile checks for the touched surface pass.
