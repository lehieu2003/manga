# Face-to-Face Calling — Detailed Step-by-Step Implementation Plan

## Purpose and scope

This document is a standalone, detailed execution plan for a future Phase 5 of the realtime social chat system: live audio/video calling between friends and group members. It assumes the current codebase baseline after Phase 4 option 1: social conversations, messages, group invites, manga sharing, message reactions, conversation mute controls, authenticated Socket.io rooms, and mobile/web social chat clients exist. Infrastructure-heavy Phase 4 follow-ups such as image upload, offline push delivery, and voice notes are still separate work unless explicitly called out below.

Read this together with `REALTIME_CHAT.md`, which holds the current social-chat baseline and route namespace. The initial backend contract slice has been copied back into `REALTIME_CHAT.md`: call persistence, HTTP lifecycle routes, ICE server config response, Socket.io signaling relay, and missed-call timeout handling. TURN provisioning, web/mobile WebRTC clients, push/native incoming-call UI, and end-to-end QA remain follow-up work.

## Background: why calling needs different technology than chat

Chat messages are small, can tolerate a few hundred milliseconds of delay, and are naturally suited to "send to server, server stores and forwards it." Audio/video is the opposite: it is large, continuous, and breaks down if delayed by more than roughly 150–200ms. Routing every participant's video stream through the application server would multiply server bandwidth costs by the number of concurrent calls and add a hop of latency neither side needs.

The standard solution is to let participants' devices send media **directly to each other** (peer-to-peer) using **WebRTC**, while the existing application server is only used to help the two devices discover and connect to each other (this discovery step is called **signaling**) and to keep a record of who called whom and when.

Three technical building blocks make this possible, and the rest of this plan is organized around implementing each one:

1. **WebRTC** — the browser/mobile API standard that captures camera/microphone input, encodes it, and streams it directly between two devices once they know how to reach each other.
2. **Signaling** — a message-passing channel (this plan reuses the existing Socket.io connection) that lets two devices exchange the technical details needed to start a WebRTC connection. Signaling messages are small text payloads, not media.
3. **STUN/TURN** — supporting servers that solve the "two devices are both behind home/office routers and don't have public IP addresses" problem. STUN helps a device discover its own public-facing address; TURN is a fallback relay used only when a fully direct connection cannot be established.

## Step-by-step plan

### Step 0 — Confirm prerequisites

- [ ] Confirm the current social-chat baseline is deployed: authenticated Socket.io connection per user (`user:{userId}` room), active membership rooms (`conv:{conversationId}`), `SocialConversation` / `SocialConversationMember` tables, group invites, message reactions, and per-member `mutedUntil` controls are stable.
- [ ] Decide on a TURN provider before writing any call code, since both backend config and client code need TURN credentials from day one (see Step 6). Options, roughly in order of setup effort:
  - Managed service (e.g. Twilio Network Traversal Service, Cloudflare Calls, Daily, Xirsys) — fastest to start, has a cost per relayed minute.
  - Self-hosted **coturn** — open source, more setup and operational ownership, lower marginal cost at scale.
- [ ] Confirm target call sizes for v1: 1:1 calls (always direct mesh — 2 peers) and small group calls (mesh, capped at 8 participants). Anything larger requires an SFU, which is explicitly out of scope for this phase.

### Step 1 — Database schema and migration (Backend) — backend contract slice implemented

