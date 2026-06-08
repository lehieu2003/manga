# Step 05: Tests And Ops

Status: done

Completed verification:

- `npm --workspace backend run typecheck`
- `npm --workspace backend test`
- `npm --workspace frontend run typecheck`
- `npm --workspace frontend test -- manga-detail-continue chapter-list reader-page search-page`
- `npm --workspace frontend run build`
- Manual chapter read check for manga `32d76d19-8a05-4db0-9fc2-e0b0648fe9d0` returned `total: 481`, `source: "db"`, and `needsSync: false`.

## Goal

Lock the new read/sync separation with tests, docs, and repeatable operational commands.

## Backend Verification

Run:

```bash
npm --workspace backend run typecheck
npm --workspace backend test
```

Required scenarios:

- DB-first chapter reads return readable cached chapters.
- Zero-page chapters are hidden from reader-facing lists.
- Cache misses return `202 needsSync`.
- Read routes do not call MangaDex.
- Import service calls MangaDex and writes cache rows.
- Admin sync endpoints enforce `X-Admin-Token`.

## Frontend Verification

Run:

```bash
npm --workspace frontend test -- manga-detail-continue chapter-list reader-page
npm --workspace frontend run typecheck
npm --workspace frontend run build
```

Required scenarios:

- Manga detail shows cached chapters for DB-backed responses.
- Manga detail shows a sync-needed state for `202`.
- Existing filter empty state still works.

## Manual Checks

Known readable cached manga:

```bash
curl "http://localhost:4000/api/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?translatedLanguage=vi,en&limit=100&offset=0"
```

Expected:

- Response is not `total: 0` when DB has readable chapters.
- Frontend detail page shows chapter rows.

Admin import example:

```bash
curl -X POST "http://localhost:4000/api/admin/catalog/manga/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters/import" \
  -H "X-Admin-Token: $ADMIN_SYNC_TOKEN"
```

## Docs To Update

- Catalog workflow index status table.
- Individual step status.
- Feature status API surface.
- Database schema cache behavior notes.
- README documentation index.
