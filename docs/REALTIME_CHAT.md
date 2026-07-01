# Realtime Social Chat and Friendship Plan

## Purpose and scope

This document defines the implementation plan for authenticated friendship, direct messages, group chat, and real-time delivery. It is written for an engineer implementing the feature without changing the existing RAG assistant chat.

After this plan is implemented, a signed-in user can manage friendships, exchange reliable direct messages with friends, participate in groups, see unread state and typing/presence indicators, and share a manga. AI assistant conversations remain a separate product feature with separate persistence and API contracts.

## Current checkpoint

Last updated: 2026-07-01

Reader: an internal engineer continuing the realtime social chat work.

Post-read action: identify the next unfinished slice, update this checkpoint after completing it, and continue without re-auditing the whole codebase.

Current phase: Phase 4, rich chat controls slice.

Completed:

- Phase 0 foundation is implemented: social chat schema, notification subject generalization, migration, generated Prisma types, service boundaries, Socket.io setup, JWT handshake, Redis adapter fallback, and baseline tests exist.
- Phase 1 friendship and durable DM creation is implemented: friend requests, accept, reject, block, unblock, unfriend, friend lists, notifications, rate limits, canonical friendships, and atomic DM creation exist.
- Phase 2 backend is mostly implemented for direct messages: inbox, conversation detail, message history, idempotent text sends, soft delete, read checkpoints, post-commit message events, read events, typing events, and presence events exist.
- Phase 2 frontend direct-message slice is implemented and verified: inbox list, selected thread, message history, optimistic text sends, socket reconciliation, delete action, typing indicator handling, and automatic read marking are covered by focused tests.
- User-facing friendship and DM entry UI is implemented and verified: users can search readers by display name/email, send a friend request from a selected result, review incoming and sent requests, accept or reject requests, block or remove friends, and open an existing direct-message thread from the friend list.
- Social notification rendering is fixed for friendship events: friend requests and accepted-request notifications label as social events and route to `/messages` instead of falling through to comment notification copy/routes.
- Manga sharing is implemented for the social message path: backend accepts `MANGA_SHARE`, validates cached manga/chapter IDs, stores a server-built card payload, emits the normal message event, and mobile/web can search/share a manga from the DM composer and render the saved card.
- Phase 3 group creation backend slice is implemented: authenticated users can create a `GROUP` conversation with accepted friends as active members; the creator is `OWNER`, selected friends are `MEMBER`, and the response uses the standard conversation payload.
- Phase 3 web group creation UI is implemented: users can open the group creator from the Messages sidebar, select at least two accepted friends, create the group, and switch directly into the new group thread.
- Phase 3 group invite backend slice is implemented: group owners/admins can invite accepted friends, pending invitees can accept or decline, owners/admins can cancel pending invites, invitees can list pending invite conversations, invite lifecycle socket events are emitted, and invite creation emits `GROUP_INVITE` notifications without duplicating already-pending invites.
- Phase 3 web group invite UI is implemented: users can see pending group invites, accept or decline incoming invites, invite eligible friends from group threads, cancel pending invites as owner/admin, and refresh invite state from member lifecycle socket events.
- Phase 4 reactions and mute controls are implemented across backend, web, and mobile: active members can add/remove quick message reactions, reaction aggregates update through Socket.io, and each member can mute/unmute a conversation by setting `mutedUntil`.
- Phase 5 backend call contract is started: call session/participant persistence, authenticated call HTTP routes, live-call conflict protection, STUN/static TURN/shared-secret TURN ICE server config responses, Socket.io signaling relay events, and ringing timeout/missed-call handling exist for web/mobile clients to build on.
- Phase 5 web foreground call UI is implemented: users can start audio/video calls from the thread header, answer or decline incoming calls, exchange WebRTC offer/answer/ICE through Socket.io, toggle microphone/camera, and hang up from an in-thread call dock.

In progress:

- Phase 3 group chat continuation: add mobile controls for pending invites, then implement member management after invites are usable from clients.
- Verify the manga sharing slice across backend and mobile, then add optional chapter picking to the share sheet if needed.
- Phase 4 follow-up slices: image upload flow, reply previews, offline push delivery, and voice notes remain separate infrastructure-heavy work.
- Phase 5 follow-up slices: choosing/provisioning the real TURN provider, Flutter WebRTC UI, push/native incoming-call UI, and full cross-network QA remain separate work.