1. Add the enums `CallStatus`, `CallMediaType`, `CallParticipantStatus` and the models `CallSession`, `CallParticipant` to `schema.prisma`, plus the relation fields on `User` and `SocialConversation`. These models do not exist in the current schema yet.
2. Add a partial/composite constraint so at most one `CallSession` with status `RINGING` or `ACTIVE` exists per DM `conversationId` at a time. Enforce this at the database level (a partial unique index in the migration SQL) in addition to checking it in application code, the same pattern already used for the DM `directKey` uniqueness.
3. Run `npx prisma migrate dev --name add_call_sessions` (or the project's equivalent migration command) against a database that already contains chat and social data, and verify the migration applies cleanly with no data loss.
4. Regenerate the Prisma client and confirm the new types (`CallSession`, `CallParticipant`, related enums) are available to the backend service layer.

**Verification:** migration applies to a copy of the production-like database; `CallSession`/`CallParticipant` types compile; the partial unique index is confirmed with a manual SQL insert test (second concurrent active call in the same DM is rejected).

### Step 2 — Call domain service (Backend) — backend contract slice implemented

1. Implement `callService.startCall(conversationId, initiatorId, mediaType)`:
   - Verify the initiator has active membership in the conversation (reuse the existing membership-check helper used by message routes).
   - For a DM, verify neither participant has blocked the other (reuse the existing block-check helper).
   - In a transaction: check for an existing active session for this conversation, create the `CallSession` row (`status: RINGING`), and create one `CallParticipant` row per currently active member (`status: INVITED` for everyone except the initiator, who starts `JOINED`).
   - Return the created session with participants.
2. Implement `callService.joinCall(callId, userId)`, `declineCall(callId, userId)`, `leaveCall(callId, userId)` following the state transitions already specified in the API contract table in `REALTIME_CHAT.md`. Each method re-checks active membership before mutating state.
3. Implement `callService.getCall(callId, userId)` and `callService.listCallHistory(conversationId, userId, cursor)` for reconnect/history use cases, following the same cursor-pagination pattern already used for message history.
4. Write unit tests for: starting a call when one already exists (should reuse/reject, not duplicate), starting a call against a blocked DM (should reject), join/decline/leave state transitions, and that a call with zero remaining `JOINED` participants transitions to `ENDED`.

**Verification:** `npm run test -- call.service.test.ts` passes; `npm run typecheck` passes.

### Step 3 — HTTP routes (Backend) — backend contract slice implemented

1. Implement the six routes from the API contract table under the current `/api` prefix (`POST /social/conversations/:id/calls`, `PATCH /social/calls/:id/join`, `PATCH /social/calls/:id/decline`, `PATCH /social/calls/:id/leave`, `GET /social/calls/:id`, `GET /social/conversations/:id/calls`), each calling the corresponding domain service method and returning the project-standard error envelope on failure.
2. Add rate limiting on `POST /social/conversations/:id/calls`, scoped per user and per conversation, to prevent ring-spam (reuse the existing rate-limiter middleware pattern from friend requests).
3. Write integration tests covering: starting a call as a non-member (403), starting a second call on an already-ringing DM (409/conflict), the full start → join → leave happy path, and cursor pagination of call history.

**Verification:** `npm run test -- social-call.routes.test.ts` passes; `npm run typecheck` passes.

### Step 4 — Socket.io signaling relay (Backend) — backend contract slice implemented

1. Add four new socket event handlers on the existing authenticated socket connection: `call:offer`, `call:answer`, `call:ice-candidate`, `call:media-state`. Each handler:
   - Re-validates that the sending user is an active participant of the call's conversation (do not trust the client-supplied `callId` alone — look up the call and its conversation, then check membership, same defense-in-depth pattern as message and typing events).
   - Relays the payload only to `toUserId`'s `user:{userId}` room, not to the whole conversation room, so unrelated members never see another participant's signaling traffic.
2. Emit `call:incoming` to all `INVITED`/`RINGING` participants' `user:{userId}` rooms when `startCall` commits.
3. Emit `call:participant-joined`, `call:participant-left`, and `call:ended` to the conversation room (`conv:{conversationId}`) after the corresponding service transaction commits, following the existing "emit only after commit" rule used for messages.
4. Write socket tests covering: signaling relay between two valid members succeeds; signaling relay where `toUserId` is not an active member is rejected; reconnect mid-call (client should call `GET /social/calls/:id` on reconnect to rehydrate state rather than relying on replayed socket events, same reconnect pattern as chat).

**Verification:** socket test suite passes; manual two-browser-tab smoke test of a full call (ring → answer → media flows → hang up).

### Step 5 — Ringing timeout and missed-call handling (Backend) — backend timeout slice implemented

1. Implement a scheduled sweep (interval job or a delayed queue entry created at call start) that checks `RINGING` sessions older than the timeout (45 seconds default, make it configurable).
2. On timeout: mark the session `MISSED`, mark all still-`INVITED`/`RINGING` participants `MISSED`, emit `call:ended` with reason `no-answer`, and create a call-specific notification payload. Reuse the existing generic notification table, but add a dedicated notification type if missed-call rendering needs copy or routing that differs from `CHAT_MESSAGE`.
3. Store the sweep's working state in Redis (`social:call:ringing:{callId}`) so the sweep does not need to scan the full `CallSession` table; the database row remains authoritative if the Redis key is lost (recompute from `status = RINGING AND startedAt < now() - timeout`). The implemented v1 sweep uses the authoritative database query directly; Redis optimization can be added if call volume requires it.
4. Write a test that fast-forwards time (or directly invokes the sweep function) and asserts the missed-call transition and notification creation.

**Verification:** sweep unit test passes; manual test confirms a real un-answered call transitions to missed within the timeout window.

### Step 6 — TURN/STUN provisioning (Infra)

1. Stand up the chosen TURN solution (managed provider account, or deploy coturn behind a stable public IP with TLS).
2. Generate short-lived, per-call or per-session TURN credentials server-side (most providers support time-limited credentials via a shared secret — never ship a long-lived static TURN password to the client).
3. Add a backend endpoint or include TURN credentials in the `startCall`/`joinCall` response payload so the client receives a fresh ICE server list (STUN + TURN URLs + credentials) at call time.
4. Document the TURN credential rotation policy and the environment variables/secrets required in each deployment environment (staging, production).

**Verification:** a manual call between two devices on different restrictive networks (e.g. two different mobile data connections) succeeds, confirming TURN relay works when direct connection fails.

### Step 7 — Web frontend (React)

1. Build a `useCall` hook/state machine that wraps the call lifecycle: `idle → ringing-outgoing → ringing-incoming → connecting → active → ended`.
2. Implement the WebRTC peer connection setup using the browser-native `RTCPeerConnection` and `navigator.mediaDevices.getUserMedia` APIs:
   - On call start/join, request camera+mic (or mic-only for audio calls) permission and attach the local stream.
   - Create the `RTCPeerConnection` with the ICE server list received from the backend (Step 6).
   - Wire `onicecandidate` to emit `call:ice-candidate` over the socket, and incoming `call:offer`/`call:answer`/`call:ice-candidate` socket events to the corresponding `RTCPeerConnection` methods (`setRemoteDescription`, `addIceCandidate`).
   - Attach the remote stream (`ontrack`) to a `<video>`/`<audio>` element.
3. Build the UI: incoming-call prompt (accept/decline) that listens for `call:incoming`, an in-call screen with mute/camera-toggle/hang-up controls, and a call-history entry in the conversation view sourced from `GET /social/conversations/:id/calls`.
4. Handle teardown: stop local media tracks and close the `RTCPeerConnection` on hang-up, on the other party leaving, and on tab close (`beforeunload`).
5. Write component/unit tests for the state machine transitions and for correctly relaying signaling events to mocked `RTCPeerConnection` calls.

**Verification:** `npm run test -- call*.test.tsx`, `npm run typecheck`, `npm run build` all pass; manual two-tab call works end-to-end including mute/camera toggle and hang-up.

### Step 8 — Mobile frontend (Flutter)

1. Add the `flutter_webrtc` package (the Flutter binding to native iOS/Android WebRTC), since Flutter does not expose WebRTC APIs out of the box — it needs a plugin bridging to the same native WebRTC implementations the web browser uses internally.
2. Request camera/microphone permissions through `permission_handler` (or equivalent) before starting capture; handle the case where permission is denied with a clear in-app message rather than a silent failure.
3. Reuse the same call state machine logic from Step 7 conceptually (idle → ringing-outgoing → ringing-incoming → connecting → active → ended); implement it as a Dart class/ChangeNotifier (or Bloc/Riverpod, matching the project's existing state management) using `flutter_webrtc`'s `RTCPeerConnection`, `MediaStream`, and `RTCVideoRenderer` for local/remote video views.
4. Implement the native incoming-call UI for foreground sessions first. A full-screen prompt that works when the app is backgrounded requires the push provider work in Step 9; do not rely on the current mobile socket for background delivery.
5. Handle the iOS/Android background and lock-screen audio session requirements. On iOS this means integrating `flutter_callkit_incoming` (or similar) to surface CallKit's native call UI; on Android it means running a foreground service while a call is active so the OS does not kill it. Treat this as its own sub-task with explicit OS-version testing, since this is the area most likely to need iteration.
6. Write widget/unit tests for the shared state machine logic; manual device testing for the native call UI, backgrounding, and permission flows, since WebRTC media behavior is not fully reproducible in a simulator/emulator.

**Verification:** manual call test on at least one physical iOS device and one physical Android device, including: app backgrounded mid-call, screen locked mid-call, and permission-denied flow.

### Step 9 — Push notification integration for incoming calls (Backend + Mobile)

The current codebase has in-app notifications and Socket.io, but no APNs/FCM provider or durable notification queue. Treat this as a prerequisite slice before claiming backgrounded mobile incoming calls work.

1. When `call:incoming` is emitted and the target user has no active socket connection (offline or backgrounded app), send a high-priority push notification (APNs/FCM) carrying the call metadata, distinct from a normal chat push, so the mobile OS can show a native incoming-call UI even if the socket is not connected.
2. Ensure the push payload contains enough information (`callId`, `conversationId`, initiator summary, media type) for the client to render the incoming-call screen without an extra round trip, but still re-fetches `GET /social/calls/:id` before acting, in case the call state changed (e.g. already declined elsewhere) between push send and tap.

**Verification:** manual test of an incoming call while the receiving device's app is fully backgrounded/killed.

### Step 10 — End-to-end QA and load checks

1. Functional matrix: 1:1 audio call, 1:1 video call, group call at 2/4/8 participants, decline, missed/timeout, mid-call network drop and reconnect, mute/camera toggle, leaving and rejoining a group call, blocked-user call attempt.
2. Network condition checks: simulate restrictive NAT/symmetric NAT on at least one test device pair to confirm TURN fallback actually engages (do not rely only on same-network testing, which always succeeds via direct/STUN and will hide TURN misconfiguration).
3. Load/operational checks: confirm TURN relay bandwidth and concurrent-session limits are understood for the expected concurrent-call volume, and that Socket.io/Redis instances are sized for the additional signaling event volume.
4. Observability: confirm call start/connect/end events, signaling relay failures, missed-call rate, and TURN allocation/relay usage are visible in existing dashboards/logs (no SDP/ICE payload contents in logs, per the privacy rule already specified in `REALTIME_CHAT.md`).

**Verification:** sign-off checklist completed; dashboards show call metrics; at least one cross-network (TURN-forcing) manual test passed.

## Rollout recommendation

Ship behind a feature flag, enabled first for 1:1 audio/video calls only (smaller surface area, no mesh-scaling concerns), verify in production with internal/staff accounts, then enable group calls up to the 8-participant cap. Defer any SFU work until real usage data shows group call size or quality needs exceed what the mesh model can support.

## Summary of technology choices

| Concern                              | Technology                                                    | Why                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Peer media transport                 | WebRTC (`RTCPeerConnection`)                                  | Browser/mobile-native standard for direct, low-latency audio/video between devices; avoids routing media through the app server.     |
| Signaling channel                    | Existing Socket.io connection                                 | Already authenticated and connected for chat; reused rather than building a second realtime channel.                                 |
| NAT traversal (discovery)            | STUN                                                          | Lets a device learn its own public-facing address so peers can attempt a direct connection.                                          |
| NAT traversal (fallback)             | TURN (managed provider or self-hosted coturn)                 | Relays media when a direct connection cannot be established, which happens for a meaningful share of real-world network pairs.       |
| Mobile WebRTC binding                | `flutter_webrtc`                                              | Mobile apps don't get the same WebRTC API surface as a web browser; this library binds to native iOS/Android WebRTC implementations. |
| Call/session persistence             | Prisma (`CallSession`, `CallParticipant`)                     | Durable history and missed-call state, consistent with how the rest of the system already persists chat/social data.                 |
| Backgrounded incoming calls (mobile) | Push notifications (APNs/FCM) + native call UI (e.g. CallKit) | A backgrounded mobile socket connection is not reliable; OS-level call UI requires native integration, not just a socket event.      |
