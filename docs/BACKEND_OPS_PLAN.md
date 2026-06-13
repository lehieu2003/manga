# Backend/Ops Deploy MVP Plan

Reader: internal engineer maintaining and deploying the MangaDex Reader app.

Post-read action: deploy or review the VPS Docker Compose MVP without needing the original conversation.

## Summary

The Deploy MVP makes the app ready for a small VPS deployment with Docker Compose. It adds production containers, CI verification, dependency readiness checks, and a compact runbook. It does not add an ops dashboard, OpenAPI, tracing, cache admin endpoints, or a background sync scheduler.

## Production Runtime

- Local development keeps using the default Compose file.
- Production uses the production Compose file with PostgreSQL, Redis, backend, and frontend services.
- Backend starts by running Prisma migrations, then launches the compiled server.
- Frontend is served by nginx and proxies `/api` plus health endpoints to the backend service.
- Production frontend uses same-origin `/api` instead of a localhost API URL.

## Health Checks

- `/health` is a lightweight liveness check.
- `/health/ready` verifies PostgreSQL and Redis.
- Readiness returns HTTP `200` only when both dependencies are available.
- Readiness returns HTTP `503` with per-dependency status when PostgreSQL or Redis fails.
- The production backend container healthcheck uses `/health/ready`.

## CI

- GitHub Actions runs on pull requests and pushes to `main`.
- CI uses Node 24, installs dependencies, generates Prisma client, then runs workspace typecheck, tests, and build.
- CI does not start PostgreSQL or Redis because current tests do not require real services.
- Image publishing and deployment automation are later work.

## VPS Runbook

1. Copy the production env example to `.env`, then set `JWT_SECRET`, `POSTGRES_PASSWORD`, `CORS_ORIGIN`, and optional sync settings.
2. Build images:

```bash
docker compose -f docker-compose.prod.yml build
```

3. Start or update the stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

4. Check health:

```bash
curl http://localhost/health
curl http://localhost/health/ready
```

5. Inspect logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

6. Roll back by checking out the previous commit and rerunning build/up.

## Later Work

- OpenAPI or structured API docs.
- Request metrics, tracing, and observability dashboard.
- Background scheduler and MangaDex sync queue.
- Admin cache invalidation or refresh endpoints.
- Image registry publish and automated deployment.

## RAG Ops MVP

Goal: make the RAG chatbot operable from backend APIs before adding an admin UI or background job system.

Scope for this step:

- Add token-protected admin endpoints under `/api/admin/rag/*`.
- Reuse the existing `x-admin-token` guard used by other admin APIs.
- Keep re-indexing synchronous in the request for MVP simplicity.
- Do not add a new database table or migration yet.
- Log re-index requests with input, summary, duration, and failure count.

Endpoints:

- `GET /api/admin/rag/status`
  - Returns RAG coverage and chatbot usage counts.
  - Includes cached manga count, manga document count, chapter document count, total document count, active chat conversation count, and message count.
- `GET /api/admin/rag/documents`
  - Lists indexed RAG documents for inspection.
  - Supports `page`, `limit`, `sourceType`, and `q`.
  - Returns compact rows, not embeddings or full vector data.
- `POST /api/admin/rag/reindex`
  - Runs the existing catalog RAG indexer.
  - Accepts `{ "limit": number, "chapters": boolean }`.
  - Returns created, updated, skipped, failed, and duration.

Known trade-off:

- A full re-index can take a long time because it calls the embedding API for changed documents. This MVP is suitable for manual admin operations. The next production step should move re-indexing to a background job with persisted job history.

## Admin RBAC

Admin operations should be owned by a real account, not only a shared secret.

Current approach:

- Users have a `role`: `USER` or `ADMIN`.
- Normal registration creates `USER` accounts.
- Admin APIs accept a logged-in JWT only when the user role is `ADMIN`.
- The legacy `x-admin-token` path still works as a temporary fallback during migration.
- The frontend Admin console opens directly for logged-in `ADMIN` users.

Create or promote an admin account:

```bash
npm run admin:create -w backend -- --email=admin@example.com --password=change-me --displayName=Admin
```

If the email already exists, the script promotes that account to `ADMIN` and does not change its password.

Migration path:

1. Run Prisma migration and generate the client.
2. Create or promote the first admin user.
3. Login with that account in the frontend.
4. Confirm `/admin` appears in navigation and admin API calls succeed.
5. Remove `ADMIN_SYNC_TOKEN` later after the JWT admin path is verified in production.
