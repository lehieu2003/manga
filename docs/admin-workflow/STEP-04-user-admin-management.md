# Step 04: User Admin Management

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`

## Goal

Let an admin search users, inspect user detail, edit profile fields, revoke sessions, and delete users.

## Key Changes

- Add user admin endpoints:
  - `GET /api/admin/users`
  - `GET /api/admin/users/:userId`
  - `PATCH /api/admin/users/:userId`
  - `POST /api/admin/users/:userId/sessions/revoke`
  - `DELETE /api/admin/users/:userId`
- Add users table to the admin UI.
- Add user detail view or panel.
- Add typed confirmation for user delete.
- Do not add ban, lock, or role fields in this step.

## API Behavior

User list:

- Accepts `query`, `limit`, and `offset`.
- Uses offset pagination with default `limit=25` and max `100`.
- Searches by email, display name, or id.
- Returns user identity plus activity counts where practical.

User update:

```json
{
  "displayName": "Shelf Keeper",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Rules:

- Email and password are not edited by admin v1.
- Avatar URL validation matches the existing profile update behavior.
- Session revoke marks active refresh sessions revoked.
- User delete relies on Prisma cascade behavior for related rows.
- Delete response returns an affected summary.

## UI Behavior

- Users table shows email, display name, created date, and activity counts.
- User detail shows profile fields and session actions.
- Profile edit uses explicit save/cancel controls.
- Revoke sessions requires a confirmation.
- Delete user requires typed confirmation using the target email.

## Tests

- Backend user list pagination works.
- Backend user detail returns user identity and counts.
- Backend profile patch validates display name and avatar URL.
- Backend revoke sessions calls the refresh session repository.
- Backend delete user removes the target user.
- Frontend users table renders search, pagination, and detail actions.
- Frontend revoke and delete actions require confirmation.
