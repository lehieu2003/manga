# Catalog Data Workflow Refactor

Reader: engineer implementing or reviewing the catalog read/sync separation.

Post-read action: implement each step without deciding API ownership, status semantics, or verification scope again.

## Summary

The current catalog workflow mixes two responsibilities in the same request path:

- Frontend read routes call MangaDex live APIs.
- Those same routes also write PostgreSQL cache rows.

This causes unstable reader behavior. A live MangaDex request can return `200 OK` with an empty chapter feed while PostgreSQL already has readable cached chapters. The refactor separates user-facing reads from MangaDex import/sync work.

Target architecture:

```text
Frontend
  -> Backend read API
  -> PostgreSQL / Redis

Scripts or admin sync API
  -> MangaDex official API
  -> PostgreSQL
```

## Step Status

| Step | File | Status |
| --- | --- | --- |
| 01 | [Read API DB-first](STEP-01-read-db-first.md) | done |
| 02 | [Import service](STEP-02-import-service.md) | done |
| 03 | [Admin sync API](STEP-03-admin-sync-api.md) | done |
| 04 | [Frontend sync state](STEP-04-frontend-sync-state.md) | done |
| 05 | [Tests and ops](STEP-05-tests-and-ops.md) | done |

Update this table during implementation. Each step file also has its own status field and must be updated before marking the step complete.

## Global Decisions

- Frontend catalog reads are DB-first.
- MangaDex official APIs are called only by import/sync services, scripts, or admin endpoints.
- Admin sync endpoints use `X-Admin-Token` checked against `ADMIN_SYNC_TOKEN`.
- Reader-facing chapter lists show only chapters with `pages > 0`.
- Existing frontend routes remain stable.
- Existing scripts remain available and should be refactored onto the shared import service.
- No destructive cleanup of old cached chapters in this milestone.

## Implementation Order

1. Make chapter reads DB-first so the current broken reader case is fixed early.
2. Extract shared MangaDex import logic so scripts and endpoints do not duplicate sync behavior.
3. Add protected admin endpoints for manual import/sync.
4. Update frontend empty/sync states so cache misses are not shown as filter failures.
5. Add tests, docs updates, and operational verification.

## Completion Rule

A step is only `done` when:

- The code or docs described by that step are implemented.
- The relevant tests/checks in that step pass.
- This index status and the step file status are updated.
- Any public API or behavior change is reflected in docs.
