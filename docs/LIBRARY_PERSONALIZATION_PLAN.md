# Library and Personalization MVP Plan

Reader: internal engineer maintaining the MangaDex Reader app.

Post-read action: implement or review the MVP library personalization slice without needing the original conversation.

## Summary

The MVP makes Home and Library feel personal using existing data: library items, latest reading progress, last-read timestamps, status, favorite state, and cached manga metadata. It does not add migrations, backend endpoints, auth changes, or new activity tables.

## Home Personalization

- Home loads the authenticated user's library when a user is logged in.
- Continue Reading highlights the most recently active item with progress or a last-read timestamp.
- Recently Read lists the latest active library items in activity order.
- Logged-out users keep the existing explore/login flow.
- Logged-in users with an empty shelf see a lightweight prompt to search and follow manga.

## Library Browsing

- Existing tabs remain: Reading, Favorites, Completed, and Paused.
- Library search matches manga title, manga tags, manga status, and library status.
- Sort modes are Last read, Recently updated, Title A-Z, Status, and Favorite first.
- Filter summary chips show the active shelf view, visible count, sort mode, and search query.
- Library cards keep quick actions and make status, favorite state, last-read date, and continue link easier to scan.
- Missing cached manga metadata falls back to the manga id and never blocks rendering.

## Interfaces

- No backend API changes.
- No Prisma schema changes.
- No frontend route changes.
- Frontend derives continue/recent lists and library search/sort locally.
- Activity date fallback is reading progress updated time, then last read, then library updated, then created time.

## Test Scenarios

- Home shows Continue Reading for a logged-in user with progress.
- Home shows Recently Read in newest activity order.
- Home shows a logged-in empty state when there is no library/progress.
- Library search filters by title, tag, and status.
- Library sort changes item order by title and favorite first.
- Library tabs keep filtering Reading, Favorites, Completed, and Paused.
- Continue links point to `/read/:chapterId?mangaId=:mangaId`.
- Library rows without cached manga metadata do not crash.

## Defaults

- No migration in this MVP.
- Bookmark chapter, favorite chapter, custom detailed statuses, reading streak, and activity history remain later work.
- Home personalization only appears for logged-in users.
- UI follows the existing Wibu Manga Cafe theme.
