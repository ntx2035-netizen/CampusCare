# CampusCare

CampusCare là nền tảng tiếp nhận và điều phối xử lý sự cố trong khuôn viên trường
theo thời gian thực. Repository là monorepo gồm FastAPI, website quản trị React và
ứng dụng Expo dùng chung cho Android, iOS và web.

## Thành phần

- `apps/admin-web`: React 19, Vite, TypeScript, React Router, TanStack Query,
  Leaflet/OpenStreetMap, Recharts và WebSocket.
- `apps/mobile`: React Native 0.86, Expo SDK 57, Expo Router, AsyncStorage,
  NetInfo, camera, chọn ảnh, GPS và QR.
- `services/api`: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL,
  Redis, MinIO, JWT access/refresh và Argon2.
- `infrastructure/nginx`: reverse proxy REST/WebSocket và security headers.

Tài liệu chi tiết: [kiến trúc](docs/ARCHITECTURE.md), [API](docs/API.md),
[cơ sở dữ liệu](docs/DATABASE.md), [triển khai](docs/DEPLOYMENT.md),
[kịch bản demo](docs/DEMO_SCRIPT.md), [báo cáo kiểm thử](docs/TEST_REPORT.md).

## Chạy nhanh bằng Docker

Yêu cầu Docker Desktop (Windows/macOS) hoặc Docker Engine + Compose plugin (Linux).
Trên Windows, mở Docker Desktop và chờ trạng thái **Engine running** trước khi chạy.
Nếu terminal vẫn báo không nhận lệnh `docker`, hãy đóng và mở lại terminal/Codex để
nạp lại `PATH`; không cần cài lại Docker Desktop.

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

Lần chạy đầu, container API tự chạy `alembic upgrade head`, seed dữ liệu và tạo
ba QR mẫu `A101.png`, `A202.png`, `B105.png` trong volume `qr_data`.

Truy cập:

