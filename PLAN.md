# Kế hoạch triển khai CampusCare

## Mục tiêu

Xây dựng MVP chạy được bằng Docker Compose, gồm API FastAPI, website quản trị React,
ứng dụng Expo (native + web), PostgreSQL, Redis, MinIO và Nginx. Mọi API nghiệp vụ
được bảo vệ bằng RBAC; sự cố hỗ trợ timeline, ảnh, thông báo và cập nhật WebSocket.

## Các giai đoạn

- [x] Khảo sát workspace và toolchain; xác nhận workspace ban đầu trống.
- [x] Chốt kiến trúc monorepo, mô hình dữ liệu và hợp đồng API.
- [x] Backend: xác thực, RBAC, địa điểm, sự cố, phân công, trạng thái, upload,
  thông báo, báo cáo, audit log, WebSocket, migration và seed.
- [x] Website quản trị: đăng nhập, dashboard, bản đồ, sự cố, phân công, danh mục,
  người dùng, địa điểm, báo cáo, audit log và hồ sơ.
- [x] Mobile: đăng nhập, báo cáo sự cố, camera/ảnh/GPS/QR, sự cố của tôi, nhiệm vụ
  nhân viên, thông báo, hồ sơ và hàng đợi offline có idempotency key.
- [x] Hạ tầng: Dockerfiles, Compose development/production, Nginx, health checks,
  volumes và security headers.
- [x] Kiểm thử runtime backend, Docker Compose config/build/health, smoke test,
  integration end-to-end và persistence qua restart.
- [x] Kiểm thử web/mobile, production build, Expo compatibility, Pyright và YAML.
- [x] Hoàn thiện tài liệu kiến trúc, API, dữ liệu, triển khai, demo và báo cáo test.

## Tiêu chí kiểm chứng

1. Unit/integration tests của API vượt qua.
2. Typecheck, lint, test và production build của admin web vượt qua.
3. Typecheck, test lớp API/offline queue và Expo Web export vượt qua.
4. `docker compose config` hợp lệ; nếu Docker có sẵn thì build, chạy migration/seed,
   kiểm tra health, luồng phân công và tính bền vững dữ liệu qua restart.

## Trạng thái môi trường ngày 22/08/2026

Toàn bộ kiểm tra Node, Python trong container, Docker Compose, migration/seed,
health, smoke, integration, WebSocket, upload MinIO và persistence đã đạt. Cả bảy
container đang healthy. Chi tiết lệnh và số liệu thật nằm ở `docs/TEST_REPORT.md`.

## Quyết định kỹ thuật

- SQLAlchemy dùng model đồng bộ để transaction nghiệp vụ rõ ràng và dễ kiểm thử;
  WebSocket vẫn chạy bất đồng bộ trong FastAPI.
- Refresh token là JWT nhưng lưu hash `jti` trong CSDL để thu hồi chính xác.
- Ảnh lưu MinIO qua adapter; metadata và quyền truy cập nằm ở API.
- Web và mobile dùng cùng REST contract. Mobile lưu payload + URI ảnh trong
  AsyncStorage, tự đồng bộ khi NetInfo báo có mạng và gửi idempotency key.
- Expo Web được phục vụ như static export ở cổng 8081; Expo Go dùng dev server.