Latest verification:

- Frontend manga sharing web update: `npm run test -- social-chat-page.test.tsx` in `frontend` passed with 6 tests.
- Frontend manga sharing web update: `npm run typecheck` in `frontend` passed.
- Frontend manga sharing web update: `npm run build` in `frontend` passed.
- Phase 3 group creation backend: `npm run test -- social-conversation.routes.test.ts` in `backend` passed with 6 tests.
- Phase 3 group creation backend: `npm run typecheck` in `backend` passed.
- Phase 3 web group creation UI: `npm run test -- social-chat-page.test.tsx` in `frontend` passed with 7 tests.
- Phase 3 web group creation UI: `npm run typecheck` in `frontend` passed.
- Phase 3 group invite backend: `npm run test -- social-conversation.routes.test.ts` in `backend` passed with 17 tests.
- Phase 3 group invite backend: `npm run typecheck` in `backend` passed.
- Phase 3 web group invite UI: `npm run test -- social-chat-page.test.tsx` in `frontend` passed with 10 tests.
- Phase 3 web group invite UI: `npm run typecheck` in `frontend` passed.
- Phase 5 backend call contract: `npx prisma generate` in `backend` passed.
- Phase 5 backend call contract: `npm test -- src/tests/integration/routes/social-call.routes.test.ts src/tests/integration/realtime/socket-server.test.ts` in `backend` passed with 10 tests.
- Phase 5 backend call contract: `npm run typecheck` in `backend` passed.
- Phase 5 backend call contract: `npx prisma validate` in `backend` passed.
- Phase 5 backend call contract: `npm test` in `backend` passed with 122 tests.
- Phase 5 missed-call timeout: `npx prisma generate` in `backend` passed.
- Phase 5 missed-call timeout: `npm test -- src/tests/unit/social-call-timeout.service.test.ts src/tests/integration/routes/social-call.routes.test.ts src/tests/integration/realtime/socket-server.test.ts` in `backend` passed with 11 tests.
- Phase 5 missed-call timeout: `npm run typecheck` in `backend` passed.
- Phase 5 missed-call timeout: `npx prisma validate` in `backend` passed.
- Phase 5 missed-call timeout: `npm test` in `backend` passed with 123 tests.
- Phase 5 ICE credential provider: `npm test -- src/tests/unit/call-ice.service.test.ts src/tests/integration/routes/social-call.routes.test.ts` in `backend` passed with 10 tests.
- Phase 5 ICE credential provider: `npm run typecheck` in `backend` passed.
- Phase 5 ICE credential provider: `npx prisma validate` in `backend` passed.
- Phase 5 ICE credential provider: `npm test` in `backend` passed with 127 tests.
- Phase 5 web foreground call UI: `npm test -- src/tests/unit/social-chat-page.test.tsx` in `frontend` passed with 13 tests.
- Phase 5 web foreground call UI: `npm run typecheck` in `frontend` passed.
- Phase 5 web foreground call UI: `npm run build` in `frontend` passed.

Not started:

- Phase 3 group chat after creation: member roles, leave/kick, ownership transfer, disband, and system messages.
- Phase 4 rich features after reactions/mute: image uploads, reply previews, offline push delivery, and voice notes.
- Phase 5 remaining call client work: mobile WebRTC call UI, mobile background incoming calls, real TURN provider provisioning, and cross-network manual QA.

Checkpoint update rule:

- Update this section whenever a slice changes implementation status, especially before stopping work or committing.
- Move items between `In progress`, `Completed`, and `Not started` in the same change that finishes the slice.
- Keep the checkpoint factual and brief. Do not duplicate the detailed design sections below.
- Always update `Last updated` using an absolute date.
- Record verification that matters for the phase, including exact test, typecheck, build, migration, or manual check commands.

## Architecture decision

Use a separate social-chat domain rather than extending the existing AI chat tables.

The existing chat persistence is owned by one user and stores AI-specific roles, model metadata, sources, and token usage. Reusing it for group membership would make ownership, authorization, retention, and queries ambiguous. Social chat therefore introduces its own conversations and messages, while the RAG assistant schema and `/api/v1/chat/*` endpoints remain unchanged.

