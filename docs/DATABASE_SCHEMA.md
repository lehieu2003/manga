# Database Schema

This document explains the current PostgreSQL schema used by the manga reader backend. It is written for engineers who need to reason about auth, library state, reading progress, and MangaDex cache behavior before changing backend logic.

## Data Model Overview

The schema has two main areas:

- **User state**: accounts, refresh sessions, library items, reading progress, and search history.
- **Catalog cache**: MangaDex manga metadata and chapter metadata persisted locally so the app can keep working when MangaDex is slow, unavailable, or returns incomplete live data.

MangaDex remains the upstream source for catalog and reader data. PostgreSQL stores durable snapshots of manga and chapter metadata. Redis stores short-lived HTTP response cache entries.

## User

`User` is the root record for authenticated app state.

Important fields:

- `email`: unique login identifier.
- `passwordHash`: hashed password, never the raw password.
- `displayName`: user-facing name.
- `avatarUrl`: optional profile image URL.
- `emailVerifiedAt`: when the user confirmed the registration OTP.
- `createdAt` / `updatedAt`: lifecycle timestamps.

Relations:

- A user can have many refresh sessions.
- A user can have many password reset tokens.
- A user can have many email verification codes.
- A user can have many library items.
- A user can have many reading progress records.
- A user can have many search history records.

Deleting a user cascades through the related user-owned records.

## RefreshSession

`RefreshSession` stores long-lived authentication sessions.

Important fields:

- `tokenHash`: unique hash of the refresh token.
- `expiresAt`: when the session is no longer valid.
- `revokedAt`: set when the session is manually revoked or rotated.

The table is indexed by `userId` so session cleanup and account-level session queries can find records efficiently.

## PasswordResetToken

`PasswordResetToken` stores one-time password reset links.

Important fields:

- `tokenHash`: unique hash of the reset token. The raw token is only sent in the reset link.
- `expiresAt`: when the reset link is no longer valid.
- `usedAt`: set when a reset token has been consumed or invalidated.

Constraints and indexes:

- Reset tokens are linked to `User` and cascade when the user is deleted.
- Tokens are indexed by `userId` and `expiresAt` for account-level invalidation.
- Expiry is indexed so cleanup jobs can remove old rows later.

Requesting a new password reset marks older unused reset tokens for that user as used and sends the reset URL through the configured email sender. Completing a reset updates the password, marks the token used, and revokes active refresh sessions.

## EmailVerificationCode

`EmailVerificationCode` stores short-lived OTP codes for registration email verification.

Important fields:

- `codeHash`: hash of the six-digit OTP. The raw OTP is only sent by email.
- `expiresAt`: when the OTP is no longer valid.
- `usedAt`: set when an OTP has been consumed or invalidated.

Constraints and indexes:

- Codes are linked to `User` and cascade when the user is deleted.
- Codes are indexed by `userId` and `expiresAt` for resend and cleanup behavior.

Creating or resending a verification code marks older unused codes for that user as used. Verifying the latest valid code sets `User.emailVerifiedAt` and issues the first token pair.

## LibraryItem

`LibraryItem` stores a manga entry in a user's personal library.

Important fields:

- `mangaId`: MangaDex manga id.
- `status`: one of `READING`, `PLAN_TO_READ`, `COMPLETED`, `PAUSED`, or `DROPPED`.
- `isFavorite`: user favorite flag.
- `lastChapterId`: latest chapter the user interacted with for this manga.
- `lastReadAt`: timestamp used for recently-read and continue-reading behavior.

Constraints and indexes:

- A user can only have one library row per manga.
- Rows are indexed by `userId` and `updatedAt` for library lists sorted by recency.

`LibraryItem` does not require a direct relation to `CachedManga`. The manga id is kept as an upstream identifier so a user can track a manga even if the local catalog cache is refreshed later.

## ReadingProgress

`ReadingProgress` stores per-user progress for individual chapters.

Important fields:

- `mangaId`: MangaDex manga id.
- `chapterId`: MangaDex chapter id.
- `pageIndex`: zero-based page position.
- `completed`: whether the chapter was finished.
- `updatedAt`: used to find the latest progress for a manga.

Constraints and indexes:

- A user can only have one progress row per chapter.
- Rows are indexed by `userId`, `mangaId`, and `updatedAt` so the backend can find the latest progress for a manga.

Like library rows, progress stores MangaDex ids directly rather than requiring cached catalog rows to exist.

## SearchHistory

`SearchHistory` stores authenticated user search terms.

Important fields:

- `query`: the user-entered search string.
- `createdAt`: used to order recent searches.

Rows are indexed by `userId` and `createdAt`.

Anonymous searches are not persisted.

## CachedManga

`CachedManga` stores MangaDex manga metadata.

Important fields:

