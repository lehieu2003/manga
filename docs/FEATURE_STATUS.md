# MangaDex Reader Feature Status

Tài liệu này mô tả trạng thái hiện tại của web MangaDex Reader: tính năng đã có, giới hạn hiện tại, và các tính năng chưa được implement. Người đọc mục tiêu là developer mới vào dự án hoặc chính maintainer cần biết bước tiếp theo nên làm gì.

## Tổng Quan Sản Phẩm

MangaDex Reader là web đọc truyện fullstack dùng MangaDex làm nguồn metadata và chapter. Backend đóng vai trò proxy/cache cho MangaDex API, lưu catalog vào PostgreSQL, cache response bằng Redis, và quản lý tài khoản, library, tiến độ đọc. Frontend là reader-first app với home, search, genre browsing, manga detail, reader, library và auth.

Stack hiện tại:

- Backend: Node.js, TypeScript, Fastify, Prisma, PostgreSQL, Redis.
- Frontend: React, TypeScript, Vite, Tailwind CSS v4, TanStack Query.
- Nguồn truyện: MangaDex API và MangaDex AtHome chapter images.
- Ngôn ngữ mặc định: Vietnamese và English.

## Tính Năng Đã Có

### Auth Và Session

- Đăng ký tài khoản bằng email, password và display name.
- Đăng nhập bằng email/password.
- JWT access token và refresh token rotation.
- Frontend tự refresh session khi API trả `401`.
- Route protected cho Library và Settings.
- Logout UI gọi backend logout để revoke refresh token rồi clear local session.
- Settings có account screen cho update display name/avatar URL và change password.
- Change password verify current password, revoke refresh sessions cũ và issue token mới cho browser hiện tại.

### MangaDex Catalog

- Search manga theo title/keyword.
- Search trả về pagination với `limit`, `offset`, `total`.
- Search hỗ trợ sort discovery: relevance, latest update, followed count, title, created newest và updated newest.
- Search hỗ trợ filter metadata theo included/excluded cached tags, content rating, status và publication year.
- Backend ưu tiên MangaDex live data, tự lưu manga vào PostgreSQL cache.
- Nếu MangaDex/network lỗi, backend fallback sang cached manga nếu có data.
- Response search có `source: "live"` hoặc `source: "cache"` để UI biết nguồn dữ liệu.
- Manga detail có title, alt titles, description, status, year, content rating, tags và cover.
- Chapter feed có translated language, chapter number, volume, title, pages, publish date, scanlation group.
- Chapter feed hỗ trợ pagination theo `limit` và `offset`.

### Genre / Category

- Backend có endpoint danh sách genre từ cached manga tags.
- Search hỗ trợ filter theo một hoặc nhiều genre đã cache.
- Genre filter dùng cache local để không cần map MangaDex tag ID ở MVP.
- Home có section Browse by genre.
- Search page có genre chips, active filters và clear filter.
- Route `/genres/:genre` dùng lại Search layout để browse theo thể loại.
- Search page có discovery control panel với include/exclude tags, content rating, status, year và sort selector.
- Có route `/discover/popular` và `/discover/latest` dùng chung discovery layout với preset sort.

### Theme Và Visual Direction

- UI dùng theme Wibu Manga Cafe ấm, tối, reader-first.
- Palette chính là nâu than, giấy ấm, amber accent và sakura accent nhỏ.
- Header, manga cards, chapter rows, reader toolbar, genre chips và filter labels đã dùng visual language manga shelf/cafe.
- Theme không dùng neon cyberpunk, mascot, emoji icon hoặc decorative blobs.

### Cover Và Page Image Proxy

- Cover URL từ MangaDex được normalize thành local backend URL.
- Chapter reader dùng local backend page URLs thay vì direct AtHome URL.
- Backend proxy ảnh chapter theo chapter id, mode và file name.
- Việc proxy ảnh giúp tránh lỗi CORS/CORP và lỗi domain bị chặn ở môi trường local.

### Library

- User có thể follow manga vào library.
- Manga detail hiển thị trạng thái khác khi manga đã nằm trong library.
- Có toast feedback khi follow/remove manga.
- Library page hiển thị card có cover, title, status, last read và continue link nếu có progress.
- Library có tabs Reading, Favorites, Completed, Paused.
- Có quick action favorite, đổi status, remove khỏi library.
- Library có search theo title, tag, manga status hoặc library status.
- Library có sort theo last read, recently updated, title A-Z, status và favorite first.
- Library có filter summary hiển thị shelf view, visible count, sort mode và search query.

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
- Chapter list có legend:
  - `✓ Read`
  - `▶ Current`
  - `● New`
- Current chapter được highlight và có badge Current Reading.
- Chapter đã completed hoặc nằm trước current chapter được xem là read trong MVP.
- Chapter mới nhất có badge NEW.
- Language badge dùng dạng `[EN]`, `[VI]`.
- Chapter hierarchy đã tách chapter number và title riêng để scan dễ hơn.
- Chapter list load mỗi lần 100 chapter và có infinite scroll kèm fallback Load more.
- Search chapter tự fetch thêm batch khi chưa thấy kết quả trong chapters đã load.
- Có filter language bằng checkbox cho Vietnamese và English.
- Có filter scanlation group bằng checkbox dựa trên các group đã load.
- Có Clear filters để reset search, language và scanlation filters.