The public social API is namespaced under `/api/social/*` in the current Fastify app. Socket.io carries transient events and real-time notifications. HTTP remains the canonical command path for durable actions, including sending messages; both transports call the same domain services when a socket command is supported.

## Data model and migration

Add the following enums. Notification types are extended without removing the existing comment types.

```prisma
enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
  BLOCKED
}

enum SocialConversationType {
  DM
  GROUP
}

enum SocialMemberRole {
  OWNER
  ADMIN
  MEMBER
}

enum SocialMembershipStatus {
  ACTIVE
  PENDING_INVITE
  LEFT
}

enum SocialMessageType {
  TEXT
  MANGA_SHARE
  IMAGE
  SYSTEM
  VOICE_NOTE
}

enum NotificationSubjectType {
  COMMENT
  FRIENDSHIP
  CONVERSATION
  MESSAGE
}
```

### Friendship

Store each relationship once, using a canonically ordered pair. The service computes `userAId` and `userBId` from the two participant IDs before every read or write. `requestedById` records who initiated the current request; `blockedById` is populated only while the relationship is blocked.

```prisma
model Friendship {
  id            String           @id @default(cuid())
  userAId       String
  userBId       String
  requestedById String
  blockedById   String?
  status        FriendshipStatus @default(PENDING)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@unique([userAId, userBId])
  @@index([userAId, status, updatedAt])
  @@index([userBId, status, updatedAt])
  @@index([requestedById, status])
}
```

The request, accept, reject, unblock, and block operations run in a transaction. A repeated request after `REJECTED` reopens the same row as `PENDING`; a blocked relationship rejects new requests in either direction. The service catches the unique-constraint race and loads the winning row instead of creating a duplicate.

### Social conversations and membership

```prisma
model SocialConversation {
  id            String                 @id @default(cuid())
  type          SocialConversationType
  title         String?
  avatarUrl     String?
  directKey     String?
  lastMessageAt DateTime?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt
  members       SocialConversationMember[]
  messages      SocialMessage[]

  @@index([type, lastMessageAt])
  @@index([directKey])
}

model SocialConversationMember {
  id                String                 @id @default(cuid())
  conversationId    String
  userId            String
  role              SocialMemberRole       @default(MEMBER)
  status            SocialMembershipStatus @default(ACTIVE)
  lastReadMessageId String?
  lastReadAt        DateTime?
  mutedUntil        DateTime?
  joinedAt          DateTime               @default(now())
  conversation      SocialConversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user              User                   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId, status, joinedAt])
  @@index([conversationId, role, status])
}
```

For a DM, `directKey` is the same canonical pair format as Friendship and is unique. The DM creation transaction inserts the conversation and both active members, then treats a direct-key conflict as an existing DM. Only a `DM` may have a direct key; enforce this through service validation and a PostgreSQL partial unique index in the migration.

Group invitations create a `PENDING_INVITE` membership and a `GROUP_INVITE` notification. Only active members receive messages or join a Socket.io room. The inviter may cancel a pending invite; the invitee may accept or decline it.

### Social messages and reactions

```prisma
model SocialMessage {
  id              String             @id @default(cuid())
  conversationId  String
  senderId        String?
  clientMessageId String?
  type            SocialMessageType  @default(TEXT)
  content         String?
  attachments     Json?
  replyToId       String?
  deletedAt       DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  conversation    SocialConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender          User?              @relation(fields: [senderId], references: [id], onDelete: SetNull)
  replyTo         SocialMessage?     @relation("SocialMessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies         SocialMessage[]    @relation("SocialMessageReplies")
  reactions       MessageReaction[]

  @@unique([conversationId, senderId, clientMessageId])
  @@index([conversationId, createdAt, id])
  @@index([replyToId])
}

model MessageReaction {
  id        String        @id @default(cuid())
  messageId String
  userId    String
  emoji     String
  createdAt DateTime      @default(now())
  message   SocialMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@index([messageId])
}
```

`clientMessageId` is a UUID generated by the client. Retrying the same send returns the message that was already created, rather than creating a duplicate. A system message has no sender. `content` is required for `TEXT`; an attachment is required for non-system media/share messages. Validate those rules in the command service.

