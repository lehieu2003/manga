# STEP-03: Synthetic Source Database

Status: Not Started

Completion date: N/A

## Objective

Create and seed a synthetic PostgreSQL source database that represents the operational source for the analytics pipeline.

## Plan

Create SQL tables for synthetic dimensions:

- users
- manga
- chapters
- genres
- manga_genres

Create a seed script that inserts realistic synthetic data:

- 1,000 to 5,000 users
- 300 to 800 manga
- 2,000 to 10,000 chapters
- multiple genres per manga
- realistic created dates and metadata

The source database should be separate from the application database. It should not depend on the main Prisma schema or migrations.

## Expected Outputs

- Source database tables initialized.
- Seed script can be rerun in a controlled way.
- Producer can query dimensions from PostgreSQL.

## Acceptance Criteria

- Source DB contains users, manga, chapters, genres, and manga-genre relationships.
- Manga and chapters have valid relationships.
- Manga have at least one genre.
- Seed script logs row counts after completion.
- Re-running the seed process does not create uncontrolled duplicates.

## Verification Evidence

Record evidence here after implementation.

