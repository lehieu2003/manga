# STEP-03: Source Database With Real Manga Catalog

Status: Done

Completion date: 2026-06-05

## Objective

Create and seed a PostgreSQL source database that represents the operational source for the analytics pipeline.

Manga catalog data must be real data from MangaDex. Users and later behavior events can be synthetic.

## Plan

Create SQL tables for source dimensions:

- users
- manga
- chapters
- genres
- manga_genres

Create a catalog ingestion script that loads real MangaDex data:

- 300 to 800 real manga records from MangaDex
- real title, description, status, year, content rating, tags/genres, and cover URL where available
- real chapters for each manga, limited by config
- normalized genres from MangaDex tags

Create a user seed script that inserts realistic synthetic users:

- 1,000 to 5,000 users
- display name, country, device preference, and signup date fields if useful for producer behavior

The source database should be separate from the application database. It should not depend on the main Prisma schema or migrations.

Use MangaDex respectfully:

- configure request delay
- keep target counts bounded
- make ingestion rerunnable
- upsert by MangaDex IDs instead of duplicating rows

## Expected Outputs

- Source database tables initialized.
- Real MangaDex manga, chapters, and genres loaded into PostgreSQL.
- Synthetic users loaded into PostgreSQL.
- Seed/ingestion scripts can be rerun in a controlled way.
- Producer can query users, manga, chapters, and genres from PostgreSQL.

## Acceptance Criteria

- Source DB contains synthetic users plus real manga, chapters, genres, and manga-genre relationships.
- Manga and chapters have valid relationships.
- Manga have at least one genre.
- Catalog ingestion logs MangaDex request progress and row counts after completion.
- Re-running the ingestion/seed process does not create uncontrolled duplicates.
- The implementation can run without modifying the main application Prisma schema.

## Verification Evidence

- Added PostgreSQL source schema under the `source` namespace with tables for users, manga, chapters, genres, manga-genre relationships, and ingestion runs.
- Added source DB initialization script: `python data_engineer/producer/init_source_db.py`.
- Added MangaDex catalog loader and synthetic user seeder: `python data_engineer/producer/seed_source_db.py`.
- Installed Python dependencies from `data_engineer/requirements.txt`.
- Initialized schema successfully: `initialized source database schema from ...init_source_db.sql`.
- Ran a real MangaDex smoke load with `--manga-target 50 --chapters-per-manga 5 --users 200`.
- Seed result: users `200`, manga `50`, chapters `199`, genres `51`, manga_genres `475`.
- Reran with `--manga-target 10 --chapters-per-manga 2 --users 200`; counts stayed stable, confirming upsert/no uncontrolled duplicates.
- Sample real manga loaded from MangaDex included `Na Honjaman Level-Up`, `Sono Bisque Doll wa Koi o Suru`, `Kage no Jitsuryokusha ni Naritakute!`, `Tensei Shitara Slime datta Ken`, and `Sousou no Frieren`.
- Data quality checks passed: manga without genre `0`, orphan chapters `0`.
- Python syntax verification passed with `python -m compileall data_engineer/producer`.