Message history uses the stable tuple `(createdAt, id)` as its cursor. `lastReadMessageId` is the durable unread checkpoint. The service verifies that the referenced message belongs to the conversation and only moves this checkpoint forward.

### Notifications

Generalize the notification record before adding social notifications. Replace required comment-specific fields with `subjectType`, `subjectId`, and optional `payload`; retain the actor and read timestamp. Migrate existing comment notification rows with `subjectType = COMMENT` and `subjectId = commentId`, then update comment services to populate the generic subject fields.

Add `FRIEND_REQUEST`, `FRIEND_ACCEPTED`, `CHAT_MESSAGE`, and `GROUP_INVITE` to `NotificationType`. A chat notification payload contains only routing/display metadata, such as `conversationId`, `messageId`, and a short preview. It never contains private message content beyond the preview needed by the client or push service.

## API contract

All routes require authenticated users and return the project-standard error envelope. List endpoints are cursor-paginated and impose bounded limits.

### Friendships

| Method | Route | Behavior |
| --- | --- | --- |
| POST | `/social/friends/requests` | Send or reopen a request with `{ addresseeId }`. |
| PATCH | `/social/friends/:id/accept` | Accept an incoming request and atomically create or return the DM. |
| PATCH | `/social/friends/:id/reject` | Reject an incoming request. |
| PATCH | `/social/friends/:id/block` | Block the other participant. |
| PATCH | `/social/friends/:id/unblock` | Remove a block without creating a request. |
| DELETE | `/social/friends/:id` | Remove an accepted friendship. |
| GET | `/social/friends` | List accepted friendships. |
| GET | `/social/friends/requests` | List incoming pending requests. |
| GET | `/social/friends/sent` | List outgoing pending requests. |

