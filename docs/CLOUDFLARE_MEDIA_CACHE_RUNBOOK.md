# Cloudflare Media Cache Runbook

This runbook covers Phase 2 of the image traffic scale plan: placing Cloudflare in front of backend media proxy endpoints and caching cover/page images at the edge.

## Scope

Cache only public media routes:

- `/api/covers/*`
- `/api/pages/*`

Do not cache private or dynamic API routes:

- `/api/auth/*`
- `/api/library/*`
- `/api/progress/*`
- `/api/me`
- `/docs/*`
- `/health*`

## Prerequisites

- The production domain is managed by Cloudflare DNS.
- The backend is reachable through a proxied Cloudflare hostname.
- The backend media proxy has Phase 1 headers enabled:
  - streaming image responses
  - `Cache-Control`
  - `ETag` / `Last-Modified` passthrough
  - `304 Not Modified` passthrough

## DNS Setup

For a single API domain:

```txt
api.example.com -> backend origin
Proxy status: Proxied
```

For a future split media domain:

```txt
api.example.com   -> backend API origin
media.example.com -> backend media origin
Proxy status: Proxied
```

Start with the single API domain unless image traffic begins affecting normal API latency.

## Cache Rules

Create these Cloudflare Cache Rules in order.

### Rule 1: Cache Covers

Expression:

```txt
(http.host eq "api.example.com" and starts_with(http.request.uri.path, "/api/covers/"))
```

Settings:

- Eligible for cache: yes
- Edge TTL: 7 days
- Browser TTL: respect origin
- Cache key: default
- Origin Cache-Control: respect origin headers

Expected origin header:

```http
Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

### Rule 2: Cache Chapter Pages

Expression:

```txt
(http.host eq "api.example.com" and starts_with(http.request.uri.path, "/api/pages/"))
```

Settings:

- Eligible for cache: yes
- Edge TTL: 1 day
- Browser TTL: respect origin
- Cache key: default
- Origin Cache-Control: respect origin headers

Expected origin header:

```http
Cache-Control: public, max-age=86400, stale-while-revalidate=3600
```

### Rule 3: Bypass Private API

Expression:

```txt
(http.host eq "api.example.com" and (
  starts_with(http.request.uri.path, "/api/auth/") or
  starts_with(http.request.uri.path, "/api/library") or
  starts_with(http.request.uri.path, "/api/progress/") or
  http.request.uri.path eq "/api/me"
))
```

Settings:

- Eligible for cache: no
- Cache status: bypass

This protects user-specific responses from being cached at the edge.

## Edge Rate Limiting

Use Cloudflare rate limiting as a first line of defense. Backend route-level limits still stay enabled for defense in depth.

Suggested starting limits:

- `/api/pages/*`: 600 requests per minute per IP
- `/api/covers/*`: 1200 requests per minute per IP
- `/api/auth/login`: 10 requests per minute per IP
- `/api/auth/register`: 5 requests per minute per IP

Tune these after observing real traffic and false positives.

## Verification

After deploying the backend and Cloudflare rules, verify with `curl`.

First request should usually be a miss:

```bash
curl -I https://api.example.com/api/covers/<mangaId>/<fileName>
```

Expected headers:

```http
HTTP/2 200
Cache-Control: public, max-age=604800, stale-while-revalidate=86400
CF-Cache-Status: MISS
Content-Type: image/*
```

Repeat the same request:

```bash
curl -I https://api.example.com/api/covers/<mangaId>/<fileName>
```

Expected:

```http
CF-Cache-Status: HIT
```

Validate dynamic/private API is not cached:

```bash
curl -I https://api.example.com/api/library
```

Expected:

```http
CF-Cache-Status: BYPASS
```

## Operational Metrics

Watch these Cloudflare metrics:

- Cache hit ratio for `/api/covers/*` and `/api/pages/*`
- Origin requests by path
- Bandwidth saved
- Top requested media paths
- 4xx/5xx by route
- Rate limit events

Healthy initial targets:

- Covers cache hit ratio: 70% or higher after warmup
- Pages cache hit ratio: 50% or higher after popular chapters warm up
- Private API cache hit ratio: 0%

## Rollback

If Cloudflare cache causes incorrect behavior:

1. Disable the cover/page cache rules.
2. Purge cache for affected paths.
3. Confirm backend still serves images directly.
4. Re-enable one rule at a time after fixing the condition.

Do not disable backend media streaming/rate limits during rollback; those are still useful without CDN caching.

## Next Phase Trigger

Move to Phase 3, media domain split, if any of these happen:

- Media traffic causes API latency spikes.
- Cloudflare cache rules become hard to reason about on the shared API hostname.
- Media bandwidth dominates backend origin egress.
- Rate limiting needs to differ significantly between API and media traffic.
