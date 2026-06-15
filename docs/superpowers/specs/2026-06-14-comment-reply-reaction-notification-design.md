# Comment, Reply, Reaction, and Notification Design

## Reader and Goal

This document is for an engineer implementing the first version of community comments in the manga reader. After reading it, they should be able to implement the backend and React web feature without needing additional product decisions.

## Summary

Users can read public comments on both manga detail pages and chapter reader pages. Signed-in users can create comments, reply to any comment, react with one reaction per comment, edit or delete their own comments, and receive in-app notifications when other users reply or react to their comments.

Admins can hide or delete violating comments. Deleted or hidden comments keep their position in the thread so valid replies remain readable.

## Product Decisions

- Comments support two targets: manga and chapter.
- Comments and replies share the same data model.
- Reply depth is not limited in storage.
- The web UI caps visual indentation after depth 5 and shows who the comment is replying to for deeper replies.
- A user can have only one reaction on a comment at a time.
- Reaction types for version 1 are `like`, `heart`, `sad`, `laugh`, and `angry`.
- Comments can be marked as spoilers by the author. Spoiler content is hidden until the reader reveals it.
- Comment reading is public. Writing, editing, deleting, reacting, and notifications require authentication.
- Notifications are created for replies and reactions from other users. Self-actions do not create notifications.
- Notification delivery is realtime through server-sent events. Comment lists do not update realtime in version 1.
- Default comment ordering is newest first.
- Comment pagination is cursor-based.

## Backend Design

Add a comments module with validators, route handlers, service logic, and repository logic matching the existing backend structure.

The `Comment` model should store the target, author, tree position, content, spoiler flag, moderation status, and timestamps. Tree fields should include `parentId`, `rootId`, `depth`, and a sortable `path` so root comments and replies can be loaded without fetching an entire thread.

The `CommentReaction` model should store a single selected reaction per user/comment pair. The database must enforce uniqueness for that pair.

The `Notification` model should store the recipient, actor, notification type, target context, related comment, read state, and timestamps.

Required API behavior:

- `GET /api/comments` lists comments for a manga or chapter target. Passing no `parentId` returns root comments. Passing `parentId` returns direct replies for that parent.
- `POST /api/comments` creates a root comment or reply.
- `PATCH /api/comments/:id` edits the current user's comment.
- `DELETE /api/comments/:id` soft-deletes the current user's comment. Admins may also hide/delete comments for moderation.
- `POST /api/comments/:id/reaction` creates or changes the current user's reaction.
- `DELETE /api/comments/:id/reaction` removes the current user's reaction.
- `GET /api/notifications` lists the current user's notifications.
- `PATCH /api/notifications/:id/read` marks one notification as read.
- `PATCH /api/notifications/read-all` marks all current user notifications as read.
- `GET /api/notifications/stream` keeps an authenticated server-sent event stream open for notification events.

The API should return author display data, reaction counts, the current user's selected reaction when authenticated, reply counts, and moderation/deletion state. Hidden or deleted comments must not expose the original content to ordinary users.

## Frontend Design

Add a reusable `CommentSection` for manga and chapter targets.

On manga detail pages, show the section below the manga hero, continue-reading panel, and chapter list area. On reader pages, expose chapter comments through a drawer or panel so the reading canvas remains the primary experience.

Comment UI must support:

- Root comment list with cursor pagination.
- Lazy-loaded direct replies per comment.
- Reply composer at any depth.
- Edit and delete controls for the current user's comments.
- Admin moderation controls when the current user is an admin.
- Spoiler reveal state per comment.
- Reaction picker with one active reaction per user.
- Placeholder rendering for hidden or deleted comments while keeping replies visible.

Add a notification center to the app shell with an unread badge. It should fetch initial notifications, connect to the SSE stream for signed-in users, append incoming notifications, and let the user mark notifications read. Clicking a notification should navigate to the related manga or chapter context.

## Verification Plan

Backend tests should cover public read access, authenticated write requirements, root comments, nested replies, reaction uniqueness, owner permissions, admin moderation, notification creation, and SSE delivery.

Frontend tests should cover rendering comments and replies, spoiler reveal, switching reactions, hidden or deleted placeholders, and notification unread/read behavior.

Before delivery, run backend tests and typecheck/build for touched backend and frontend projects.

## Implementation Order

1. Commit this design document by itself.
2. Add Prisma models, migration, and generated client.
3. Implement backend comments and reactions APIs.
4. Implement backend notifications and SSE.
5. Implement React comment UI.
6. Implement React notification UI.
7. Add focused tests and run verification.
