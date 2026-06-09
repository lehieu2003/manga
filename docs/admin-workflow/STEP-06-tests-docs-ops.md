# Step 06: Tests, Docs, And Ops

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test -- admin`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- admin`
- `npm run build --workspaces`

## Goal

Lock the admin workflow with tests, Swagger coverage, docs updates, and repeatable manual checks.

## Key Changes

- Update this workflow index as each step is completed.
- Update each step file with completed verification commands.
- Update feature status docs with:
  - Admin API surface
  - `/admin` web route
  - current limitations
- Ensure Swagger/OpenAPI schemas include all new admin endpoints.
- Keep existing public APIs stable.
- Keep admin token operations documented for local and production environments.

## Backend Verification

Run:

```bash
npm --workspace backend test -- admin
npm --workspace backend run typecheck
```

Required scenarios:

- Missing admin token returns `401`.
- Wrong admin token returns `403`.
- Overview returns counts.
- Catalog sync/import still works.
- Cache management returns affected counts.
- User management validates inputs and returns affected counts.
- Library, progress, and search-history admin routes enforce token and paginate.
- Swagger schemas expose the admin API contract.

## Frontend Verification

Run:

```bash
npm --workspace frontend test -- admin
npm --workspace frontend run typecheck
```

Required scenarios:

- `/admin` token gate stores and clears session token.
- Admin API client sends `X-Admin-Token`.
- Overview renders loading, success, and error states.
- Catalog sync/import forms call the expected endpoints.
- Users table and user detail render admin data.
- Destructive actions require confirmation.

## Full Workspace Verification

Run:

```bash
npm run build --workspaces
```

## Manual Checks

Overview:

```bash
curl "http://localhost:4000/api/admin/overview" -H "X-Admin-Token: $ADMIN_SYNC_TOKEN"
```

Expected:

- Missing token returns `401`.
- Wrong token returns `403`.
- Valid token returns overview counts.
- `/admin` can store the token for the current browser session and call overview.

Catalog sync:

```bash
curl -X POST "http://localhost:4000/api/admin/catalog/sync?limit=3&languages=vi,en" -H "X-Admin-Token: $ADMIN_SYNC_TOKEN"
```

Expected:

- Response contains `status: "completed"`.
- Response contains a sync summary.

## Docs To Update

- Admin workflow index status table.
- Individual admin step status.
- Feature status API surface.
- Feature status web routes.
- README documentation index if the workflow location changes.
