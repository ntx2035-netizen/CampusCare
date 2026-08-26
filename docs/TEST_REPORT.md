# Báo cáo kiểm thử CampusCare

## Kiểm tra dọn dữ liệu development ngày 26/08/2026

- Backend Ruff: PASS; Pytest **21/21** PASS.
- Test bảo đảm xóa sự cố và tài khoản không phải ADMIN nhưng giữ danh mục, địa điểm,
  ADMIN cùng refresh token hiện tại của ADMIN.
- Hai script `clear-operational-data.ps1` và `configure-gmail-otp.ps1`: PowerShell
  parser PASS; không in mật khẩu ứng dụng Gmail.
- Chưa chạy dọn volume Docker từ tiến trình Codex vì Docker CLI không có trong PATH;
  cần chạy script trên terminal Antigravity có Docker trước khi xác nhận số liệu runtime.

## Tái kiểm tra phân loại tài khoản, OTP và phạm vi ICTU ngày 25/08/2026

- Backend Ruff: PASS; Pytest **19/19** PASS. Test mới bao phủ OTP sinh viên,
  miền email ICTU, Gmail điều phối/kỹ thuật viên, trạng thái chờ ADMIN duyệt,
  chặn đăng ký thêm ADMIN và chặn GPS ngoài ICTU.
- Admin Web: typecheck, ESLint, **5/5 test** và production build PASS.
- Mobile: typecheck, **10/10 test** và Expo Web export 22 route PASS.
- `compose.yaml` và `compose.prod.yaml` đọc YAML thành công; cấu hình hiện có 8 service
  do bổ sung Mailpit cho OTP development.
- Chưa tái build Docker cho thay đổi mới nhất trong phiên Codex vì Docker CLI không xuất
  hiện trong PATH của tiến trình Codex. Các kết quả Docker bên dưới là lần chạy trước;
  cần chạy lại `docker compose up --build -d` trên terminal có Docker để xác nhận migration
  PostgreSQL, Mailpit và smoke test runtime mới.

## Tái kiểm tra bảo mật ngày 25/08/2026

- Backend Ruff: PASS; Pytest **13/13** PASS, kể cả `-W error`.
- Admin + Mobile: typecheck PASS; ESLint PASS; **12/12** test PASS.
- Admin production build PASS; Expo Web export **20 route** PASS.
- Docker Compose development và production override: PASS.
- `docker compose up --build -d`: PASS; **7/7 container healthy**.
- Smoke: `PASS health/login/seed/create: CC-20260825-8D930E88`.
- Integration: `PASS integration: CC-20260825-DA82BC15` với WebSocket,
  idempotency, upload/download, workflow, IDOR, report/audit/notification.
- Python dependency audit sau nâng cấp: **No known vulnerabilities found**.
- Node audit: 0 critical, 0 high, 11 moderate trong tooling Expo.
- Security headers/CORS/auth/rate-limit: PASS; request thứ bảy bị HTTP 429.

Chi tiết phát hiện và hạn chế còn lại xem `docs/SECURITY_AUDIT.md`.

Ngày chạy thực tế: **21–22/08/2026**, Windows, Node.js `24.19.0`, npm `11.17.0`,
Docker Engine/CLI `29.7.2`, Docker Compose `v5.4.0`. Backend chạy Python 3.12
trong image `python:3.12-slim`.

## Kết quả mã nguồn và build

| Hạng mục | Lệnh | Kết quả thực tế |
|---|---|---|
| Backend Ruff | `docker compose exec -T api ruff check .` | PASS, `All checks passed!` |
| Backend Pytest | `docker compose exec -T api pytest -q` | PASS, 9/9 test |
| Backend Pyright | `npx pyright -p services/api/pyrightconfig.json` | PASS, 0 error/warning |
| Admin TypeScript | `npm run typecheck -w @campuscare/admin-web` | PASS |
| Admin ESLint | `npm run lint -w @campuscare/admin-web` | PASS, 0 warning |
| Admin component test | `npm run test -w @campuscare/admin-web` | PASS, 2 file / 4 test |
| Admin production build | `npm run build -w @campuscare/admin-web` | PASS, JS 853.33 kB (gzip 256.37 kB) |
| Mobile TypeScript | `npm run typecheck -w @campuscare/mobile` | PASS |
| Mobile unit test | `npm run test -w @campuscare/mobile` | PASS, 3 file / 7 test |
| Expo SDK compatibility | `npx expo install --check` | PASS, dependencies up to date |
| Expo Web export | `npm run build:web -w @campuscare/mobile` | PASS, 20 static route |
| Visual QA admin login | In-app browser, desktop + viewport 390×844 | PASS, không có console error/warning |

