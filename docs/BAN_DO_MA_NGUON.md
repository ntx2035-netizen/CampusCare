# Bản đồ mã nguồn CampusCare dành cho người mới

> Khảo sát lại ngày 24/08/2026. Chỉ phân tích mã do dự án sở hữu; bỏ qua
> `node_modules`, `dist`, `build`, `.expo`, cache, `__pycache__` và file build tự
> sinh. Repository không có Git history, vì vậy không thể xác nhận thứ tự commit.

## 1. Bản đồ cấp cao

```text
DUAN/
├── apps/admin-web/          Website React dành cho điều phối/quản trị
├── apps/mobile/             Expo app dùng chung Android, iOS và Web
├── services/api/            Backend FastAPI và database model
├── infrastructure/nginx/    Gateway chuyển tiếp REST và WebSocket
├── scripts/                 Script kiểm tra/smoke/integration
├── docs/                    Tài liệu dự án
├── compose.yaml             Docker Compose chính
├── compose.prod.yaml        Cấu hình ghi đè production
├── .env.example             Mẫu tên biến cấu hình, không phải database
├── package.json             npm workspaces
├── AGENTS.md                Quy tắc làm việc
├── PLAN.md                  Kế hoạch MVP
└── README.md                Hướng dẫn chạy nhanh
```

## 2. Root và hạ tầng

| Đường dẫn | Nhiệm vụ | Ai sử dụng file này? | Chạy khi nào? | Có thể sửa gì? | Sửa xong kiểm tra thế nào? |
|---|---|---|---|---|---|
| `README.md` | Hướng dẫn cài, chạy, URL và tài khoản development | Người cài/demo | Trước lần chạy đầu | Hướng dẫn vận hành; không thêm secret thật | Chạy lại từng lệnh trong môi trường thử |
| `AGENTS.md` | Quy tắc tiếng Việt, RBAC, timeline, audit và migration | Người sửa dự án | Trước mọi thay đổi | Chỉ thay đổi quy trình repository | Đối chiếu toàn bộ mã liên quan |
| `PLAN.md` | Ghi phạm vi, quyết định và trạng thái MVP | Nhóm phát triển | Khi lập kế hoạch/báo cáo | Trạng thái đã có bằng chứng | So với `docs/TEST_REPORT.md` và runtime |
| `.env.example` | Danh sách biến PostgreSQL, Redis, MinIO, JWT, CORS và URL client | Compose/backend/frontend | Trước khi tạo `.env` | Tên biến và giá trị development không nhạy cảm | `docker compose config --quiet`; không commit `.env` |
| `package.json` | Gộp admin/mobile thành npm workspaces | npm | Cài, test, typecheck, build | Script/workspace | `npm run typecheck`, `npm test` |
| `package-lock.json` | Khóa chính xác phiên bản dependency Node | npm | `npm install`/`npm ci` | Không sửa tay từng dòng | `npm ci`, test và build |
| `compose.yaml` | 7 service, 4 named volume, 2 network | Docker Compose | `docker compose up` | Image, build, port, env, health, volume | `docker compose config --quiet`, `ps`, health |
| `compose.prod.yaml` | Ghi đè restart, environment và port production | Docker Compose trên server | Ghép với file chính | Chính sách production | `docker compose -f compose.yaml -f compose.prod.yaml config` |
| `infrastructure/nginx/nginx.conf` | Cổng 80: `/` → admin, `/api` và `/api/ws` → API | Nginx gateway | Mỗi request qua localhost | Proxy, rate limit, security headers | `/healthz`, `/api/health`, thử REST/WS |
| `scripts/check.ps1` | Gom các lệnh kiểm tra | Lập trình viên/CI | Trước bàn giao | Bổ sung kiểm tra | Chạy từ root và đọc exit code |
| `scripts/smoke-test.ps1` | Health, login, seed và tạo incident qua Nginx | Người kiểm thử | Sau khi stack chạy | Luồng smoke | Script có tạo dữ liệu, chỉ chạy khi chủ động |
| `scripts/integration-test.ps1` | E2E WebSocket, ảnh, phân công, trạng thái, IDOR | Người kiểm thử | Trước release/demo | Luồng tích hợp | Script có tạo dữ liệu, không phải lệnh chỉ đọc |

## 3. Backend FastAPI

