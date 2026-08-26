# Luồng hoạt động CampusCare

> Mọi route, file, hàm và bảng trong tài liệu này đã được đối chiếu với mã nguồn
> ngày 24/08/2026. WebSocket chỉ mang tín hiệu cập nhật; REST/PostgreSQL mới là
> nguồn dữ liệu nghiệp vụ. Không có secret hoặc token thật trong tài liệu.

## 1. Kiến trúc tổng thể

```mermaid
flowchart LR
  Mobile[Expo Mobile\nStudent + Staff + Operations]
  Admin[React Web chung\n4 loại tài khoản]
  Gateway[Nginx gateway\nport host 80]
  API[FastAPI\napi:8000]
  PG[(PostgreSQL\npostgres_data)]
  MinIO[(MinIO\nminio_data)]
  Redis[(Redis\nredis_data)]
  QR[(QR seed\nqr_data)]

  Admin -->|Trang và /api| Gateway
  Admin <-->|/api/ws| Gateway
  Mobile -->|REST/WS qua /api| Gateway
  Gateway --> API
  API -->|record| PG
  API -->|bytes ảnh| MinIO
  API -.->|PING health hiện tại| Redis
  API -->|seed PNG| QR
```

## 2. Luồng Docker khởi động

```mermaid
sequenceDiagram
  actor U as Người vận hành
  participant C as Docker Compose
  participant V as Volumes và networks
  participant D as postgres/redis/minio
  participant A as api
  participant W as admin-web/mobile-web
  participant N as nginx

  U->>C: docker compose up --build -d
  C->>C: Đọc compose.yaml và .env
  C->>C: Build image api/admin/mobile
  C->>V: Tạo hoặc gắn lại 4 named volumes
  C->>D: Start 3 dịch vụ dữ liệu
  D-->>C: Healthcheck healthy
  C->>A: Start api
  A->>A: alembic upgrade head
  A->>A: python -m app.seed
  A->>A: uvicorn app.main:app :8000
  A-->>C: /api/health healthy
  C->>W: Start static web servers
  W-->>C: /healthz healthy
  C->>N: Start gateway :80
```

`depends_on.condition: service_healthy` khiến API chờ PostgreSQL/Redis/MinIO và
frontend chờ API. `up --build` gắn lại volume cũ; nó không tự xóa database.

## 3. Luồng đăng nhập

```mermaid
sequenceDiagram
  actor U as Người dùng
  participant UI as LoginPage hoặc LoginScreen
  participant Auth as AuthProvider
  participant Client as api()
  participant N as Nginx
  participant R as auth.login
  participant DB as PostgreSQL

  U->>UI: Nhập email/mật khẩu, bấm Đăng nhập
  UI->>Auth: login(email,password)
  Auth->>Client: POST /auth/login
  Client->>N: JSON LoginRequest
  N->>R: POST /api/auth/login
  R->>DB: SELECT users theo email
  R->>R: verify_password
  R->>R: tạo access + refresh JWT
  R->>DB: INSERT refresh_tokens dạng hash + audit
  DB-->>R: commit
  R-->>Client: TokenPair + UserOut
  Client->>Auth: lưu session
  Auth-->>UI: user đã đăng nhập
  UI->>UI: chuyển dashboard/home/tasks
```

| Bước | File | Hàm/class | Đầu vào | Đầu ra |
|---|---|---|---|---|
| Admin submit | `apps/admin-web/src/pages/LoginPage.tsx` | `LoginPage.submit` | email/password | gọi auth login |
| Mobile submit | `apps/mobile/app/login.tsx` | `LoginScreen.submit` | email/password | gọi auth login |
| Auth web/mobile | `admin/src/auth.tsx`, `mobile/src/AuthContext.tsx` | `AuthProvider.login` | credentials | session + user state |
| HTTP client | `admin/src/api.ts`, `mobile/src/api.ts` | `api` | path/init | JSON hoặc `ApiError` |
| Validation | `services/api/app/schemas.py` | `LoginRequest` | JSON | object hợp lệ/422 |
| Router | `services/api/app/api/auth.py` | `login` | payload/IP/session | TokenPair hoặc 401/429 |
| Password | `services/api/app/security.py` | `verify_password` | password RAM + hash DB | boolean |
| User table | `services/api/app/models.py` | `User` / `users` | email | user record |
| Token | `auth.py`, `security.py` | `_issue_pair`, token functions | user id | JWT + hash row |
| Web session | `admin/src/api.ts` | `saveSession` | TokenPair | localStorage `campuscare_auth` |
| Mobile session | `mobile/src/api.ts` | `saveSession` | Session | AsyncStorage `campuscare:session` |

## 4. Luồng tạo sự cố

