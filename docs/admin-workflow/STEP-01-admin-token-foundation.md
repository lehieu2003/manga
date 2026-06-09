# Step 01: Admin Token Foundation

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`

## Goal

Turn the existing sync-only admin token into a reusable admin auth foundation and add the first `/admin` frontend gate.

## Key Changes

- Extract reusable backend admin token guard/middleware.
- Keep the current admin catalog behavior:
  - missing token returns `401`
  - wrong token returns `403`
  - missing server config returns `503`
- Update existing catalog admin routes to use the shared guard.
- Add frontend admin token utilities:
  - `getAdminToken`
  - `setAdminToken`
  - `clearAdminToken`
- Store the admin token in `sessionStorage`.
- Add `/admin` route with an `AdminGate` that asks for the token before showing admin content.
- Do not add data-management UI in this step.
- Do not add Prisma user roles in this step.

## API Behavior

All admin routes use:

```http
X-Admin-Token: <ADMIN_SYNC_TOKEN>
```

Errors stay consistent with existing admin catalog routes:

```json
{
  "error": {
    "code": "ADMIN_SYNC_TOKEN_REQUIRED",
    "message": "Admin sync token is required"
  }
}
```

The wording can be generalized from "sync token" to "admin token" only if tests and docs are updated in the same step.

## UI Behavior

- `/admin` shows a compact token form when no token exists in session storage.
- Saving the token does not validate it immediately unless the overview endpoint exists.
- Clearing the token returns the page to the token form.
- The admin nav item is visible only when an admin token exists in the current browser session.

## Tests

- Existing backend admin catalog route tests still pass.
- Backend test confirms shared guard preserves `401`, `403`, and `503`.
- Frontend test confirms admin token save and clear use `sessionStorage`.
- Frontend test confirms `/admin` renders the token gate when no token is present.
