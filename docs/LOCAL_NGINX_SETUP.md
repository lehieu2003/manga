# Local Nginx Setup

Reader: an internal engineer who wants to run the app locally through the same-origin Nginx path used by the production-style Docker stack.

Post-read action: start the local Nginx stack, verify that frontend, API, health checks, Swagger, uploads, notifications, and realtime traffic route correctly, and understand what each Nginx rule is doing.

## What This Setup Provides

The normal development workflow still uses the Vite dev server on `http://localhost:5173`. The local Nginx workflow is separate. It builds the frontend into static files, serves them from Nginx, and proxies backend traffic through the same browser origin at `http://localhost:8080`.

This is useful because production frontend code is built with `VITE_API_URL=/api`. That means browser requests should stay same-origin:

- frontend page: `http://localhost:8080`
- API calls: `http://localhost:8080/api/...`
- Socket.IO: `http://localhost:8080/socket.io/...`
- Swagger docs: `http://localhost:8080/docs`
- health checks: `http://localhost:8080/health` and `http://localhost:8080/health/ready`

The setup intentionally does not include TLS, Certbot, Cloudflare, a public domain, or VPS host-level Nginx. It is a local production-like smoke-test path.

## Quick Start

Create a local env file from the example:

```bash
copy .env.nginx.local.example .env.nginx.local
```

Start the local Nginx stack:

```bash
docker compose --env-file .env.nginx.local -f docker-compose.prod.yml up --build
```

Open the app:

```text
http://localhost:8080
```

If you already have the regular development Compose stack running under the default project name, run the Nginx stack with a separate project name to avoid replacing those containers:

```bash
docker compose -p manga-nginx-local --env-file .env.nginx.local -f docker-compose.prod.yml up --build -d
```

Stop the isolated stack:

```bash
docker compose -p manga-nginx-local --env-file .env.nginx.local -f docker-compose.prod.yml down
```

## Smoke Tests

Run these checks after the stack starts:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/health/ready
curl "http://localhost:8080/api/manga/search?q=one"
curl http://localhost:8080/docs/json
curl "http://localhost:8080/socket.io/?EIO=4&transport=polling"
```

Expected results:

- `/health` returns `200` with `{"ok":true}`.
- `/health/ready` returns `200` and reports PostgreSQL and Redis as `ok`.
- `/api/manga/search?q=one` returns a JSON catalog response.
- `/docs/json` returns the OpenAPI JSON document.
- `/socket.io/?EIO=4&transport=polling` returns a Socket.IO handshake payload containing a `sid`.

Also open a deep frontend route directly, then refresh the page. It should return the React app instead of a 404. Example:

```text
http://localhost:8080/library/deep-link-check
```

## How Requests Flow

The browser talks only to Nginx on port `8080`. Nginx listens on port `80` inside the frontend container, and Docker publishes that container port to `8080` on the host.

Inside the Docker network, Nginx can reach the backend service by name:

```text
browser -> localhost:8080 -> frontend Nginx -> backend:4000
```

The frontend build receives `VITE_API_URL=/api`, so application code makes relative API requests. This avoids CORS problems and matches the same-origin shape used in production-style deployments.

Backend CORS is still configured with `CORS_ORIGIN=http://localhost:8080` in the local Nginx env file. This keeps backend behavior explicit and prevents the local Nginx path from accidentally depending on permissive CORS settings.

## Nginx Route Behavior

### Static frontend

Nginx serves the compiled React app from its static web root. Normal asset files are served directly. Unknown routes fall back to `index.html`, which lets React Router handle client-side routes.

The `/assets/` route adds long-lived immutable caching for hashed Vite assets. Vite emits filenames with content hashes, so when a bundle changes, the filename changes too.

If the browser still references an old hashed JavaScript file after a rebuild, hard refresh the page. The current `index.html` will point at the new asset name.

### API traffic

All `/api/...` requests are proxied to the backend service. Nginx forwards standard reverse-proxy headers:

- original host
- client IP
- forwarded IP chain
- original protocol

Those headers let the backend know how the request entered the system without exposing the backend port to the host in the production-style stack.