```mermaid
sequenceDiagram
  actor S as Sinh viên
  participant F as ReportScreen.submit
  participant Q as queueReport/AsyncStorage
  participant SY as runSync/sendQueuedReport
  participant N as Nginx
  participant R as create_incident
  participant DB as PostgreSQL
  participant WS as ConnectionManager
  participant A as Admin client

  S->>F: Nội dung, category, vị trí, ảnh
  F->>F: Crypto.randomUUID idempotency_key
  F->>Q: Lưu payload và URI ảnh
  alt Có mạng
    F->>SY: runSync
    SY->>N: POST /api/incidents
    N->>R: IncidentCreate
    R->>DB: kiểm tra reporter + idempotency key
    alt Chưa tồn tại
      R->>DB: INSERT incident NEW + history + audit
    else Đã tồn tại
      DB-->>R: incident cũ
    end
    R-->>SY: IncidentOut
    SY->>N: upload từng ảnh
    SY->>Q: xóa QueueItem nếu toàn bộ thành công
  else Mất mạng
    Q-->>S: WAITING / Chờ đồng bộ
  end
  R->>WS: broadcast incident.created sau commit
  WS-->>A: event
  A->>A: invalidate TanStack Query
  A->>N: GET /api/incidents
```

| Bước | File | Hàm/class | Đầu vào | Đầu ra |
|---|---|---|---|---|
| Form | `mobile/app/(tabs)/report.tsx` | `ReportScreen.submit` | text/category/priority/location/images | `ReportPayload` |
| Queue runtime | `mobile/src/queueRuntime.ts` | `queueReport`, `persistImages` | payload + URI | QueueItem bền hơn |
| Queue thuần | `mobile/src/offlineQueue.ts` | `enqueue`, `syncQueue` | storage + item | WAITING/ERROR/xóa thành công |
| Sender | `mobile/src/api.ts` | `sendQueuedReport` | QueueItem | incident và upload ảnh |
| Schema | `services/api/app/schemas.py` | `IncidentCreate` | JSON | validated payload |
| Router | `services/api/app/api/incidents.py` | `create_incident` | payload/current user/DB | status 201 + IncidentOut |
| Business helpers | `services/api/app/services.py` | `make_incident_code`, `set_due_at`, `audit` | incident/user/category | code/SLA/audit |
| Models | `services/api/app/models.py` | `Incident`, `IncidentHistory` | fields | rows DB |
| Realtime | `incidents.py`, `realtime.py` | `manager.broadcast` | event JSON | sockets đang online |
| Admin refresh | `admin/components/Layout.tsx` | `socket.onmessage` | event | invalidate query |

## 5. Luồng tiếp nhận và phân công

```mermaid
sequenceDiagram
  actor D as Dispatcher/Admin
  participant UI as IncidentDetailPage
  participant API as incidents router
  participant S as transition_incident
  participant DB as PostgreSQL
  participant WS as WebSocket
  actor T as Staff

  D->>UI: Tiếp nhận incident NEW
  UI->>API: PATCH /incidents/id/status ACCEPTED
  API->>S: transition_incident
  S->>DB: status + history
  API->>DB: audit + commit
  D->>UI: Chọn Staff và Phân công
  UI->>API: POST /incidents/id/assign
  API->>API: kiểm role, staff active, status ACCEPTED
  API->>S: transition ASSIGNED
  S->>DB: assigned_staff_id + timestamp + history
  API->>DB: notification + audit + commit
  API->>WS: notification.created + incident.updated
  WS-->>T: nhiệm vụ mới
```

| Bước | File | Hàm/class | Đầu vào | Đầu ra |
|---|---|---|---|---|
| Nút/selector | `admin/pages/IncidentDetailPage.tsx` | `status`, mutation `/assign` | incident/staff/note | API request |
| Staff list | cùng file | TanStack query | `/users?role=STAFF&active=true` | `User[]` |
| Router | `api/incidents.py` | `assign_incident` | `AssignmentRequest` | IncidentOut |
| Rule | `app/services.py` | `transition_incident` | source/target/actor | history hoặc 403/409 |
| Snapshot assignment | `app/models.py` | `Incident.assigned_staff_id` | Staff UUID | FK `users` |
| Inbox | `services.py` | `add_notification` | user/title/message | row notifications |

Không có bảng `assignments`; người đang được giao nằm ở
`incidents.assigned_staff_id`, còn diễn biến nằm ở `incident_histories`.

## 6. Máy trạng thái thật

```mermaid
stateDiagram-v2
  [*] --> NEW
  NEW --> ACCEPTED: Dispatcher/Admin
  NEW --> REJECTED: Dispatcher/Admin
  ACCEPTED --> ASSIGNED: Dispatcher/Admin
  ACCEPTED --> REJECTED: Dispatcher/Admin
  ASSIGNED --> IN_PROGRESS: Staff được giao/Admin
  IN_PROGRESS --> RESOLVED: Staff được giao/Admin + resolution
  RESOLVED --> CLOSED: Student sở hữu/Dispatcher/Admin
  RESOLVED --> IN_PROGRESS: Student sở hữu/Dispatcher/Admin
  CLOSED --> [*]
  REJECTED --> [*]
```

