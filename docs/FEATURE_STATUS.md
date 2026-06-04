# MangaDex Reader Feature Status

Tài liệu này mô tả trạng thái hiện tại của MangaDex Reader để developer mới hoặc maintainer biết phần nào đã xong, phần nào mới ở mức MVP, và bước tiếp theo nên làm gì.

## Tổng Quan Sản Phẩm

MangaDex Reader là app đọc truyện fullstack dùng MangaDex làm nguồn metadata và chapter images. Backend đóng vai trò API/cache/proxy, frontend web là reader-first React app, và mobile Flutter app dùng cùng backend API.

Stack hiện tại:

- Backend: Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Redis.
- Frontend web: React, TypeScript, Vite, Tailwind CSS v4, TanStack Query.
- Mobile: Flutter, GoRouter, repository/service/data model layering.
- Nguồn truyện: MangaDex API và MangaDex AtHome.
- Ngôn ngữ chapter mặc định: Vietnamese và English.

## Tình Trạng Kiến Trúc

### Backend

Backend đã được refactor theo layered structure:

- Application layer có controllers, routes, middlewares và validators.
- Zod validation đã tách thành validator modules cho auth, catalog, media, library và progress.
- Auth và error handling đã tách thành middleware.
- Domain layer có services, repositories và event type definitions.
- Infrastructure layer có database, cache, MangaDex client, queue/storage/email placeholders.
- Shared layer có configs, constants, errors, helpers, types và utils.
- Tests đã gom về unit và integration route tests.

Lưu ý hiện tại:

- Một số route vẫn còn handler logic trực tiếp, chưa tách hết thành controller mỏng.
- Domain events mới là type definitions, chưa có event bus hoặc publisher.
- Queue/storage/email folders mới là structure placeholder, chưa có implementation thật.

### Frontend Web

Frontend đã được refactor theo feature-based structure:

- API layer đã tách endpoints và auth interceptor.
- Components đã tách layout, common, forms và UI primitives.
- Features đã tách auth, catalog, library và profile.
- Auth state nằm trong feature auth store.
- Toast state nằm trong global stores.
- Types, hooks, services và lib đã có entry points riêng.
- Tests đã gom về unit/integration/e2e structure, hiện automated tests nằm ở unit.

Lưu ý hiện tại:

- `components/ui` mới có Button primitive tối thiểu, chưa phải shadcn-style component set.
- Một số feature hooks folders còn là entry point trống.
- Auth form vẫn dùng simple controlled form, chưa dùng React Hook Form/Zod phía frontend.

### Mobile

Flutter mobile app đã có cấu trúc nền:

- Data repositories cho auth, catalog và library/progress.
- API client và token store.
- Domain models.
- App state restore session.
- GoRouter routes cho home, search, library, settings, auth, manga detail và reader.
- Theme và core widgets riêng.

Mobile hiện là MVP client của backend, chưa có cùng mức test coverage và polish như web.

## Tính Năng Đã Có

### Auth Và Session

- Đăng ký tài khoản bằng email, password và display name.
- Đăng nhập bằng email/password.
- JWT access token và refresh token rotation.
- Web tự refresh session khi API trả `401`.
- Mobile restore session bằng token store.
- Protected route cho Library và Settings.
- Logout gọi backend để revoke refresh token rồi clear local session.
- Settings có account screen cho update display name/avatar URL và change password.
- Change password verify current password, revoke refresh sessions cũ và issue token mới cho browser/client hiện tại.

### MangaDex Catalog

- Search manga theo title/keyword.
- Search trả về pagination với `limit`, `offset`, `total`.
- Search hỗ trợ sort: relevance, latest update, followed count, title, created newest và updated newest.
- Search hỗ trợ filter metadata theo included/excluded cached tags, content rating, status và publication year.
- Backend ưu tiên MangaDex live data và lưu manga vào PostgreSQL cache.
- Nếu MangaDex/network lỗi, backend fallback sang cached manga nếu có data.
- Response search có `source: "live"` hoặc `source: "cache"`.
- Manga detail có title, alt titles, description, status, year, content rating, tags và cover.
- Chapter feed có translated language, chapter number, volume, title, pages, publish date và scanlation group.
- Chapter feed hỗ trợ pagination theo `limit` và `offset`.