### Notification stream

The notification stream endpoint uses Server-Sent Events. Nginx disables response buffering and cache for that route, and uses a longer read timeout.

Without this, Nginx may buffer the stream and delay events, which makes notifications look broken even when the backend is emitting them correctly.

### Socket.IO realtime traffic

Socket.IO uses `/socket.io/` by default. The route supports both polling and WebSocket upgrade traffic.

The important headers are:

- `Upgrade`
- `Connection`

These allow WebSocket connections to upgrade correctly after the initial handshake. The polling smoke test confirms the route reaches the backend; browser social chat and call flows exercise the upgrade path.

### Uploads

Backend-hosted uploaded files are served under `/uploads/...`. Nginx proxies those paths to the backend so avatar and other uploaded asset URLs remain same-origin.

The Nginx upload limit is set to `5m`. This is intentionally larger than the backend avatar limit so Nginx does not reject valid app uploads before Fastify receives them.

### Swagger and OpenAPI docs

Swagger UI and OpenAPI JSON are proxied through `/docs`, `/docs/`, and `/docs/json`.

This lets you inspect the backend contract from the same public entrypoint as the app:

```text
http://localhost:8080/docs
```

### Health checks

The local Nginx stack exposes both backend health endpoints:

- `/health` for lightweight liveness
- `/health/ready` for dependency readiness

Readiness checks PostgreSQL and Redis. The frontend service waits for a healthy backend before starting, so an unhealthy readiness response usually means the backend cannot reach one of its dependencies.

## Environment Variables

The local Nginx env file sets local-safe defaults:

- `FRONTEND_PORT=8080` publishes Nginx on host port `8080`.
- `FRONTEND_URL=http://localhost:8080` gives backend-generated frontend links the correct origin.
- `CORS_ORIGIN=http://localhost:8080` allows browser requests from the Nginx origin.
- `JWT_SECRET` and `ADMIN_SYNC_TOKEN` are local-only development secrets.
- `PUBLIC_MEDIA_BASE_URL` and `PUBLIC_UPLOAD_BASE_URL` stay empty so media and uploads use same-origin relative URLs.

Do not use the local example values for a public server. Production secrets and origins must be configured separately.

## Common Issues

### Browser shows `Failed to construct 'URL': Invalid URL`

This happens when frontend code treats `/api` as an absolute URL. Same-origin production builds use a relative API path, so URL parsing must resolve it against the browser origin.

Expected behavior:

```text
VITE_API_URL=/api
API origin=http://localhost:8080
```

If you still see the error after rebuilding, hard refresh the browser. If the console references an old hashed JS file, the browser is using a stale bundle.

### Port 8080 is already in use

Change `FRONTEND_PORT` in the local env file, then restart the stack.

Example:

```text
FRONTEND_PORT=8081
FRONTEND_URL=http://localhost:8081
CORS_ORIGIN=http://localhost:8081
```

Keep all three values aligned.

### Regular dev containers are already running

Use a separate Compose project name for the local Nginx stack:

```bash
docker compose -p manga-nginx-local --env-file .env.nginx.local -f docker-compose.prod.yml up --build -d
```

This prevents the production-style stack from replacing containers created by the regular development Compose file.

### API works but browser requests fail

Check that the frontend bundle was built with `VITE_API_URL=/api`, and check that backend CORS allows the exact browser origin you opened.

For the default local Nginx setup, the origin should be:

```text
http://localhost:8080
```

### Socket.IO polling works but realtime UI still fails

The polling smoke test proves routing reaches Socket.IO. If the UI still fails, check authentication first. The social socket sends the current access token during the Socket.IO handshake, and the backend rejects unauthenticated sockets.

## When To Use This Setup

Use local Nginx when you need to validate production-like behavior:

- same-origin API routing
- static production frontend build
- SPA route refresh behavior
- backend health routing
- Swagger through the public entrypoint
- Socket.IO through a reverse proxy
- uploaded assets through the public entrypoint
- notification streaming through a reverse proxy

Use normal local development when you need fast frontend iteration with Vite hot reload.
