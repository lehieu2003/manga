# MangaDex Reader

Fullstack manga reader built with Fastify, Prisma, PostgreSQL, Redis, React, Vite, and Tailwind CSS v4.

## Requirements

- Node.js 22+
- Docker Desktop, for PostgreSQL and Redis

## Local Setup

```bash
npm install
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
docker compose up -d postgres redis
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run dev
```

Backend: `http://localhost:4000`

Frontend: `http://localhost:5173`

PostgreSQL is exposed on host port `55432` to avoid conflicts with a local PostgreSQL service on `5432`.

## Useful Commands

```bash
npm run typecheck --workspaces
npm run test --workspaces
npm run build --workspaces
```

## Notes

- MangaDex metadata is requested through the backend and cached in Redis.
- MangaDex catalog data is also persisted in PostgreSQL via `CachedManga` and `CachedChapter`.
- Run `npm run sync:mangadex -w backend -- --limit=48 --chapters` to manually import manga and first chapter feeds.
- Narrow syncs are supported, for example `npm run sync:mangadex -w backend -- --query=chainsaw --languages=vi,en --limit=12 --chapters --chapters-limit=64`.
- Set `SYNC_ON_STARTUP=true` in `backend/.env` to run a non-blocking catalog sync when the backend starts.
- Reader image URLs are resolved through MangaDex AtHome metadata and proxied through the backend for local reliability.
- Default translated languages are Vietnamese and English.

## Documentation

- [Feature status](docs/FEATURE_STATUS.md): current implemented features, known limits, and not-yet-implemented roadmap items.
- [Reader and chapter navigation plan](docs/READER_CHAPTER_NAVIGATION_PLAN.md): MVP behavior, interfaces, and test scenarios for reader navigation.
- [Chapter list advanced plan](docs/CHAPTER_LIST_ADVANCED_PLAN.md): MVP behavior, filters, infinite scroll, and test scenarios for advanced chapter browsing.
- [Wibu manga cafe theme plan](docs/WIBU_MANGA_CAFE_THEME_PLAN.md): warm anime-native visual direction and acceptance checks.
- [Library personalization plan](docs/LIBRARY_PERSONALIZATION_PLAN.md): Home continue reading, recently read, and library search/sort MVP.
- [Manga discovery plan](docs/MANGA_DISCOVERY_PLAN.md): advanced search filters, sort modes, discovery routes, and cache fallback behavior.
- [Auth and account plan](docs/AUTH_ACCOUNT_PLAN.md): account settings, profile updates, password change, and backend logout behavior.