- Cổng web đăng nhập/đăng ký chung cho cả bốn vai trò: [http://localhost](http://localhost)
- Swagger: [http://localhost/api/docs](http://localhost/api/docs)
- Health API: [http://localhost/api/health](http://localhost/api/health)
- Hộp thư OTP demo: [http://localhost:8025](http://localhost:8025)

Dừng hệ thống nhưng giữ dữ liệu:

```bash
docker compose down
```

Chỉ dùng `docker compose down -v` khi chủ động muốn xóa toàn bộ dữ liệu demo.

## Tài khoản bootstrap

Các mật khẩu dưới đây chỉ dành cho development và phải đổi ở môi trường thật.

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `ntx2035@gmail.com` | Giá trị `DEMO_ADMIN_PASSWORD` trong `.env` |

Chỉ ADMIN là tài khoản bootstrap cố định. Sinh viên và giảng viên tự đăng ký bằng
email `ictu.edu.vn`. Kỹ thuật viên và điều phối tự đăng ký bằng Gmail, xác minh OTP
rồi chờ ADMIN duyệt. Backend quyết định vai trò sau đăng nhập; người dùng không thể
tự đổi quyền bằng giao diện.
Trong bản demo, Mailpit nhận email tại `http://localhost:8025`; khi triển khai thật,
đặt các biến `SMTP_*` để gửi OTP tới hộp thư Gmail/ICTU thực tế.

Để cấu hình Gmail thật trên Windows mà không hiện mật khẩu ứng dụng ra màn hình:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/configure-gmail-otp.ps1
```

Google Account phải bật xác minh hai bước và tạo **App password** 16 ký tự. Script
tạo/cập nhật file `.env` đã được gitignore rồi khởi động lại API. Mailpit vẫn có thể
chạy nhưng API sẽ gửi qua `smtp.gmail.com` sau khi cấu hình thành công.

| Loại đăng ký | Email được chấp nhận | Sau OTP | Giao diện chính |
|---|---|---|---|
| Sinh viên/Giảng viên | `@ictu.edu.vn` | Hoạt động ngay | Báo và theo dõi sự cố |
| Kỹ thuật viên | Gmail | Chờ ADMIN duyệt | Nhiệm vụ được giao |
| Điều phối viên | Gmail | Chờ ADMIN duyệt | Tiếp nhận và phân công |
| ADMIN | Không cho đăng ký | Tài khoản bootstrap | Quản trị toàn hệ thống |

Phạm vi phục vụ mặc định có tâm `21.5862035, 105.8063499` và bán kính 2.500 m quanh
ICTU. Có thể hiệu chỉnh bằng `CAMPUS_CENTER_LATITUDE`, `CAMPUS_CENTER_LONGITUDE` và
`CAMPUS_RADIUS_METERS`; backend từ chối báo cáo có GPS ngoài phạm vi này.

## Làm sạch dữ liệu phát triển

Lệnh sau xóa sự cố, timeline, ảnh MinIO, thông báo, audit, OTP và mọi tài khoản
không phải ADMIN. Lệnh giữ `ntx2035@gmail.com`, danh mục sự cố, địa điểm và QR nền:

```powershell
docker compose up --build -d api
powershell -ExecutionPolicy Bypass -File scripts/clear-operational-data.ps1 -Yes
```

Đây là thao tác không hoàn tác. Không dùng trên production; script tự từ chối khi
`ENVIRONMENT` không phải `development`.

## Chạy phát triển không dùng Docker

Backend cần Python 3.12, PostgreSQL, Redis và MinIO. Tạo `.env`, cập nhật các URL
về dịch vụ local, sau đó:

```bash
cd services/api
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Ở terminal khác:

```bash
npm install
npm run dev -w @campuscare/admin-web
```

Vite chạy ở `http://localhost:5173` và proxy `/api` đến cổng 8000.

## Chạy mobile

### Trình duyệt máy tính

```bash
cd apps/mobile
npx expo start --web
```

Hoặc tạo static export đã dùng trong Docker:

```bash
npm run build:web
```

### Điện thoại bằng Expo Go

1. Điện thoại và laptop phải cùng mạng LAN.
2. Tìm IP LAN của laptop (`ipconfig` trên Windows, `ip addr` trên Linux).
3. Tạo `apps/mobile/.env.local`, ví dụ:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.10/api
   ```

4. Từ `apps/mobile`, chạy `npx expo start`, rồi quét QR bằng Expo Go.

Không dùng `localhost` trên điện thoại: khi đó `localhost` là chính điện thoại.
Android Emulator có thể dùng `EXPO_PUBLIC_API_URL=http://10.0.2.2/api`.
Với LDPlayer, thử mở `http://10.0.2.2/api/health` trong trình duyệt của LDPlayer;
nếu thấy JSON `healthy` thì giữ URL này. Nếu không, dùng IPv4 LAN của laptop.
Docker Desktop và LDPlayer cùng dùng ảo hóa nên LDPlayer có thể cảnh báo giảm hiệu
năng; chọn **Không, cảm ơn** để không làm tắt nền ảo hóa mà Docker đang cần.

### EAS Build

`apps/mobile/eas.json` có profile `development`, `preview` (APK cài trực tiếp) và
`production` (AAB mặc định):

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
eas build --platform android
```

Đăng nhập Expo/EAS là bước thủ công; repository không chứa credential Expo.

## Kiểm thử

```bash
# Backend
cd services/api
ruff check .
pytest --cov=app

# Web và mobile
cd ../..
npm run typecheck
npm test
npm run lint -w @campuscare/admin-web
npm run build -w @campuscare/admin-web
npm run build:web -w @campuscare/mobile

# Hạ tầng và smoke test
docker compose config
docker compose up --build -d
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
powershell -ExecutionPolicy Bypass -File scripts/integration-test.ps1
```

Kết quả đã thực sự chạy trong môi trường phát triển hiện tại nằm ở
`docs/TEST_REPORT.md`.

## Bảo mật chính

- Argon2 hash mật khẩu; access token 15 phút; refresh token rotation và thu hồi.
- RBAC tại dependency/endpoint; sinh viên chỉ xem sự cố của chính mình, nhân viên
  chỉ xem nhiệm vụ được giao.
- Kiểm tra quyền trước khi xem ảnh; tên object ảnh do server sinh UUID.
- Chỉ nhận JPEG/PNG/WebP hợp lệ, tối đa 8 MB; rate limit đăng nhập và upload.
- Audit log cho xác thực, người dùng, địa điểm, danh mục và nghiệp vụ sự cố.
- PostgreSQL, Redis và MinIO chỉ nằm trong network nội bộ, không publish cổng.
- Nginx áp security headers, giới hạn request và proxy WebSocket.

## Hạn chế MVP

- Rate limiter hiện theo từng process API; khi scale nhiều replica cần chuyển bộ
  đếm sang Redis.
- WebSocket manager nằm trong bộ nhớ; nhiều replica cần Redis Pub/Sub.
- CSV đã hỗ trợ đầy đủ; xuất `.xlsx` chưa có vì CSV mở trực tiếp được bằng Excel.
- Chưa có push notification (đã tách abstraction thông báo để bổ sung sau).
- Map phụ thuộc tile công khai của OpenStreetMap; khi lỗi giao diện chuyển sang
  danh sách tọa độ. Production lưu lượng lớn nên dùng tile provider phù hợp policy.
- Admin bundle còn lớn; có thể tách route/map/chart bằng dynamic import sau MVP.
- `npm audit` còn 11 cảnh báo mức vừa trong chuỗi Expo CLI (`uuid`/`xcode`);
  không còn cảnh báo high/critical sau `npm audit fix`. Bản sửa còn lại yêu cầu
  thay đổi breaking nên chưa áp dụng cho MVP đã kiểm chứng với Expo SDK 57.
