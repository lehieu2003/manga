# Group Invite Backend Design

## Context

Realtime social chat is in Phase 3. Group conversation creation exists on the backend, web, and mobile, but group membership after creation is still missing. This design covers only pending invites and invite resolution. Leave, kick, role changes, ownership transfer, disband, and system messages remain separate follow-up slices.

## Goals

- Let active group owners and admins invite accepted friends into an existing group.
- Represent invites using the existing `SocialConversationMember.status = PENDING_INVITE` state.
- Let invitees accept or decline their own pending invites.
- Let group owners and admins cancel pending invites.
- Return the standard serialized conversation payload after membership changes.
- Create a `GROUP_INVITE` notification when an invite is created.

## API

Add two authenticated routes under the existing social conversation route module:

- `POST /social/conversations/:id/invites`
  - Body: `{ "userId": "target-user-id" }`
  - Creates or reopens a pending invite for the target user.
- `PATCH /social/conversations/:id/invites/:userId`
  - Body: `{ "action": "accept" | "decline" | "cancel" }`
  - Resolves an existing pending invite.

Both endpoints return `{ conversation }`, using the same conversation serializer used by list/get/create.

## Authorization Rules

- The conversation must exist and must be `GROUP`.
- Invites cannot be created or resolved through `DM` conversations.
- Invite creators must have an active membership in the group and role `OWNER` or `ADMIN`.
- Invite targets must be accepted friends with the inviter.
- A user who is already an active member cannot be invited again.
- Accept and decline actions may only be performed by the pending invitee.
- Cancel may only be performed by an active `OWNER` or `ADMIN`.
- A missing conversation, missing active actor membership, or inaccessible invite should use the existing not-found style where possible to avoid leaking private group membership.

## State Transitions

- Invite create:
  - No membership row: create `PENDING_INVITE` with role `MEMBER`.
  - Existing `LEFT` membership: update to `PENDING_INVITE`, role `MEMBER`, and refresh `joinedAt`.
  - Existing `PENDING_INVITE`: return the current conversation idempotently.
  - Existing `ACTIVE`: reject with an explicit already-member error.
- Accept:
  - `PENDING_INVITE` to `ACTIVE`.
  - Refresh `joinedAt` so ordering reflects when the user joined.
- Decline:
  - `PENDING_INVITE` to `LEFT`.
- Cancel:
  - `PENDING_INVITE` to `LEFT`.

## Notifications

Creating an invite creates one `GROUP_INVITE` notification for the invitee. The payload should include routing metadata only:

- `conversationId`
- `inviterId`
- `conversationTitle`

The notification should not include private message content. Re-sending an already pending invite should not create duplicate notifications.

## Service Boundaries

Keep the logic in `social-conversation.service.ts` for this slice because it owns conversation membership rules today. Add small helper functions for:

- loading and checking group actor membership
- checking accepted friendship between two users
- loading the updated conversation after a mutation

If the service grows too large during later member-management work, split membership actions into a dedicated group-membership service then.

## Testing

Add integration coverage in `backend/src/tests/integration/routes/social-conversation.routes.test.ts`:

- owner invites an accepted friend and creates a pending member plus notification
- invite creation rejects non-friends
- invite creation rejects DM conversations
- active member cannot be invited again
- pending invite creation is idempotent and does not duplicate notification
- invitee accepts their pending invite
- invitee declines their pending invite
- owner/admin cancels a pending invite
- non-privileged members cannot create or cancel invites
- unrelated users cannot accept another user's invite

Run backend route tests and backend typecheck after implementation.