| Đường dẫn | Nhiệm vụ | Ai sử dụng file này? | Chạy khi nào? | Có thể sửa gì? | Sửa xong kiểm tra thế nào? |
|---|---|---|---|---|---|
| `services/api/Dockerfile` | Image Python 3.12 và user runtime | Docker | Build `api` | Base image/bước cài/start | `docker compose build api`, health, Pytest |
| `services/api/pyproject.toml` | Dependency FastAPI/SQLAlchemy và cấu hình Ruff/Pytest | pip/công cụ test | Cài hoặc test | Dependency/rule | `python -m ruff check .`, `python -m pytest` |
| `services/api/app/main.py` | Tạo FastAPI, gắn 8 router, CORS, health, WS, handler 500 | Uvicorn | API khởi động/mỗi request hệ thống | Middleware/router cấp cao | `/api/live`, `/api/health`, `/api/docs`, test WS |
| `app/config.py` | Đọc cấu hình từ biến môi trường | Toàn backend | Khi app nạp module | Tên, kiểu, default an toàn | Start API và test health |
| `app/database.py` | Engine, `SessionLocal`, `Base`, `get_db` | Router/Alembic/seed | Mỗi truy vấn DB | Kết nối/session | Pytest và health DB |
| `app/enums.py` | Role, loại location, priority, status, kind ảnh | Model/schema/client contract | Validate/lưu dữ liệu | Giá trị enum | Có thể cần migration; test backend + typecheck clients |
| `app/models.py` | 9 model tương ứng 9 bảng nghiệp vụ | SQLAlchemy/Alembic/router | Truy vấn/lưu record | Cột, khóa, quan hệ, index | Tạo migration mới, upgrade, Pytest |
| `app/schemas.py` | Pydantic request/response validation | FastAPI/Swagger | Trước handler và khi trả response | Kiểu/ràng buộc API | Pytest, Swagger, typecheck clients |
| `app/dependencies.py` | User hiện tại, `require_roles`, rate limit in-memory, IP | Router bảo vệ | Trước endpoint | Auth dependency/RBAC/rate limit | Test 401/403/429 |
| `app/security.py` | Hash/verify mật khẩu, JWT, digest refresh token | Auth router/WS | Login, refresh, request bảo vệ | Thuật toán/thời hạn rất nhạy cảm | Test auth; không log token |
| `app/services.py` | State machine, ownership, notification, audit, SLA | Router nghiệp vụ | Trong transaction sự cố | Quy tắc dùng chung | `test_incidents.py`, E2E |
| `app/realtime.py` | Danh sách WebSocket trong RAM một process | `main.py`, incidents router | Client online/event phát | Connect/send/disconnect | Test reconnect và event |
| `app/storage.py` | Adapter ghi/đọc MinIO, tên object UUID | Upload/download/health | Khi xử lý ảnh | Bucket/storage backend | MIME/RBAC và upload/download test |
| `app/seed.py` | Seed user/category/location/incident và 3 QR development | API startup/người vận hành | Sau migration | Dữ liệu demo idempotent | Seed rồi kiểm tra count; không dùng secret demo production |
| `app/api/auth.py` | Login, refresh, logout, hồ sơ, đổi mật khẩu | Admin/mobile | `/api/auth/*` | Luồng xác thực | `test_auth.py`, login UI |
| `app/api/users.py` | Liệt kê/tạo/sửa/khóa tài khoản | Admin/Dispatcher theo RBAC | `/api/users*` | Quản lý user | Test bằng nhiều role |
| `app/api/locations.py` | Cây location, resolve/tải QR, CRUD | Các client | `/api/locations*` | Parent hierarchy/QR | API test và quét QR |
| `app/api/categories.py` | Category và SLA | Form report/Admin | `/api/categories*` | CRUD category | API/form test |
| `app/api/incidents.py` | List/create/detail/assign/status/feedback/images | Cả hệ thống | `/api/incidents*` | Orchestration + transaction | Test incidents và integration |
| `app/api/notifications.py` | Inbox của chính user và read state | Admin/mobile | `/api/notifications*` | Query/read | Ownership/UI test |
| `app/api/reports.py` | Summary và CSV | Dispatcher/Admin | `/api/reports*` | Công thức/export | Đối chiếu DB và CSV |
| `app/api/audits.py` | List audit chỉ Admin | Admin web | `/api/audit-logs` | Filter/phân trang | RBAC và Audit page |
| `alembic/env.py` | Nối Alembic với URL thật và `Base.metadata` | Alembic | Mọi lệnh migration | Cách cấu hình migration | `alembic current`, `heads`, `upgrade head` |
| `alembic/versions/0001_initial.py` | Migration đầu gọi `Base.metadata.create_all` | Alembic | Tạo schema lần đầu | Không sửa migration đã phát hành | Test trên DB thử mới |
| `tests/conftest.py` | SQLite in-memory và fixture test | Pytest | Trước từng test | Dữ liệu test | `pytest -q` |
| `tests/test_auth.py` | Login, refresh replay, RBAC | Pytest | Test | Kịch bản auth | Chạy file test |
| `tests/test_incidents.py` | Create, IDOR, idempotency, assign, transition, MIME | Pytest | Test | Kịch bản sự cố | Chạy file test |