### Genre / Category / Discovery

- Backend có endpoint danh sách genre từ cached manga tags.
- Search hỗ trợ filter theo một hoặc nhiều genre đã cache.
- Genre filter hiện dùng cached tag name, chưa map live MangaDex tag ID.
- Home có Browse by genre.
- Search page có include/exclude tags, content rating, status, year và sort selector.
- Search page có active filters, clear-all và cached fallback banner.
- Route `/genres/:genre` dùng Search layout để browse theo thể loại.
- Route `/discover/popular` và `/discover/latest` dùng Search layout với preset sort.

### Theme Và Visual Direction

- Web UI dùng theme Wibu Manga Cafe ấm, tối, reader-first.
- Palette chính là nâu than, giấy ấm, amber accent và sakura accent nhỏ.
- Header, manga cards, chapter rows, reader toolbar, genre chips và filter labels đã dùng visual language manga shelf/cafe.
- Mobile có dark Manga Cafe theme.
- Theme chưa có theme switcher.

### Cover Và Page Image Proxy

- Cover URL từ MangaDex được normalize thành local backend URL.
- Chapter reader dùng local backend page URLs thay vì direct AtHome URL.
- Backend proxy ảnh chapter theo chapter id, mode và file name.
- Proxy ảnh giúp tránh CORS/CORP và domain blocking trong local/dev environments.
- Backend media proxy đã stream ảnh thay vì buffer toàn bộ bytes trong memory.
- Media proxy forward `ETag`, `Last-Modified`, `Content-Length`, `Content-Type` khi MangaDex cung cấp.
- Media proxy forward conditional request headers `If-None-Match` và `If-Modified-Since`, và passthrough `304 Not Modified`.
- Media routes có route-level rate limit: covers 600 req/phút/client, pages 300 req/phút/client.
- Kế hoạch scale image traffic bằng streaming proxy, Cloudflare CDN và optional object storage được ghi ở `docs/IMAGE_TRAFFIC_SCALE_PLAN.md`.

### Library

- User có thể follow manga vào library.
- Manga detail hiển thị trạng thái khác khi manga đã nằm trong library.
- Có toast feedback khi follow/remove manga trên web.
- Library page hiển thị cover, title, status, last read và continue link nếu có progress.
- Library có tabs Reading, Favorites, Completed, Paused.
- Có quick action favorite, đổi status, remove khỏi library.
- Library có search theo title, tag, manga status hoặc library status.
- Library có sort theo last read, recently updated, title A-Z, status và favorite first.
- Library có filter summary hiển thị shelf view, visible count, sort mode và search query.
- Mobile có repository/API support cho library.

### Reading Progress

- Reader tự lưu progress theo chapter, manga, page index và completed flag.
- Progress được lưu debounce khi đọc và khi rời trang.
- Mở reader sẽ resume page gần nhất nếu chapter trùng progress hiện tại.
- Manga detail có Continue Reading card nếu user đã login và có progress.
- Home có Continue Reading global cho user đã login.
- Home có Recently Read dựa trên library/progress hiện có.
- Continue Reading hiển thị manga title, chapter hiện tại, page hiện tại/tổng page và link đọc tiếp.
- Backend trả progress mới nhất theo manga, toàn bộ progress của manga, và cached chapter của progress mới nhất.

### Chapter UX

- Manga detail có stats cơ bản: tổng chapters, số language đã load, last updated.
- Chapter list có sort toggle Newest First / Oldest First.
- Chapter list có search chapter theo chapter number hoặc title.
- Chapter list có read/current/new legend và badges.
- Current chapter được highlight.
- Chapter đã completed hoặc nằm trước current chapter được xem là read trong MVP.
- Chapter mới nhất có badge NEW.
- Language badge dùng dạng `[EN]`, `[VI]`.
- Chapter list load mỗi lần 100 chapter và có infinite scroll kèm fallback Load more.
- Search chapter tự fetch thêm batch khi chưa thấy kết quả trong chapters đã load.
- Có filter language bằng checkbox cho Vietnamese và English.
- Có filter scanlation group bằng checkbox dựa trên các group đã load.
- Có Clear filters để reset search, language và scanlation filters.

