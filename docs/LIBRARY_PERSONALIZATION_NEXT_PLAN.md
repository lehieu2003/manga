# Library Personalization Next Plan

Reader: internal engineer maintaining MangaDex Reader.

Post-read action: implement personal shelf features beyond following manga and progress.

## Summary

The library currently tracks followed manga, status, favorites, and reading progress. The next personalization layer separates chapter-level actions from manga follow state and gives users better memory of what they searched, saved, and read.

## User Goals

- Bookmark a chapter or exact page without changing manga follow status.
- Favorite individual chapters.
- Create custom lists for manga.
- Review search history and remove entries.
- See reading activity and streaks after activity semantics are stable.

## Key Changes

- Backend: add bookmarks, favorite chapters, custom lists, user-owned search history endpoints, and activity aggregation.
- Web: add bookmark actions in detail/reader, custom list management in library, search history UI, and activity timeline.
- Mobile: add bookmark and search history support after backend contracts stabilize; activity timeline can follow web behavior.

## Public Interfaces / Types

- Add `GET /api/bookmarks`, `POST /api/bookmarks`, `PATCH /api/bookmarks/:id`, and `DELETE /api/bookmarks/:id`.
- Add favorite chapter support either as bookmark metadata or a separate `favoriteChapter` resource.
- Add `GET /api/me/search-history` and `DELETE /api/me/search-history`.
- Add custom list routes for create, rename, delete, add manga, and remove manga.
- Add Prisma models for bookmarks and custom lists; reuse existing search history data.

## UX Behavior

- Reader exposes a bookmark action for current chapter and page.
- Manga detail shows bookmarked chapters and quick jump actions.
- Library keeps existing tabs and adds custom lists as a separate shelf concept.
- Search page can show recent searches for logged-in users and allow clearing them.
- Activity timeline starts with deterministic events: progress saved, bookmark created, list item added.

## Edge Cases

- Duplicate bookmark attempts update the existing bookmark instead of creating noisy duplicates.
- Bookmarks render even if cached manga metadata is incomplete.
- Deleting a custom list does not delete manga, progress, bookmarks, or comments.
- Clearing search history affects only the current user.
- Reading streak uses the user's local day boundary only after that rule is explicitly implemented.

## Test Plan

- Backend tests cover bookmark CRUD, duplicate handling, custom list ownership, search history self-service, and activity ordering.
- Frontend tests cover bookmark from reader, bookmark list rendering, custom list creation, search history clear, and empty states.
- Mobile tests cover bookmark rendering and search history once screens exist.

## Acceptance Criteria

- Users can bookmark a chapter/page independently from following manga.
- Search history is visible and user-clearable.
- Custom lists do not conflict with library status.
- Activity data is deterministic and testable.
- Existing library/progress behavior remains backward compatible.

## Assumptions

- Bookmark notes are optional.
- Favorite chapter can be represented as a bookmark flag unless implementation needs a separate model.
- Reading streak is later than activity timeline.
