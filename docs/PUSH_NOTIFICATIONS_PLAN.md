# Push Notifications Plan

## Goal

Add Android-first mobile push notifications using Firebase Cloud Messaging. Push delivery supplements the existing in-app notification center: the database remains the canonical notification history, Socket.io and SSE continue to deliver realtime in-app updates, and FCM wakes or alerts the mobile app when the user is not actively looking at it.

## Current System

The backend already persists user notifications for comments, friendship events, chat events, group invites, and missed calls. Those notifications are published through the notification stream and Socket.io user rooms after they are created. The mobile app already has authenticated API access, social realtime sockets, a notification center, and route destinations for manga detail, reader, and messages.

## Target Architecture

The Flutter app registers an Android FCM token after a signed-in session is restored or created. The backend stores active device tokens per user and sends push messages when existing notification creation code calls the notification publisher. The push data payload carries routing metadata only, so the app can open the right destination after a notification tap without exposing unnecessary private content.

## Backend Design

- Store push device tokens in a user-owned table with token, platform, optional device ID, optional app version, last seen timestamp, revocation timestamp, and normal created/updated timestamps.
- Expose authenticated endpoints to register/upsert the current token and unregister it during logout or token replacement.
- Initialize Firebase Admin only when credentials are configured. Local development and tests can run without FCM credentials.
- Dispatch FCM from the existing notification publish path after the notification has already been persisted.
- Generate concise titles and bodies for known notification types: comment reply, comment reaction, friend request, friend accepted, group invite, chat message, and missed call.
- Include only routing-safe data such as notification ID, type, subject type, subject ID, conversation ID, message ID, call ID, target type, and target ID.
- Revoke invalid tokens when FCM reports that a registration token is no longer valid.
- Log send failures with notification ID and token ID, but do not log private message content.

## Mobile Design

- Initialize Firebase before app startup.
- Request Android notification permission where the platform requires it.
- Register the FCM token after session restore and login.
- Refresh backend registration when Firebase rotates the token.
- Unregister the last known token on logout.
- Handle foreground notifications and notification taps.
- Route notification taps to existing screens:
  - comment notifications open the manga or chapter context when routing metadata is present;
  - social, group invite, chat, and missed-call notifications open messages;
  - unknown or unauthenticated taps open the app normally.

## Verification

- Backend tests cover token registration, idempotent upsert, unregister, user scoping, payload generation, invalid-token revocation, and no-credential no-op behavior.
- Mobile tests cover push data route parsing and token lifecycle repository calls.
- Manual Android checks cover foreground receipt, background receipt, killed-app tap routing, token refresh, logout unregister, and signed-out tap behavior.

## Deferred Work

- iOS/APNs configuration.
- User-facing notification preference controls.
- Durable queue/retry worker for high-volume push delivery.
- Native incoming-call UI for call pushes.