### Các lớp backend thực tế

| Lớp | Nhiệm vụ | File thực tế | Không nên đặt logic gì ở đây? |
|---|---|---|---|
| Router/controller | Nhận HTTP, dependency/RBAC, điều phối transaction | `app/api/*.py`, `app/main.py` | Không lặp hash hoặc state machine |
| Schema | Validate JSON/form và mô tả OpenAPI | `app/schemas.py` | Không truy vấn DB |
| Model | Ánh xạ class Python ↔ bảng SQL | `app/models.py` | Không chứa UI/HTTP response |
| Service | Luật trạng thái, ownership, audit, notification | `app/services.py` | Không chứa JSX hay AsyncStorage |
| Dependency | Auth/RBAC/rate limit | `app/dependencies.py` | Không làm toàn bộ nghiệp vụ sự cố |
| Storage adapter | Giao tiếp MinIO | `app/storage.py` | Không tự quyết quyền xem ảnh |
| Realtime | Socket trong memory | `app/realtime.py` | Không là nguồn dữ liệu bền vững |
| Migration | Phiên bản hóa schema | `alembic/versions/*.py` | Không seed dữ liệu |
| Seed | Dữ liệu development | `app/seed.py` | Không thay migration |
| Repository | **Không có lớp riêng**; router dùng SQLAlchemy trực tiếp | Không có `repository.py` | Không được giả định một file không tồn tại |

## 4. Admin Web

| Đường dẫn | Nhiệm vụ | Ai sử dụng file này? | Chạy khi nào? | Có thể sửa gì? | Sửa xong kiểm tra thế nào? |
|---|---|---|---|---|---|
| `apps/admin-web/index.html` | HTML gốc và `#root` | Trình duyệt/Vite | Tải trang đầu | Title/meta | Build và mở trang |
| `src/main.tsx` | Mount React, QueryClient, BrowserRouter, AuthProvider | Browser | Bundle khởi động | Provider toàn app | Typecheck/test |
| `src/App.tsx` | Route và `Guard` phía UI | React Router | URL thay đổi | Route/màn hình | Test navigation; backend vẫn phải RBAC |
| `src/api.ts` | API URL, localStorage session, refresh, download, WS URL | Mọi page | Mỗi request | Transport/API base | Test login, Network tab |
| `src/auth.tsx` | `AuthProvider`: login/logout/user state | Layout/pages | Khởi động/login | State phiên | Login test |
| `src/types.ts` | Contract TypeScript và nhãn Việt hóa | Components/pages | Compile/render | Type/label | Typecheck + API test |
| `src/components/Layout.tsx` | Sidebar/menu/topbar/count notification/WS invalidation | Route đã login | Sau `Guard` | Menu/khung/realtime | Test từng role và WS |
| `src/components/States.tsx` | Loading/empty/error/header/badge | Pages | Theo query state | UI dùng chung | `States.test.tsx` |
| `src/pages/*.tsx` | Màn hình nghiệp vụ | React Router | Route tương ứng | Form/bảng/UI | Typecheck, test, API thật |
| `src/styles.css` | Theme, layout, responsive | Tất cả component | Render | Màu/spacing/breakpoint | Build + visual check |
| `vite.config.ts` | Vite/Vitest, port 5173, dev proxy `/api` → 8000 | Vite/Vitest | Dev/test/build | Proxy/plugin/test env | Test/build |
| `Dockerfile`, `nginx.conf` | Build static và SPA fallback | Docker/Nginx | Build/runtime admin | Build stage/cache/fallback | Build image, `/healthz`, deep route |

Không có file logo ảnh riêng trong admin. Logo hiện là icon `Activity` từ
`lucide-react` ở `LoginPage.tsx` và `Layout.tsx`.

### Màn hình admin