### Reader

- Reader hỗ trợ vertical/webtoon mode và paged mode.
- Có keyboard navigation bằng Arrow Left / Arrow Right trong paged mode.
- Có image fit toggle giữa width và contain.
- Có next chapter / previous chapter controls khi URL có `mangaId`.
- Có chapter selector trực tiếp trong reader, kèm trạng thái read/current/new.
- Reader tự preload 1-2 ảnh kế tiếp trong paged mode.
- Reader prefetch metadata chapter kế tiếp khi xác định được next chapter.
- Vertical mode dùng viewport observation để lưu page đang thật sự được đọc.
- Có retry UI khi reader endpoint lỗi.
- Reader hiển thị page counter.
- Reader hiện luôn dùng data-saver page URLs từ MangaDex AtHome metadata.

### Data Sync Và Local Dev

- Có script sync MangaDex catalog theo limit.
- Có option sync kèm chapters.
- Có option sync theo query, languages và chapters limit.
- Có seed demo catalog làm fallback cho local dev.
- Docker Compose cung cấp PostgreSQL và Redis.
- PostgreSQL local expose trên host port `55432`.
- Backend có optional startup sync bằng env.

### Backend/Ops

- Có production Docker Compose cho PostgreSQL, Redis, backend và frontend.
- Backend production container chạy Prisma migration trước khi start server.
- Frontend production container serve static build qua nginx và proxy `/api` về backend.
- Có liveness `/health` và readiness `/health/ready` kiểm tra PostgreSQL/Redis.
- Có OpenAPI JSON ở `/docs/json` và Swagger UI ở `/docs`.
- Có GitHub Actions CI chạy Prisma generate, typecheck, tests và build cho workspaces.

### Tests Và Verification

- Backend tests hiện có cho auth password hashing, cache key, reader URL mapping, genre count, health readiness, auth account routes và progress manga endpoint.
- Frontend tests hiện có cho auth form/state, library page, genre chips, chapter list, home personalization, manga detail continue, reader page, search page và settings page.
- Automated web tests hiện nằm trong unit test folder.
- Mobile hiện chỉ có Flutter scaffold/widget test mặc định, chưa có coverage tương đương web.

## Giới Hạn Hiện Tại

- Genre filter dùng cached tags trong PostgreSQL, chưa gọi MangaDex tag registry để map tag name sang tag ID live.
- Search theo cached tag/genre luôn trả từ cache, không gọi live MangaDex tag registry.
- Included/excluded tag filter hiện dựa trên tag name đã cache; chưa có UI tag ID registry đầy đủ từ MangaDex.
- Search input placeholder có nhắc author/keyword, nhưng backend chưa implement author/artist relationship search.
- Search chapter toàn feed đang dùng auto-fetch client-side, chưa có query server-side riêng.
- Scanlation filter chỉ đầy đủ theo các chapter đã load; option list mở rộng dần khi infinite scroll load thêm.
- Reading stats dựa trên chapters đã load và total từ feed; chưa có dashboard analytics.
- Reader chapter navigation cần `mangaId` trên URL; nếu thiếu `mangaId`, reader vẫn đọc được chapter hiện tại nhưng disable previous/next và selector.
- Reader quality state chỉ có `data-saver`; chưa có toggle original/data-saver thật.
- Search history được ghi khi search có token, nhưng chưa có UI hiển thị lịch sử search.
- Backend architecture có repositories/validators/middlewares, nhưng controllers mới chỉ tách rõ cho health.
- Domain events chưa được phát ra runtime.
- Queue/storage/email infrastructure chưa có implementation thật.
- Swagger/OpenAPI schemas hiện được khai báo riêng với Zod runtime validators, nên cần giữ hai bên đồng bộ khi đổi request/response contract.
- Image traffic đã xong Phase 1 backend hardening; Cloudflare cache rules, media subdomain và object storage cache chưa triển khai production.
- Không có admin dashboard, cache dashboard hoặc manual cache invalidation UI.
- Mobile app chưa được liệt kê trong CI verification như web/backend.

## Tính Năng Chưa Implement

### Reader Và Chapter Navigation

