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
- Set `SYNC_ON_STARTUP=true` in `backend/.env` to run a non-blocking catalog sync when the backend starts.
- Reader image URLs are resolved through MangaDex AtHome metadata and loaded directly by the browser.
- Default translated languages are Vietnamese and English.