| Màn hình | Route | File giao diện | Component sử dụng | API được gọi | File CSS/theme |
|---|---|---|---|---|---|
| Login | `/login` | `pages/LoginPage.tsx` | `AuthProvider` | `POST /auth/login` | `styles.css` |
| Dashboard | `/` | `pages/DashboardPage.tsx` | States, Recharts | incidents, reports/summary | `styles.css` |
| Danh sách sự cố | `/incidents` | `pages/IncidentsPage.tsx` | States/table | `GET /incidents` | `styles.css` |
| Chi tiết/timeline | `/incidents/:id` | `pages/IncidentDetailPage.tsx` | `AuthImage`, action cards | detail/status/assign/feedback/images/staff | `styles.css` |
| Bản đồ | `/map` | `pages/MapPage.tsx` | Leaflet + fallback | incidents | `styles.css`, Leaflet CSS |
| Users | `/users` | `pages/ManagementPages.tsx:UsersPage` | form/table | users GET/POST | `styles.css` |
| Locations | `/locations` | `ManagementPages.tsx:LocationsPage` | form/table/download | locations/QR | `styles.css` |
| Categories | `/categories` | `ManagementPages.tsx:CategoriesPage` | form/table | categories | `styles.css` |
| Reports | `/reports` | `ManagementPages.tsx:ReportsPage` | metrics/download | summary/CSV | `styles.css` |
| Audit | `/audit` | `ManagementPages.tsx:AuditPage` | table | audit-logs | `styles.css` |
| Notifications | `/notifications` | `ManagementPages.tsx:NotificationsPage` | list | notifications | `styles.css` |
| Profile | `/profile` | `ManagementPages.tsx:ProfilePage` | Auth/form | `PATCH /auth/me` | `styles.css` |

## 5. Mobile Expo

| Đường dẫn | Nhiệm vụ | Ai sử dụng file này? | Chạy khi nào? | Có thể sửa gì? | Sửa xong kiểm tra thế nào? |
|---|---|---|---|---|---|
| `apps/mobile/package.json` | Entry `expo-router/entry`, dependency, scripts | Expo/npm | Start/test/export | Dependency/script | typecheck/test/Expo doctor |
| `app.json` | Tên app, package ID, quyền camera/GPS/ảnh, plugins | Expo/EAS | Start/build | Permission/ID/splash | Expo config/Go |
| `eas.json` | Profile dev, preview APK, production | EAS | `eas build` | Distribution/build type | Build khi có tài khoản |
| `app/_layout.tsx` | Root Stack, splash, auth, NetInfo watcher, realtime | Expo Router | App khởi động | Route stack/provider | Typecheck + run Web/Go |
| `app/index.tsx` | Redirect theo session/role | Expo Router | Route `/` | Điểm đến đầu | Routes test/login từng role |
| `app/(tabs)/_layout.tsx` | Tab bar theo role | Expo Router | Sau login | Tab/href | Navigation test |
| `app/login.tsx` | Form login | User | `/login` | UI login | API test/login thật |
| `app/(tabs)/report.tsx` | Form incident, camera/library, queue | Student | `/report` | Báo cáo | Offline/API test |
| `app/scan.tsx` | `CameraView`, parse QR, resolve location | Student | `/scan` | QR UX/format | Thử QR thật |
| `app/select-location.tsx` | GPS hoặc nhập tọa độ | Student | `/select-location` | Accuracy/validation | Thử thiết bị |
| `app/incident.tsx` | Detail/timeline/feedback Student | Student | `/incident?id=...` | Detail/feedback | Ownership/status test |
| `app/task.tsx` | Ảnh trước/sau và cập nhật Staff | Staff | `/task?id=...` | Camera/upload/status | E2E task |
| `src/api.ts` | URL API, AsyncStorage session, refresh, queue sender | Toàn app | Mỗi request/sync | Transport/base URL | `api.test.ts` |
| `src/AuthContext.tsx` | Restore/login/logout/profile session | Root/screens | Startup/login | Auth state | Login/restart app |
| `src/offlineQueue.ts` | Pure queue: read/enqueue/sync/retry | Runtime/test | Offline sync | Queue rule | `offlineQueue.test.ts` |
| `src/queueRuntime.ts` | AsyncStorage, NetInfo, copy ảnh, auto sync | Root/Home/Report | Mạng đổi | Runtime queue | Unit + thử mất mạng |
| `src/realtime.ts` | WebSocket/reconnect/listeners | Root/screens | User login | WS URL/events | Theo dõi Network WS |
| `src/routes.ts` | Contract route dùng trong test | Test | Navigation test | Route lists | `routes.test.ts` |
| `src/theme.ts`, `src/types.ts` | Style dùng chung và contract API | Screens | Render/compile | Theme/type | Typecheck |
| `Dockerfile`, `nginx.conf` | Static Expo Web để kiểm chứng mã dùng chung | Docker | Build `mobile-web` | Build arg | Build image; sản phẩm chỉ publish cổng `80` |

Mobile không có asset logo riêng; login dùng ký tự `✚`. Màn Student
`app/incident.tsx` hiện chưa render `incident.images`, dù API và Admin Web đã hỗ
trợ download/hiển thị ảnh.

