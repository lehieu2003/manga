# Social Moderation Next Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: implement social features beyond comments and notifications.

## Summary

Comments, replies, reactions, spoiler hiding, and notifications already exist. The next social layer should add ratings/reviews and user-facing safety controls: reports, broken content reporting, block/mute, and moderation states.

## User Goals

- Rate or review a manga separately from short comments.
- Report abusive comments or broken reader content.
- Hide interactions from users they do not want to see.
- Understand when content was removed or hidden.

## Key Changes

- Backend: add ratings/reviews, report records, block/mute relationships, and moderation/audit data required to process reports.
- Web: add rating/review UI on manga detail, report actions on comments and reader failures, block/mute controls, and clear hidden-content states.
- Mobile: add report and rating surfaces after web/backend contracts are stable.

## Public Interfaces / Types

- Add `GET /api/manga/:id/reviews`, `POST /api/manga/:id/reviews`, `PATCH /api/reviews/:id`, and `DELETE /api/reviews/:id`.
- Add `POST /api/reports` for comment, manga, chapter, and image targets.
- Add `POST /api/me/blocks/:userId`, `DELETE /api/me/blocks/:userId`, and matching mute endpoints if mute is separate from block.
- Add Prisma models for reviews, reports, user blocks/mutes, and audit events if moderation workflow requires them.

## UX Behavior

- Rating/review is separate from comments and appears near manga discussion or detail metadata.
- Users can edit or delete their own review.
- Report actions collect a reason and optional detail, then show a non-alarming success state.
- Broken chapter/image report is available from reader error or image controls.
- Blocked/muted users' comments are collapsed for the current user without deleting the original data.

## Edge Cases

- One review per user per manga unless product explicitly allows multiple.
- Reports are idempotent enough to avoid spammy duplicate rows from repeated clicks.
- Users cannot block themselves.
- Admin-hidden content keeps thread position and clear placeholder states.
- Reporting unavailable MangaDex images should include enough chapter/page context for follow-up.

## Test Plan

- Backend tests cover review CRUD, one-review rule, report validation, block/mute ownership, and hidden-content filtering.
- Frontend tests cover review create/edit/delete, report modal, broken image report, collapsed blocked-user comments, and permission states.
- Mobile tests cover report and rating entry points once implemented.

## Acceptance Criteria

- Users can rate/review manga without using comments as reviews.
- Users can report comments and broken reader content.
- Block/mute affects only the current user's view.
- Moderation states are visible without breaking comment threads.
- Existing comment/reaction/notification behavior remains intact.

## Assumptions

- Rating scale is 1-5 for v1.
- Reports require authenticated users.
- Admin report review UI can be a follow-up if the first slice only captures reports safely.
