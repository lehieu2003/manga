# Image Traffic Scale Plan

Tài liệu này mô tả kế hoạch giảm tải image traffic cho MangaDex Reader khi số lượng user đọc manga tăng. Trọng tâm là cover/page images vì đây là phần tạo nhiều request và bandwidth nhất.

## Current State

Backend hiện expose media proxy endpoints:

- `GET /api/covers/:mangaId/:fileName`
- `GET /api/pages/:chapterId/:mode/:fileName`

PostgreSQL chỉ lưu metadata như manga, chapter, cover URL, library và progress. Image bytes không lưu trong PostgreSQL. Backend fetch image bytes từ MangaDex rồi trả về client.

## Target Architecture

```txt
User
  |
  v
Cloudflare CDN
  |
  |-- cache HIT -> return image from edge
  |
  |-- cache MISS
        |
        v
Backend Media Proxy
        |
        v
MangaDex image origin
```

Backend vẫn giữ local media URLs để frontend không phụ thuộc trực tiếp vào MangaDex image domains. Cloudflare đứng trước media endpoints để cache tại edge.

## Phase 1: Backend Media Proxy Hardening

Status: completed in backend.

Scope:

- Stream image responses instead of buffering entire image bytes in Node memory.
- Add upstream MangaDex timeout.
- Forward cache validators from client/CDN to MangaDex:
  - `If-None-Match`
  - `If-Modified-Since`
- Forward useful upstream response headers:
  - `ETag`
  - `Last-Modified`
  - `Content-Length`
  - `Content-Type`
- Support `304 Not Modified` passthrough.
- Use longer cache policy by media type:
  - Covers: `public, max-age=604800, stale-while-revalidate=86400`
  - Pages: `public, max-age=86400, stale-while-revalidate=3600`
- Apply route-level rate limits for media endpoints.

Expected effect:

- Lower memory pressure on backend.
- Better browser/CDN cache behavior.
- Safer behavior when MangaDex is slow or unavailable.
- Basic abuse protection for high-frequency image requests.

Implemented details:

- Cover and page proxy routes stream image responses instead of buffering full image bytes.
- Cover proxy timeout: 10 seconds.
- Page proxy timeout: 15 seconds.
- Cover route rate limit: 600 requests per minute per client.
- Page route rate limit: 300 requests per minute per client.
- Conditional request headers are forwarded to MangaDex.
- `ETag`, `Last-Modified`, `Content-Length`, and `Content-Type` are forwarded when MangaDex provides them.

## Phase 2: Cloudflare CDN Rules

Status: planned.

Cloudflare cache rules:

- `/api/covers/*`
  - Cache eligible: yes
  - Edge TTL: 7 days
  - Respect origin headers: yes
- `/api/pages/*`
  - Cache eligible: yes
  - Edge TTL: 1 day
  - Respect origin headers: yes

Do not cache dynamic/private API routes:

- `/api/auth/*`
- `/api/library/*`
- `/api/progress/*`

Cloudflare WAF/rate limiting should protect login/auth routes separately from image routes.

## Phase 3: Media Domain Split

Status: planned.

If image traffic starts affecting API latency, split media traffic onto a separate subdomain:

```txt
api.example.com
media.example.com
```

Benefits:

- Separate cache rules.
- Separate rate limits.
- Independent scaling and observability.
- Cleaner operational ownership for media traffic.

## Phase 4: Object Storage Cache

Status: planned.

If CDN cache misses remain too expensive, add object storage such as Cloudflare R2:

```txt
Cloudflare CDN -> Backend Media Proxy
                -> check R2
                -> fetch MangaDex on miss
                -> save R2
                -> return image
```

Rules:

- Do not store image bytes in PostgreSQL.
- Use stable cache keys:
  - `cover:{mangaId}:{fileName}`
  - `page:{chapterId}:{mode}:{fileName}`
- Prefer CDN cache before adding object storage complexity.

## Phase 5: Observability

Status: planned.

Track backend metrics:

- `media_requests_total`
- `media_upstream_errors_total`
- `media_upstream_timeout_total`
- `media_response_bytes_total`
- `media_upstream_duration_ms`

Track Cloudflare metrics:

- cache hit ratio
- bandwidth saved
- origin requests
- top requested paths
- 4xx/5xx by route

## Implementation Order

1. Backend streaming proxy, timeout, cache headers, conditional requests. Done.
2. Backend route-level media rate limits. Done.
3. Tests for media proxy behavior. Done.
4. Swagger/docs updates for media cache behavior. Done.
5. Cloudflare DNS and cache rules.
6. Monitor cache hit ratio and origin traffic.
7. Add media subdomain if API latency is affected.
8. Add R2/object storage cache only if CDN cache is not enough.