- `id`: MangaDex manga id. This is the primary key.
- `title`: normalized title selected from MangaDex localized title fields.
- `altTitles`: JSON array of alternate titles.
- `description`: normalized description.
- `status`: upstream publication status when available.
- `year`: upstream release year when available.
- `contentRating`: upstream content rating.
- `tags`: normalized tag names.
- `coverUrl`: proxied or upstream cover URL.
- `source`: defaults to `mangadex`.
- `fetchedAt`: when this metadata was last fetched from upstream.
- `updatedAt`: row update timestamp.

Constraints and indexes:

- `id` is the MangaDex id, so upserts replace stale metadata for the same manga.
- `title` is indexed for local fallback search.
- `fetchedAt` is indexed for cache recency ordering.

`CachedManga` is a durable cache, not a user-owned entity. It can be refreshed by search, detail fetches, sync scripts, or backfill scripts.

## CachedChapter

`CachedChapter` stores MangaDex chapter metadata for a cached manga.

Important fields:

- `id`: MangaDex chapter id. This is the primary key.
- `mangaId`: MangaDex manga id and relation to `CachedManga`.
- `title`: chapter title, often empty.
- `chapter`: chapter number as a string because MangaDex can use decimal or special values.
- `volume`: optional volume string.
- `translatedLanguage`: language code such as `vi` or `en`.
- `publishAt`: upstream publication timestamp.
- `pages`: number of readable pages reported by MangaDex.
- `scanlationGroup`: group name when MangaDex provides it.
- `fetchedAt`: when this chapter metadata was fetched.
- `updatedAt`: row update timestamp.

Constraints and indexes:

- `id` is the MangaDex chapter id, so upserts replace stale metadata for the same chapter.
- Rows are indexed by `mangaId` and `translatedLanguage` for chapter list queries.
- Rows are indexed by `mangaId` and `chapter` for chapter lookups and ordering.
- Rows are indexed by `publishAt` for recency queries.

The app should treat chapters with `pages > 0` as readable. Rows with `pages = 0` may represent empty MangaDex metadata, external-only chapters, unavailable chapters, or upstream responses that cannot be used by the reader.

## Catalog Cache Behavior

The backend has two catalog data sources:

- **Live MangaDex**: direct upstream requests made when users search, open manga details, list chapters, or open the reader.
- **PostgreSQL cache**: durable metadata saved from successful upstream requests or sync/backfill scripts.

Redis is a separate short-lived response cache. It can temporarily cache an empty API response even when PostgreSQL already has usable rows, so cache keys and fallback behavior matter.

For chapter lists, the important invariant is:

```text
Readable chapter = CachedChapter.pages > 0
```

If MangaDex returns an empty live chapter feed but PostgreSQL has readable cached chapters, the backend should prefer the cached chapter list for the user-facing response. This keeps the reader usable when upstream data is incomplete.

## Read/Sync Separation

The catalog workflow separates two responsibilities:

- **Read APIs** serve frontend requests from PostgreSQL cache and short-lived Redis response cache.
- **Import/sync operations** call MangaDex official APIs and upsert `CachedManga` / `CachedChapter`.

The step-by-step implementation record lives in `docs/catalog-data-workflow/README.md`.

Reader-facing chapter APIs should not call MangaDex live as part of normal page rendering. MangaDex live calls are limited to scripts, admin sync endpoints, or future background jobs.

## Common Operational Checks

Count manga that still have no readable cached chapters:

```sql
SELECT COUNT(*)
FROM (
  SELECT m.id
  FROM "CachedManga" m
  LEFT JOIN "CachedChapter" c ON c."mangaId" = m.id
  GROUP BY m.id
  HAVING COUNT(c.id) FILTER (WHERE c.pages > 0) = 0
) missing;
```

Check one manga's cached chapter state:

```sql
SELECT
  COUNT(*) AS all_chapters,
  COUNT(*) FILTER (WHERE pages > 0) AS readable_chapters,
  COUNT(*) FILTER (WHERE pages = 0) AS zero_page_chapters
FROM "CachedChapter"
WHERE "mangaId" = '<manga-id>';
```

List sample unreadable or empty cached manga:

```sql
SELECT
  m.id,
  m.title,
  COUNT(c.id) AS all_chapters,
  COUNT(c.id) FILTER (WHERE c.pages > 0) AS readable_chapters
FROM "CachedManga" m
LEFT JOIN "CachedChapter" c ON c."mangaId" = m.id
GROUP BY m.id, m.title
HAVING COUNT(c.id) FILTER (WHERE c.pages > 0) = 0
ORDER BY m.title ASC
LIMIT 20;
```

## Schema Change Guidelines

When changing this schema:

- Preserve MangaDex ids as stable external identifiers unless there is a strong reason to introduce internal ids.
- Keep user-owned records independent from the catalog cache where possible.
- Add indexes for new query patterns before relying on them in routes.
- Treat `CachedManga` and `CachedChapter` as refreshable cache rows, not immutable historical records.
- Keep reader-facing chapter queries focused on `pages > 0` unless the UI explicitly needs to show unavailable chapters.