### Reader

- Reader hỗ trợ vertical/webtoon mode và paged mode.
- Có keyboard navigation bằng Arrow Left / Arrow Right trong paged mode.
- Có image fit toggle giữa width và contain.
- Có next chapter / previous chapter controls trong reader khi URL có `mangaId`.
- Có chapter selector trực tiếp trong reader, kèm trạng thái read/current/new.
- Reader tự preload 1-2 ảnh kế tiếp trong paged mode và prefetch metadata chapter kế tiếp khi xác định được next chapter.
- Vertical mode dùng viewport observation để lưu page đang thật sự được đọc.
- Có retry UI khi reader endpoint lỗi.
- Reader hiển thị page counter.
- Reader dùng data-saver page URLs từ MangaDex AtHome metadata.

### Data Sync Và Local Dev

- Có script sync MangaDex catalog theo limit.
- Có option sync kèm chapters.
- Có option sync theo query, languages và chapters limit.
- Có seed demo catalog làm fallback cho local dev.
- Docker Compose cung cấp PostgreSQL và Redis.
- PostgreSQL local đang expose trên host port `55432`.

### Backend/Ops

- Có production Docker Compose cho VPS với PostgreSQL, Redis, backend và frontend.
- Backend production container chạy Prisma migration trước khi start server.
- Frontend production container serve static build qua nginx và proxy `/api` về backend.
- Có liveness `/health` và readiness `/health/ready` kiểm tra PostgreSQL/Redis.
- Có GitHub Actions CI chạy Prisma generate, typecheck, tests và build cho workspaces.

### Tests Và Verification

- Có backend tests cho auth password hashing, cache key, reader URL mapping, genre count, progress manga endpoint.
- Có frontend tests cho auth form, library page, genre chips, chapter list và continue reading.
- Typecheck, tests và build workspaces đã chạy pass ở các slice gần nhất.

## Giới Hạn Hiện Tại

- Genre filter dùng cached tags trong PostgreSQL, chưa gọi MangaDex tag registry để map tag name sang tag ID live.
- Search theo cached tag/genre luôn trả từ cache, không gọi live MangaDex tag registry.
- Included/excluded tag filter hiện dựa trên tag name đã cache; chưa có UI tag ID registry đầy đủ từ MangaDex.
- Search chapter toàn feed đang dùng auto-fetch client-side, chưa có query server-side riêng.
- Scanlation filter chỉ đầy đủ theo các chapter đã load; option list mở rộng dần khi infinite scroll load thêm.
- Reading stats dựa trên chapters đã load và total từ feed; một số số liệu như scanlation detail chưa đầy đủ như dashboard.
- Reader chapter navigation cần `mangaId` trên URL; nếu thiếu `mangaId`, reader vẫn đọc được chapter hiện tại nhưng disable previous/next và selector.
- Theme hiện là một static visual direction, chưa có theme switcher hoặc per-user appearance setting.
- Search history được ghi khi search có token, nhưng chưa có UI hiển thị lịch sử search.
- No admin dashboard, no cache dashboard, no manual cache invalidation UI.

## Tính Năng Chưa Implement

### Reader Và Chapter Navigation

- Reader quality toggle giữa data saver và original.
- Reader gestures cho mobile như tap left/right hoặc swipe.
- Keyboard shortcut đầy đủ và tooltip hướng dẫn.

### Chapter List Nâng Cao

- Collapse/expand latest chapters cho manga có quá nhiều chapter.
- Group chapter theo volume.
- Deduplicate chapter theo language/scanlation preference.
- Better latest badge theo từng language hoặc publish window.

### Library Và Personalization

- Bookmark chapter riêng biệt với follow manga.
- Favorite chapter.
- Custom reading statuses chi tiết hơn.
- Reading streak hoặc reading activity.

### Manga Discovery

- Author/artist display và search.
- Better empty states khi DB cache chưa có dữ liệu.
- MangaDex tag registry để filter live bằng tag ID thay vì cached tag name.
- Demographic/original-language filters trong UI.

### Auth Và Account

- Forgot password / reset password.
- Email verification.
- OAuth login.
- Multi-device session management.

### Backend/Ops

- Structured API docs hoặc OpenAPI.
- Better outbound MangaDex queue/rate-limit policy.
- Background job scheduler cho periodic sync.
- Cache invalidation hoặc refresh endpoint cho admin/dev.
- Observability dashboard, request metrics, tracing.

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

## Frontend Routes Hiện Có

- `/`: home, popular/latest/search starters và browse by genre.
- `/search`: search manga và filter genre.
- `/genres/:genre`: browse manga theo genre.
- `/manga/:mangaId`: detail, follow, continue reading, chapters.
- `/read/:chapterId`: reader.
- `/library`: personal library, protected.
- `/login`: login.
- `/register`: register.
- `/settings`: protected settings.

## Ưu Tiên Tiếp Theo Đề Xuất

1. Thêm global Recently Read ở Home và Library.
2. Thêm logout/settings account thật.
3. Hoàn thiện Chapter List nâng cao phần còn lại: group theo volume, deduplicate preference, latest badge theo language.
4. Thêm CI và production Docker build để chuẩn bị deploy VPS.
5. Thêm reader quality toggle và mobile gestures.
