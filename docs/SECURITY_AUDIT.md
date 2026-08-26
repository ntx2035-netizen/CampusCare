# Rà soát bảo mật CampusCare

Ngày rà soát gần nhất: **25/08/2026**. Phạm vi gồm backend FastAPI, Admin Web,
Mobile/Expo Web, Nginx, Docker Compose, dependency Python/Node và kiểm thử API
qua `http://localhost`. Không xóa hoặc reset volume trong quá trình kiểm tra.

## Kết quả đã xử lý

| Mức độ | Phát hiện | Cách xử lý |
|---|---|---|
| Cao | Dependency xử lý JWT, multipart và ảnh có CVE đã biết | Nâng FastAPI `0.141.1`, Starlette `1.6.0`, Pillow `12.3.0`, PyJWT `2.13.0`, python-multipart `0.0.32`; `pip-audit` không còn CVE đã biết |
| Cao | Sự kiện WebSocket được phát cho mọi người dùng, làm lộ metadata sự cố | Chỉ phát cho Admin/Dispatcher, người báo và nhân viên được giao |
| Cao | Production vẫn có thể dùng secret/seed demo | `compose.prod.yaml` bắt buộc secret; `SEED_DEMO=false`; API từ chối secret yếu khi `ENVIRONMENT=production` |
| Trung bình | CSV có thể bị bảng tính diễn giải thành công thức | Trung hòa ô bắt đầu bằng `=`, `+`, `-`, `@` |
| Trung bình | Ảnh nén nhỏ nhưng độ phân giải cực lớn có thể gây quá tải | Giới hạn 25 triệu pixel bên cạnh giới hạn 8 MB và kiểm tra định dạng thật |
| Trung bình | Client giả `X-Forwarded-For` để né rate-limit | Nginx ghi đè IP; backend chỉ đọc `X-Real-IP` hợp lệ |
| Trung bình | Hai cổng web gây cấu hình bảo mật không đồng nhất | Chỉ publish Nginx cổng 80; mọi vai trò dùng chung security headers/rate-limit |
| Trung bình | Điều phối viên có thể liệt kê toàn bộ tài khoản | Chỉ cho Dispatcher xem danh sách STAFF; trang quản lý người dùng chỉ dành cho Admin |
| Thấp | Admin có thể tự hạ quyền và làm mất quyền quản trị | Chặn tự hạ vai trò hoặc tự khóa |
| Thấp | Mã sự cố dùng phép đếm có thể trùng khi hai request đồng thời | Dùng hậu tố UUID ngẫu nhiên |
| Thấp | Form đăng nhập điền sẵn mật khẩu demo | Bỏ toàn bộ giá trị đăng nhập mặc định khỏi Admin/Mobile |
| Thấp | Docker backend đọc nhầm cache do build context con | Thêm `services/api/.dockerignore` |

## Bằng chứng kiểm thử thực tế

- Ruff: đạt.
- Pytest backend: **13/13 đạt**, chạy cả trên Windows virtualenv và trong image Docker.
- Admin/Mobile: typecheck đạt; ESLint đạt; **12/12 test đạt**.
- Admin production build và Expo Web export 20 route: đạt.
- `pip-audit --skip-editable`: **không còn lỗ hổng đã biết** trong dependency Python.
- `npm audit --omit=dev`: 0 critical, 0 high, 11 moderate thuộc chuỗi Expo CLI/config.
- 7/7 container healthy sau rebuild.
- Smoke test và integration test qua Nginx: đạt, gồm WebSocket, IDOR,
  idempotency, upload/download, phân công, timeline và notification.
- CORS origin ngoài danh sách: HTTP 400, không có `Access-Control-Allow-Origin`.
- API `/users` không token: HTTP 401.
- Rate-limit đăng nhập: `401,401,401,401,401,401,429`.
- Admin và Mobile Web đều có CSP, `X-Frame-Options` và `nosniff`.

## Rủi ro/hạn chế còn lại

1. **Đăng ký email trường chưa xác minh quyền sở hữu hộp thư.** Hệ thống chỉ
   kiểm tra miền `SCHOOL_EMAIL_DOMAINS`. Bản production nên tích hợp SMTP/SSO
   của trường và OTP hoặc liên kết xác minh có hạn dùng.
2. Access/refresh token của web đang nằm trong localStorage; mobile dùng
   AsyncStorage. CSP giảm nguy cơ XSS nhưng production nên dùng HttpOnly cookie
   cho web và SecureStore/Keychain/Keystore cho mobile.
3. Rate limiter backend là bộ nhớ của một process. Nginx đã giới hạn request,
   nhưng khi scale nhiều gateway/API replica nên chuyển bộ đếm sang Redis.
4. `npm audit` còn 11 cảnh báo moderate trong tooling Expo. npm đề xuất hạ xuống
   Expo 46 hoặc thay đổi major không tương thích SDK 57, vì vậy không tự động
   `npm audit fix --force`; đánh giá lại khi Expo phát hành bộ dependency tương thích.
5. Local demo dùng HTTP. VPS production phải đặt HTTPS/TLS trước Nginx.
6. Strix CLI đã cài nhưng chưa chạy vì môi trường chưa có `STRIX_LLM` và
   `LLM_API_KEY`. Không có kết quả Strix không đồng nghĩa không còn lỗ hổng.
