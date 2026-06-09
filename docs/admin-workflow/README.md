# Admin Workflow

Reader: engineer implementing or reviewing the admin API and admin UI.

Post-read action: implement each step without deciding auth model, API ownership, destructive-action policy, UI scope, or verification again.

## Summary

The current app has developer/operator catalog sync endpoints, but no admin dashboard. This workflow turns those endpoints into a full admin surface for managing the data that already exists in the system.

Target architecture:

```text
Admin UI
  -> Admin API with X-Admin-Token
  -> PostgreSQL / Redis

Admin catalog operations
  -> MangaDex official API
  -> PostgreSQL cache

Reader UI
  -> Existing public/authenticated APIs
  -> No behavior change
```

## Step Status

| Step | File | Status |
| --- | --- | --- |
| 01 | [Admin token foundation](STEP-01-admin-token-foundation.md) | done |
| 02 | [Admin overview API/UI](STEP-02-admin-overview-api-ui.md) | done |
| 03 | [Catalog admin ops](STEP-03-catalog-admin-ops.md) | done |
| 04 | [User admin management](STEP-04-user-admin-management.md) | done |
| 05 | [Library, progress, and history admin](STEP-05-library-progress-history-admin.md) | done |
| 06 | [Tests, docs, and ops](STEP-06-tests-docs-ops.md) | done |

Update this table during implementation. Each step file also has its own status field and must be updated before marking the step complete.

## Global Decisions

- Admin auth remains `X-Admin-Token` backed by `ADMIN_SYNC_TOKEN`.
- Admin token is stored in browser `sessionStorage`, not `localStorage`.
- Admin v1 does not add user roles or a Prisma user status field.
- Manage-all-data scope includes edit and delete for existing schema data.
- User ban/lock is out of scope because the current schema has no account status.
- Destructive admin UI actions require confirmation before calling the API.
- Admin mutations return affected-count summaries where possible.
- No persistent audit log is required in this milestone, but backend admin mutations should log action, target id, and affected count.
- Existing reader, catalog, auth, library, and progress APIs remain stable.
- Swagger/OpenAPI schemas must be kept in sync with new admin endpoints.

## Implementation Order

1. Build the shared admin-token foundation first so all later routes and UI calls use the same security model.
2. Add overview next to prove the admin token flow, API client, query handling, and UI state model end to end.
3. Move catalog sync/import into the admin UI and add cache management.
4. Add user management after the basic admin shell is working.
5. Add library, progress, and search-history management inside user detail.
6. Finish with broad verification, docs status updates, and manual ops checks.

## Completion Rule

A step is only `done` when:

- The code or docs described by that step are implemented.
- The relevant tests/checks in that step pass.
- The step file has a `Completed verification` section with exact commands.
- This index status and the step file status are updated.
- Any public API or behavior change is reflected in docs and Swagger schemas.
