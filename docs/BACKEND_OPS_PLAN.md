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