### Conversations and messages

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/social/conversations` | List active inbox conversations, ordered by `lastMessageAt DESC`. |
| POST | `/social/conversations` | Create a group with title and initial member IDs. |
| GET | `/social/conversations/:id` | Return a conversation and members visible to the caller. |
| PATCH | `/social/conversations/:id` | Update group title/avatar; owner or admin only. |
| DELETE | `/social/conversations/:id` | Disband a group; owner only. |
| POST | `/social/conversations/:id/invites` | Create a pending group invite. |
| PATCH | `/social/conversations/:id/invites/:userId` | Accept, decline, or cancel an invite as authorized. |
| DELETE | `/social/conversations/:id/members/:userId` | Leave or kick an active member as authorized. |
| PATCH | `/social/conversations/:id/members/:userId/role` | Change a member role; owner only. |
| PATCH | `/social/conversations/:id/mute` | Set or clear the caller's `mutedUntil`. |
| POST | `/social/conversations/:id/calls` | Start an audio/video call for active members; rejects if another call is ringing or active. |
| GET | `/social/conversations/:id/calls` | List call history for the conversation. |
| GET | `/social/conversations/:id/messages` | Fetch messages before a `(createdAt, id)` cursor. |
| POST | `/social/conversations/:id/messages` | Persist a message using `clientMessageId`; broadcasts after commit. |
| PATCH | `/social/conversations/:id/read` | Advance the caller's read checkpoint. |
| GET | `/social/calls/:id` | Return call state and ICE server config for a participant. |
| PATCH | `/social/calls/:id/join` | Mark the caller joined and transition ringing calls to active. |
| PATCH | `/social/calls/:id/decline` | Decline an invited call and end it if no other invitees remain. |
| PATCH | `/social/calls/:id/leave` | Leave a call and end it when no joined participants remain. |
| DELETE | `/social/messages/:id` | Soft-delete a message; sender may delete own messages, owner/admin policy is explicit for group moderation. |
| PUT | `/social/messages/:id/reactions/:emoji` | Add a reaction idempotently. |
| DELETE | `/social/messages/:id/reactions/:emoji` | Remove the caller's reaction idempotently. |

Every conversation route first confirms active membership. Role checks happen in the domain service, never only in the route handler. Blocking prevents new DM sends and friend actions; existing group membership is unaffected unless a later moderation policy says otherwise.

Call responses that can create or rehydrate a WebRTC peer connection include `iceServers`. `CALL_STUN_URLS` always contributes STUN URLs when configured. `CALL_TURN_URLS` with `CALL_TURN_USERNAME` and `CALL_TURN_CREDENTIAL` adds static TURN credentials for local/dev. Production should prefer `CALL_TURN_SHARED_SECRET`, which generates coturn REST-style short-lived usernames in the shape `{expiresAt}:{userId}:{callId}` and HMAC-SHA1 credentials. `CALL_TURN_CREDENTIAL_TTL_SECONDS` controls the credential lifetime.

## Real-time contract

Socket.io is used for delivery, typing, read updates, presence, and event-driven UI refresh. It is not trusted as an authorization boundary.

### Connection and rooms

The client provides a fresh JWT in the Socket.io `auth` handshake. The server authenticates it with the same rules as HTTP, joins `user:{userId}`, and joins `conv:{conversationId}` only for active memberships. A membership change immediately joins or evicts the affected user's sockets. Every event rechecks membership from the authoritative service or a short-lived membership cache.

On deployments with more than one backend instance, Socket.io uses the Redis adapter and the ingress supports WebSocket upgrade plus sticky sessions. Redis is mandatory for real-time mode; the app either exposes social chat as temporarily unavailable or uses a documented single-instance fallback, never silently delivers partial events.

### Client to server

| Event | Payload | Result |
| --- | --- | --- |
| `typing:start` | `conversationId` | Refresh a short typing TTL and broadcast to other active members. |
| `typing:stop` | `conversationId` | Remove typing state and broadcast stopped state. |
| `message:read` | `conversationId`, `lastMessageId` | Call the same read-checkpoint service as HTTP. |
| `presence:ping` | none | Refresh this socket's presence TTL. |
| `call:offer` | `callId`, `toUserId`, `description` | Recheck call participation and relay only to `user:{toUserId}`. |
| `call:answer` | `callId`, `toUserId`, `description` | Recheck call participation and relay only to `user:{toUserId}`. |
| `call:ice-candidate` | `callId`, `toUserId`, `candidate` | Recheck call participation and relay only to `user:{toUserId}`. |
| `call:media-state` | `callId`, `toUserId`, `mediaState` | Recheck call participation and relay only to `user:{toUserId}`. |

Durable message, friend, membership, reaction, and moderation commands use the HTTP endpoints. This gives clients standard retry semantics and makes idempotency explicit. If a future client needs a socket command for one of these actions, it must use the same service and return the same acknowledgement shape: `{ ok, data }` or `{ ok: false, error: { code, message } }`.

### Server to client

| Event | Payload |
| --- | --- |
| `message:new` | Canonical message record and conversation ID. |
| `message:deleted` | Message ID and conversation ID. |
| `typing:indicator` | Conversation ID, user summary, and `typing` boolean. |
| `read:updated` | Conversation ID, user ID, last read message ID, and timestamp. |
| `conversation:updated` | Conversation summary or changed fields. |
| `member:invited` | Conversation ID and pending member summary. |
| `member:added` | Conversation ID and active member summary. |
| `member:removed` | Conversation ID and user ID. |
| `reaction:updated` | Message ID and aggregated reactions. |
| `friend:incoming` | Friendship ID and requester summary. |
| `friend:accepted` | Friendship ID, friend summary, and DM conversation ID. |
| `presence:update` | User ID, online boolean, and last-seen timestamp. |
| `call:incoming` | Canonical call record for an invited participant. |
| `call:participant-joined` | Call ID, user ID, and refreshed call record. |
| `call:participant-left` | Call ID, user ID, participant status, and refreshed call record. |
| `call:ended` | Call ID, end reason, and refreshed call record. |
| `call:offer` | Relayed SDP offer with `fromUserId`. |
| `call:answer` | Relayed SDP answer with `fromUserId`. |
| `call:ice-candidate` | Relayed ICE candidate with `fromUserId`. |
| `call:media-state` | Relayed audio/video enabled state with `fromUserId`. |

All message events are emitted only after the database transaction commits. A reconnecting client reloads its inbox and message cursor through HTTP; it never relies on replaying a complete Socket.io event history.

## Ephemeral Redis state

Redis accelerates transient state but does not determine unread correctness.

| Key pattern | Value | TTL / behavior |
| --- | --- | --- |
| `social:presence:socket:{socketId}` | user ID | Refreshed by heartbeat; removed on disconnect. |
| `social:presence:user:{userId}` | active socket count or set | Derived from socket keys; online while count is positive. |
| `social:typing:{conversationId}:{userId}` | `1` | Four seconds; client refreshes while typing. |
| `social:membership:{conversationId}:{userId}` | active-membership marker | Short cache only; invalidated on membership change. |

Unread state is calculated from persisted messages and `lastReadMessageId`. Redis may cache the returned count, but cache loss must only cause a recomputation.

## Content, sharing, and uploads

For `MANGA_SHARE`, the client submits only `mangaId` and an optional chapter ID. The server validates those records and creates the stored card payload from catalog data. The client renders the saved payload, not arbitrary client-provided title or cover URL.

Images use a direct-upload flow with short-lived presigned upload authorization. Enforce file size, MIME type, image dimension limits, object ownership, and a post-upload validation step before a URL can be attached to a message. Do not accept arbitrary remote image URLs. Voice notes follow the same authorization and validation model when introduced.

## Authorization, abuse prevention, and privacy

- Enforce active membership and object ownership on every command and event.
- Rate-limit friend requests, sends, reactions, typing, invites, and uploads separately using user and IP dimensions.
- Bound text length, reaction emoji length, invite count, group size, pagination limit, and attachment count.
- Escape/render message content as plain text; do not render user content as HTML.
- Record structured audit logs for moderation and membership changes without logging message bodies.
- A muted member still receives in-app updates; mute suppresses notifications and push delivery only.

## Implementation phases

### Phase 0: foundation and migration

- Add the social schema, generalized notifications, migrations, generated client, and domain service boundaries.
- Keep AI chat tables/endpoints unchanged and migrate existing comment notifications safely.
- Add Socket.io server setup, JWT handshake, CORS policy, Redis adapter, health/readiness checks, and deployment proxy configuration.
- Add transaction, authorization, migration, and reconnect/idempotency test scaffolding.

### Phase 1: friendship and durable DM creation

- Implement friendship commands, lists, block/unblock rules, notifications, and rate limits.
- Implement atomic DM creation with canonical `directKey` and active memberships.
- Deliver friend notifications through the existing notification channel and Socket.io user room where available.

### Phase 2: direct-message inbox and real-time delivery

- Implement inbox, cursor pagination, idempotent message sends, soft deletion, and durable read checkpoints.
- Emit post-commit message/read events, typing indicators, and multi-socket presence.
- Build inbox and DM UI with reconnect reload, optimistic send reconciliation, unread counts, and accessible keyboard behavior.

### Phase 3: group chat

- Implement group creation, pending invites, accept/decline/cancel flows, membership events, role guards, leave/kick, ownership transfer, and disband.
- Write system messages for completed membership and moderation actions.

### Phase 4: rich features and offline delivery

- Add validated manga sharing, upload flow for images, reply previews, reactions, and mute controls.
- Queue push delivery for users without active sockets, respecting mute and notification preferences.
- Add voice notes only after storage, abuse controls, and mobile playback requirements are specified.

## Verification and release gates

Before enabling social chat in production, verify:

- Prisma migration applies to a database containing existing RAG chat and comment notifications, with rollback and backup procedure documented.
- Unit tests cover friendship state transitions, direct-key races, permissions, read checkpoint monotonicity, and notification payloads.
- Integration tests cover every social HTTP route, membership isolation, transaction rollback, and cursor behavior.
- Socket tests cover invalid JWTs, membership changes, reconnect reload, duplicate client message IDs, multiple tabs, typing expiry, and cross-instance delivery.
- Browser and mobile flows cover sending, reading, inviting, blocking, offline reconnect, screen-reader labels, and keyboard navigation.
- Load tests establish limits for large inboxes, busy groups, and Socket.io/Redis failure behavior.
- Observability includes connection counts, send latency, event failures, Redis adapter health, notification queue failures, and rate-limit rejections without message-body logging.

## Out of scope

End-to-end encrypted messages, full-text message search, message editing, ephemeral messages, read receipts beyond the last-read checkpoint, and voice notes are not part of the first social-chat release unless separately specified.