- Reader quality toggle giữa data saver và original.
- Reader gestures cho mobile/web như tap left/right hoặc swipe.
- Keyboard shortcut đầy đủ và tooltip hướng dẫn.
- Better reader settings persistence theo user/device.

### Chapter List Nâng Cao

- Collapse/expand latest chapters cho manga có quá nhiều chapter.
- Group chapter theo volume.
- Deduplicate chapter theo language/scanlation preference.
- Better latest badge theo từng language hoặc publish window.

### Library Và Personalization

- Bookmark chapter riêng biệt với follow manga.
- Favorite chapter.
- Custom reading statuses chi tiết hơn.
- Reading streak hoặc reading activity timeline.
- Search history UI.

### Manga Discovery

- Author/artist display và search.
- MangaDex tag registry để filter live bằng tag ID thay vì cached tag name.
- Demographic/original-language filters trong UI.
- Better empty states cho DB cache chưa seed hoặc cache-only browse quá ít dữ liệu.

### Auth Và Account

- Forgot password / reset password.
- Email verification.
- OAuth login.
- Multi-device session management UI.
- Avatar upload/storage.

### Backend/Ops

- Cloudflare CDN cache rules cho `/api/covers/*` và `/api/pages/*`.
- Media subdomain nếu image traffic bắt đầu ảnh hưởng API latency.
- Object storage cache như Cloudflare R2 nếu CDN cache miss vẫn quá tốn origin traffic.
- Better outbound MangaDex queue/rate-limit policy.
- Background job scheduler cho periodic sync.
- Cache invalidation hoặc refresh endpoint cho admin/dev.
- Observability dashboard, request metrics, tracing.
- Runtime domain event publisher/subscriber.

### Mobile

- Mobile test coverage cho auth, search, library, detail và reader flows.
- Mobile reader gestures và persisted reader settings.
- Mobile-specific offline/cache behavior.
- Mobile CI job.

### Content Và Moderation

- User comments.
- Ratings/reviews.
- Custom manga lists.
- Admin tools.
- Report broken chapter/image.
- Content preference controls beyond current safe/suggestive API query.

## API Surface Hiện Có

Health:

- `GET /health`
- `GET /health/ready`

Public/catalog:

- `GET /api/manga/search`
- `GET /api/genres`
- `GET /api/manga/:id`
- `GET /api/manga/:id/chapters`
- `GET /api/chapters/:id/reader`
- `GET /api/covers/:mangaId/:fileName`
- `GET /api/pages/:chapterId/:mode/:fileName`

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `PATCH /api/me`
- `PUT /api/me/password`

Library/progress:

- `GET /api/library`
- `GET /api/library/:mangaId`
- `POST /api/library/:mangaId`
- `DELETE /api/library/:mangaId`
- `GET /api/progress/manga/:mangaId`
- `GET /api/progress/:chapterId`
- `PUT /api/progress/:chapterId`

## Web Routes Hiện Có

- `/`: home, popular/latest/search starters, continue reading, recently read và browse by genre.
- `/search`: search manga và filter discovery.
- `/discover/popular`: popular discovery preset.
- `/discover/latest`: latest discovery preset.
- `/genres/:genre`: browse manga theo genre.
- `/manga/:mangaId`: detail, follow, continue reading, chapters.
- `/read/:chapterId`: reader.
- `/library`: personal library, protected.
- `/login`: login.
- `/register`: register.
- `/settings`: protected account settings.

## Mobile Routes Hiện Có

- `/`: home.
- `/search`: search.
- `/library`: protected library.
- `/settings`: protected settings.
- `/login`: login.
- `/register`: register.
- `/manga/:mangaId`: manga detail.
- `/read/:chapterId`: reader with optional `mangaId` query.

## Ưu Tiên Tiếp Theo Đề Xuất

1. Hoàn thiện MangaDex tag registry để live tag filtering dùng tag ID thay vì cached tag name.
2. Thêm reader quality toggle original/data-saver và mobile/web gestures.
3. Tách tiếp route handlers backend thành thin controllers cho auth, catalog, library và progress.
4. Implement background sync scheduler/queue và MangaDex outbound rate-limit policy.
5. Bổ sung OpenAPI response examples và contract coverage cho docs.
6. Bổ sung mobile CI và mobile flow tests.
