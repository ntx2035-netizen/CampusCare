# Triển khai CampusCare

## Local bằng Docker Compose

```bash
cp .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
curl http://localhost/api/health
```

Không sửa `.env.example` để chứa secret thật. `.env` đã được gitignore.

Kiểm tra tính bền vững:

```bash
docker compose exec postgres psql -U campuscare -d campuscare -c "select count(*) from incidents;"
docker compose restart postgres redis minio api
docker compose exec postgres psql -U campuscare -d campuscare -c "select count(*) from incidents;"
```

Hai số đếm phải bằng nhau. `down` giữ volume; `down -v` xóa dữ liệu.

### Dọn dữ liệu nghiệp vụ development

```powershell
docker compose up --build -d api
powershell -ExecutionPolicy Bypass -File scripts/clear-operational-data.ps1 -Yes
```

Giữ duy nhất ADMIN bootstrap cùng danh mục/địa điểm nền; xóa tài khoản còn lại,
sự cố, timeline, ảnh, thông báo, audit và OTP. Không thể khôi phục nếu chưa backup.

## Ubuntu VPS

### Cấu hình gửi OTP

Development mặc định gửi thư vào Mailpit tại `http://localhost:8025`. Khi triển khai
thật, đặt `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_FROM_EMAIL` và `SMTP_STARTTLS=true`. Nếu dùng Gmail SMTP, `SMTP_PASSWORD`
phải là mật khẩu ứng dụng, không phải mật khẩu đăng nhập Gmail; không commit giá trị
này vào repository. Tài khoản Gmail tự đăng ký loại điều phối hoặc kỹ thuật viên chỉ
được đăng nhập sau khi ADMIN duyệt tại màn hình **Người dùng**.

Trên Windows development có thể cấu hình tương tác bằng:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/configure-gmail-otp.ps1
```

1. Cài Ubuntu 24.04 LTS, Docker Engine và Compose plugin từ repository chính thức.
2. Clone repository vào `/opt/campuscare`; tạo `.env` với quyền `chmod 600`.
3. Sinh secret mạnh, không dùng default:

   ```bash
   openssl rand -base64 48   # JWT_SECRET
   openssl rand -base64 32   # PostgreSQL/MinIO password riêng
   ```

4. Trỏ DNS về VPS. Đặt TLS proxy (Caddy/Traefik hoặc Nginx host) trước service này;
   chỉ publish 80/443 tại firewall.
5. Chạy:

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml config
   docker compose -f compose.yaml -f compose.prod.yaml up --build -d
   docker compose -f compose.yaml -f compose.prod.yaml ps
   ```

6. Đặt `CORS_ORIGINS=https://campuscare.example.edu` và build mobile với
   `EXPO_PUBLIC_API_URL=https://campuscare.example.edu/api`.

PostgreSQL, Redis, MinIO không có `ports` trong Compose, vì vậy không bị công khai.
Không mở 5432/6379/9000 trên security group.

## Reverse proxy và WebSocket

Nginx chuyển nguyên URI `/api/*` sang FastAPI và đặt header Upgrade cho `/api/ws`.
Nếu thêm TLS proxy bên ngoài, proxy đó cũng phải giữ `Upgrade`/`Connection` và tăng
read timeout cho WebSocket.

## Health và vận hành

- `/healthz`: Nginx/admin/mobile container liveness.
- `/api/live`: process API sống, không kiểm tra dependency.
- `/api/health`: PostgreSQL, Redis, MinIO và bucket.
- Log: `docker compose logs -f --tail=200 api nginx`.
- Migration thủ công: `docker compose exec api alembic upgrade head`.
- Seed thủ công: `docker compose exec api python -m app.seed`.

## Rollback và backup

Trước release: backup PostgreSQL + MinIO, tag image/version. Migration mới phải có
downgrade hoặc kế hoạch forward-fix. Không rollback binary qua schema không tương thích.

## Mobile EAS

`eas.json` theo cấu trúc Expo chính thức: preview sinh APK cài trực tiếp,
production sinh AAB mặc định. EAS cần tài khoản Expo và credential cửa hàng; không
được đưa chúng vào repository. iOS build cần tài khoản Apple Developer.
