# Auth and Account Next Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: implement the next account-management slices for normal users.

## Summary

Account work should make users safer without forcing a provider decision too early. Forgot/reset password and registration email OTP verification are implemented. The next slices are multi-device session management, avatar upload, and optional OAuth later.

## User Goals

- Recover an account when the password is forgotten. Done for web/backend.
- Verify account email ownership. Done for registration OTP.
- See active sessions and revoke devices.
- Upload or remove an avatar.
- Keep email/password login working even if OAuth is added later.

## Key Changes

- Backend: reset-token lifecycle, registration OTP verification, and Gmail/SMTP-capable email sender abstraction are in place; add session listing/revoke endpoints and storage-backed avatar upload next.
- Web: forgot/reset pages and registration OTP screen are in place; add account verification state in settings, session management section, and avatar uploader next.
- Mobile: add matching reset-password entry points, verification status, session list, and avatar upload after web/backend contracts stabilize.

## Public Interfaces / Types

- `POST /api/auth/password/forgot` with an email input and generic success response is implemented.
- `POST /api/auth/password/reset` with reset token and new password is implemented.
- `POST /api/auth/email/verification` resends a registration OTP for unverified accounts.
- `POST /api/auth/email/verify` verifies a six-digit OTP and returns the first token pair.
- Add `GET /api/me/sessions` and `DELETE /api/me/sessions/:id`.
- Add `POST /api/me/avatar` for upload and `DELETE /api/me/avatar`.
- Add Prisma models for one-time account tokens and optional avatar storage metadata.

## UX Behavior

- Forgot-password always shows the same success copy whether the email exists or not.
- Reset-password page validates token before showing the password form when practical.
- Settings shows email verification status and a resend action.
- Session list marks the current session and disables revoking it from the destructive one-click path.
- Avatar upload previews the selected image and falls back to the existing avatar URL behavior until upload is configured.

## Edge Cases

- Reset and verification tokens expire and cannot be reused.
- Password reset revokes existing refresh sessions after success.
- Email delivery failures are logged and returned as retryable UI errors.
- Already-verified emails show a stable no-op success when resend is requested.
- Avatar uploads reject unsupported file types and oversized files before storage write.

## Test Plan

- Backend tests cover generic forgot response, token expiry, one-time token use, password reset session revocation, email verification, session revoke permissions, and avatar validation.
- Frontend tests cover forgot/reset forms, invalid token state, verification resend, session revoke UI, and avatar upload/remove states.
- Mobile tests cover reset-password navigation and account screen rendering once implemented.

## Acceptance Criteria

- Users can reset a password without account enumeration.
- Verification state is visible and actionable.
- Users can inspect and revoke non-current sessions.
- Avatar upload uses storage-backed data, not arbitrary file paths.
- Existing login, register, refresh, logout, profile update, and password change still work.

## Assumptions

- Email sender uses an abstraction so dev/test can use an in-memory or log sender.
- Gmail SMTP uses a Google App Password through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`.
- OAuth is not implemented until a provider is chosen.
- Avatar URL input remains a compatibility fallback.
