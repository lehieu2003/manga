# Kế Hoạch Feature Comment, Reply, Reaction, Notification

## Summary

- Thêm hệ thống comment cho cả `MANGA` và `CHAPTER`.
- Ai cũng đọc được comment; user phải đăng nhập để comment, reply, react, nhận notification.
- Reply nhiều cấp không giới hạn trong DB; UI giới hạn thụt dòng sau cấp 5 và hiện “replying to”.
- Notification realtime dùng SSE (`EventSource`) cho reply và reaction.

## Key Changes

- Backend thêm module `comments`, `commentReactions`, `notifications` theo pattern hiện có: route -> validator -> controller/service -> repository.
- Prisma thêm:
  - `Comment`: `id`, `targetType`, `targetId`, `authorId`, `parentId`, `rootId`, `depth`, `path`, `content`, `isSpoiler`, `status`, `deletedAt`, `hiddenAt`, timestamps.
  - `CommentReaction`: unique `[commentId, userId]`, `type = LIKE | HEART | SAD | LAUGH | ANGRY`.
  - `Notification`: `userId`, `actorId`, `type = COMMENT_REPLY | COMMENT_REACTION`, `entityId`, `targetType`, `targetId`, `readAt`, timestamps.
- API:
  - `GET /api/comments?targetType=MANGA|CHAPTER&targetId=...&parentId=...&limit=&cursor=`
  - `POST /api/comments`
  - `PATCH /api/comments/:id`
  - `DELETE /api/comments/:id`
  - `POST /api/comments/:id/reaction`
  - `DELETE /api/comments/:id/reaction`
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/read-all`
  - `GET /api/notifications/stream` for SSE.
- Permissions:
  - Owner can edit/delete own comments.
  - Admin can hide/delete violating comments.
  - Deleted/hidden comments keep thread position; content is replaced by a placeholder while valid replies remain visible.
  - No notification is created when user replies/reacts to their own comment.
- Frontend:
  - Add reusable `CommentSection`.
  - Render manga comments on `MangaDetailPage`.
  - Render chapter comments in `ReaderPage` as a drawer/panel so reading flow is not disrupted.
  - Add notification bell/center in app layout with unread badge and SSE updates.
  - Spoiler comments render covered until user clicks reveal.

## Test Plan

- Backend unit/integration tests:
  - Public can list comments; unauthenticated write/react fails.
  - Create root comment for manga and chapter.
  - Create nested replies with correct `parentId`, `rootId`, `depth`, `path`.
  - Owner edit/delete works; non-owner edit/delete fails.
  - Admin hide/delete works.
  - One reaction per user per comment; changing reaction updates existing record.
  - Reply/reaction creates notification for target author, except self-actions.
  - SSE stream emits notification payload for authenticated user.
- Frontend tests:
  - Comment list renders root comments and lazy-loaded replies.
  - Spoiler reveal works.
  - Reaction switch updates selected reaction/count.
  - Deleted/hidden placeholder preserves replies.
  - Notification badge increments from SSE event and read action clears unread state.

## Assumptions

- Default comment sort is newest first.
- Pagination uses cursor-based pagination, not offset, to handle active threads.
- Reaction types for v1: `like`, `heart`, `sad`, `laugh`, `angry`.
- Realtime is for notifications only in v1; comment lists refresh through query invalidation after local actions.
- Mobile/web use the same backend contracts; Flutter implementation can follow after React web is stable.
