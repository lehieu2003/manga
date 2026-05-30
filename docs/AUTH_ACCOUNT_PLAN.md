# Auth and Account MVP Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the Account MVP without needing the original conversation.

## Summary

The Account MVP turns Settings into a real account page. Users can update their display name and avatar URL, change password safely, and logout through the backend refresh-token revoke flow. This slice does not add password reset, email verification, OAuth, upload storage, or multi-device session UI.

## Key Changes

- Add authenticated profile update for display name and avatar URL.
- Add authenticated password change that verifies the current password, updates the password hash, revokes existing refresh sessions, and returns a fresh token pair for the current browser.
- Make frontend logout call the backend logout endpoint, then clear local tokens even if the revoke request fails.
- Replace Settings placeholder with Profile, Security, and Session sections that match the current manga cafe theme.
- Keep account routes protected and keep existing login/register/session refresh behavior.

## Public Interfaces

- `PATCH /api/me`
  - Request: `{ displayName?: string, avatarUrl?: string | null }`
  - Response: `{ user }`
  - Empty avatar string is treated as `null`.
- `PUT /api/me/password`
  - Request: `{ currentPassword: string, newPassword: string }`
  - Response: `{ user, accessToken, refreshToken }`
- `POST /api/auth/logout`
  - Existing endpoint remains, now used by the frontend logout flow.

## Validation Defaults

- Display name is trimmed and must be 2-40 characters.
- Avatar URL is optional, nullable, and must be a valid URL when present.
- New password must be 8-128 characters.
- No Prisma migration is required because the user and refresh session fields already exist.

## Test Scenarios

- Profile update changes display name and avatar URL for the authenticated user.
- Invalid profile input is rejected.
- Password change rejects an incorrect current password.
- Password change revokes old refresh sessions and returns fresh tokens.
- Logout revokes the current refresh token and local logout still succeeds if the token is already stale.
- Settings renders account identity, saves profile input, validates password confirmation, and protects anonymous access.

## Later Work

- Forgot password and reset password.
- Email verification.
- OAuth login.
- Multi-device session management UI.
- Avatar upload/proxy/storage.