## 6. Muốn thay đổi thì sửa ở đâu?

| Muốn thay đổi | File cần sửa | Vì sao? | Có cần migration không? | Lệnh kiểm tra sau khi sửa |
|---|---|---|---|---|
| Đổi tên CampusCare | Admin `index.html`, `LoginPage.tsx`, `Layout.tsx`; mobile `app.json`/screens; backend `main.py`; docs | Tên có ở metadata/UI/OpenAPI | Không | `rg "CampusCare"`, typecheck/test/build |
| Đổi logo | Admin Login/Layout; mobile login/app config; thêm asset nếu muốn | Hiện icon/ký tự, không có logo file | Không | Build + visual check |
| Đổi màu | Admin `styles.css`; mobile `theme.ts` và style cục bộ | Nguồn theme thật | Không | Typecheck/build + responsive check |
| Đổi chữ login | Admin `LoginPage.tsx`, mobile `login.tsx` | Hai UI riêng | Không | Login test/typecheck |
| Thêm menu | Admin `Layout.tsx` + `App.tsx`; mobile tab layout | Menu và route tách nhau | Không | Navigation/RBAC/typecheck |
| Thêm website screen | File mới `admin/pages`, `App.tsx`, có thể Layout | Component + route + menu | Tùy dữ liệu | Typecheck/lint/test/build |
| Thêm mobile screen | File mới `mobile/app`, layout, `routes.ts` | Expo Router dựa trên file | Tùy dữ liệu | Typecheck/routes test/export |
| Thêm category | Dùng UI/API; seed mặc định ở `seed.py` nếu cần | Category là record, không phải enum | Không | API/form test |
| Thêm field incident | `models.py`, migration mới, `schemas.py`, router; type/form/detail/test hai client | Thay đổi xuyên lớp | Có | Alembic + backend test + frontend checks |
| Thêm cột DB | `models.py` + migration **mới** | Model không tự sửa DB đang tồn tại | Có | upgrade/schema/Pytest |
| Đổi transition | `services.py:TRANSITIONS`, `transition_incident`; UI actions/test | Backend là nguồn quyền | Thường không | Incident tests + E2E |
| Thêm quyền role | dependencies/router/services; App/Layout/tab/screen | Backend trước, UX sau | Chỉ khi thêm enum role | RBAC/IDOR tests |
| Đổi API URL | Biến `VITE_API_URL`, `VITE_WS_URL`, `EXPO_PUBLIC_API_URL`; Vite proxy khi dev | Lấy từ environment | Không | Network REST/WS |
| Đổi Docker port | Compose files và docs | Host port ở Compose | Không | Compose config/ps/URL mới |
| Đổi password DB | `.env` + thao tác credential DB hiện hữu có backup | Đổi env không tự đổi credential trong volume cũ | Không migration | Backup/health; không log/commit secret |
| Thêm endpoint | Router phù hợp + schema/service/model; `main.py` nếu router mới | FastAPI ghép router | Tùy dữ liệu | Pytest/Swagger/RBAC |
| Đổi lưu ảnh | `storage.py`, config, incidents router, model/migration nếu metadata đổi, client download | Byte và metadata/quyền tách nhau | Có thể | MIME/RBAC/upload/download/backup |

Ví dụ thêm `contact_phone` vào incident phải đi qua: model → migration mới →
Pydantic schema → router/service nếu có nghiệp vụ → types hai client → form mobile
và màn chi tiết → tests. Không chỉ sửa một ô giao diện.

## 7. Khác biệt/hạn chế quan sát được

- Backend là modular monolith, không có microservice hay repository layer riêng.
- Phân công là `incidents.assigned_staff_id` cộng timeline; không có bảng
  `assignments` riêng.
- Redis có service nhưng code nghiệp vụ hiện chỉ `PING` trong health; limiter và
  WebSocket manager đều in-memory.
- Bytes ảnh ở MinIO; PostgreSQL chỉ giữ metadata/object name.
- `qr_data` giữ PNG QR seed, không giữ ảnh sự cố.
- `compose.prod.yaml` chưa tự cấu hình TLS hay secret manager.
- Form login web/mobile điền sẵn tài khoản development trong source; không phù
  hợp production. Tài liệu này không chép mật khẩu.
- Offline retry có idempotency cho incident nhưng chưa có idempotency từng ảnh;
  lỗi giữa chừng có thể khiến ảnh đã upload được gửi lại.
- Migration đầu dùng `Base.metadata.create_all`; migration đã phát hành không nên
  sửa, mọi schema mới phải có version mới.