Pytest bao phủ đăng nhập/profile, sai mật khẩu, refresh rotation/replay, RBAC,
tạo sự cố và IDOR, idempotency offline, tiếp nhận/phân công/chuyển trạng thái,
transition sai và upload sai MIME. Mobile test bao phủ navigation theo vai trò,
API client, queue offline không tạo trùng, giữ mục lỗi và retry. Admin test bao
phủ login thành công/thất bại, empty state và bản dịch trạng thái.

## Docker Compose và runtime

| Hạng mục | Kết quả thực tế |
|---|---|
| `docker compose config --quiet` | PASS |
| Compose development + production override | PASS |
| `docker compose up --build -d` | PASS; build API, admin-web, mobile-web |
| Migration + seed lúc API startup | PASS; Alembic PostgreSQL và seed QR/demo |
| Health qua Nginx | PASS; database/Redis/object storage đều `ok` |
| Trạng thái container | PASS; 7/7 service healthy |
| URL admin/mobile/Swagger | HTTP 200 tại cổng 80, 8081 và `/api/docs` |
| Security headers | PASS CSP, nosniff, DENY frame, Referrer/Permissions Policy |
| Đăng nhập demo | PASS cả 6 tài khoản, đúng 4 vai trò |
| Mobile Web → Admin Web | PASS; tạo `CC-20260822-0008` trên UI mobile, xuất hiện trên dashboard điều phối |
| Smoke test | PASS health/login/seed/create qua Nginx |
| Integration test | PASS toàn bộ luồng nghiệp vụ và realtime |
| Persistence | PASS sau restart PostgreSQL, Redis, MinIO và API |

Lệnh integration thực tế:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/integration-test.ps1
```

Kết quả cuối:

```text
PASS integration: CC-20260822-0007; WebSocket; idempotency; upload/download;
accept/assign/progress/resolve/close; IDOR; report/audit/notification
```

Integration test kết nối WebSocket bằng subprotocol JWT trước khi tạo sự cố,
xác nhận nhận event `incident.created`, gửi hai lần cùng idempotency key, dùng QR
PNG thật để upload/download qua MinIO, sau đó chạy `NEW → ACCEPTED → ASSIGNED →
IN_PROGRESS → RESOLVED → CLOSED`. Test còn xác nhận sinh viên khác nhận 404,
timeline đủ sáu bước, sinh viên thấy trạng thái mới, báo cáo/audit/thông báo có dữ liệu.

## Kiểm tra độ bền dữ liệu

Số đếm trước restart:

```text
incidents=12 | images=9 | users=6
```

Sau khi restart PostgreSQL, Redis, MinIO, chờ healthy rồi restart API:

```text
incidents=12 | images=9 | users=6
```

Ảnh của `CC-20260822-0007` vẫn tải được qua API có Bearer token, HTTP 200. Sau
phép thử, cả `postgres`, `redis`, `minio`, `api`, `admin-web`, `mobile-web` và
`nginx` đều healthy. PostgreSQL/Redis/MinIO không publish cổng ra host.

Sau phép thử persistence, kiểm thử giao diện Mobile Web tạo thêm
`CC-20260822-0008`; dashboard điều phối hiển thị tổng 13 sự cố và dòng mới ở đầu
bảng. Console Mobile Web và Admin Web đều không có warning/error.

## Dependency audit và cảnh báo còn lại

Đã chạy `npm audit fix` không dùng `--force`, cập nhật `@expo/metro` và
`metro-transform-worker`, loại toàn bộ 5 cảnh báo high. Kết quả sau vá:

```text
0 critical, 0 high, 11 moderate
```

11 cảnh báo mức vừa còn lại thuộc chuỗi Expo CLI/config qua `uuid <11.1.1` và
`xcode`. npm chỉ đề xuất sửa bằng thay đổi breaking không phù hợp ma trận Expo SDK
57 hiện tại, nên không dùng `--force`. Đây chủ yếu là tooling build/prebuild;
cần đánh giá lại khi Expo phát hành bộ dependency tương thích mới.

Vite vẫn cảnh báo admin chunk 853.33 kB lớn hơn 500 kB. Đây là hạn chế hiệu năng,
không làm build thất bại; hướng tiếp theo là lazy-load route bản đồ và biểu đồ.