Nguồn sự thật là `TRANSITIONS` và `transition_incident` trong `app/services.py`,
không phải các nút frontend.

## 7. Đồng bộ offline

```mermaid
sequenceDiagram
  actor S as Sinh viên
  participant R as ReportScreen
  participant F as persistImages
  participant AS as AsyncStorage
  participant NI as NetInfo
  participant SQ as syncQueue
  participant API as CampusCare API

  S->>R: Bấm Gửi
  R->>R: sinh client UUID
  R->>F: lưu URI ảnh bền hơn
  alt Native
    F->>F: copy vào documentDirectory/offline-reports
  else Expo Web
    F-->>R: giữ URI/data URL
  end
  R->>AS: enqueue WAITING
  alt Offline
    R-->>S: Chờ đồng bộ
  else Online hoặc có mạng lại
    NI->>SQ: runSync
    SQ->>API: POST cùng idempotency_key
    API-->>SQ: incident cũ hoặc mới
    SQ->>API: upload từng ảnh
    alt thành công hết
      SQ->>AS: bỏ item
    else có lỗi
      SQ->>AS: giữ ERROR + message
    end
  end
```

Giới hạn: idempotency chỉ áp cho incident, chưa áp cho từng ảnh. Nếu một số ảnh
đã lên rồi request sau lỗi, retry có thể tải lại ảnh đã thành công.

## 8. Upload và hiển thị ảnh

```mermaid
sequenceDiagram
  actor U as Student/Staff/Admin
  participant UI as Report/Task/Admin Detail
  participant N as Nginx
  participant R as upload_image
  participant M as MinIO
  participant DB as PostgreSQL
  participant V as download_image/AuthImage

  U->>UI: Chọn/chụp file + kind
  UI->>N: multipart POST /api/incidents/id/images
  N->>R: file, kind, JWT
  R->>R: rate limit + ownership/RBAC
  R->>R: MIME + 8MB + Pillow verify
  R->>M: storage.put với tên UUID
  R->>DB: IncidentImage metadata + audit + commit
  R-->>UI: ImageOut URL
  V->>N: GET /api/incidents/id/images/image_id + Bearer
  N->>R: download_image
  R->>R: assert_can_view và kiểm thuộc incident
  R->>M: storage.get(object_name)
  M-->>V: stream bytes
```

| Dữ liệu | Nơi lưu | File/class |
|---|---|---|
| Bytes JPEG/PNG/WebP | MinIO volume `minio_data` | `app/storage.py:ObjectStorage` |
| Metadata ảnh | PostgreSQL table `incident_images` | `app/models.py:IncidentImage` |
| Quyền xem | Tính từ incident/current user trước khi đọc MinIO | `download_image`, `assert_can_view` |
| Ảnh offline native | documentDirectory thiết bị | `queueRuntime.ts:persistImages` |
| Queue + URI/data URL | AsyncStorage | `offlineQueue.ts` |
| QR seed | `qr_data`, không phải ảnh sự cố | `app/seed.py` |

Admin component `AuthImage` tải blob bằng Bearer rồi render `<img>`. Mobile Staff
upload được ảnh; màn chi tiết Student hiện chưa render danh sách ảnh.

## 9. Realtime và notification

1. `main.py:websocket_endpoint` đọc access token từ subprotocol, decode và kiểm
   user active trước khi `manager.connect`.
2. Router commit transaction trước rồi `send_user`/`broadcast`.
3. Admin `Layout.tsx` invalidate cache TanStack Query.
4. Mobile `realtime.ts` gọi listener của list/detail.
5. Client đọc lại REST; WS event không thay PostgreSQL.
6. Inbox bền vững nằm trong `notifications`.

`ConnectionManager` nằm trong RAM. Nếu chạy nhiều API replica, cần Redis Pub/Sub;
phần đó chưa có trong code hiện tại.

## 10. Từ URL đến màn hình admin

Ví dụ `http://localhost/incidents`:

1. Gateway `/` → `admin-web:80`.
2. Admin Nginx `try_files ... /index.html` trả SPA shell.
3. `index.html` nạp `src/main.tsx`.
4. `main.tsx` dựng QueryClient, BrowserRouter, AuthProvider, App.
5. `App.tsx` ghép route với `IncidentsPage` qua `Guard` và `Layout`.
6. Page gọi `api('/incidents')`; request quay lại gateway `/api`.
7. FastAPI kiểm JWT/RBAC, đọc PostgreSQL và trả JSON.
8. TanStack Query cập nhật; React render loading/error/empty/table.

## 11. Đường đi của lỗi

```text
Pydantic/HTTPException/backend exception
→ JSON detail + HTTP status
→ Nginx giữ status/body
→ api.ts tạo ApiError
→ query/mutation/try-catch
→ thông báo tiếng Việt trên UI
```

Exception không xử lý được đi qua handler ở `app/main.py`, trả thông báo 500
chung, không gửi stack trace ra frontend. Chi tiết phải đọc log API/Nginx.
