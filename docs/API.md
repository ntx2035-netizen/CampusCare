# Tài liệu API CampusCare

Base URL qua Nginx: `/api`. Swagger: `/api/docs`. Tất cả endpoint ngoài login,
refresh và health yêu cầu header `Authorization: Bearer <access_token>`.

## Xác thực

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register/request-otp` | Yêu cầu OTP: sinh viên/giảng viên dùng email ICTU; kỹ thuật viên/điều phối dùng Gmail |
| POST | `/auth/register/verify-otp` | Xác minh OTP; sinh viên/giảng viên hoạt động ngay, kỹ thuật viên/điều phối chờ ADMIN duyệt |
| POST | `/auth/login` | Đăng nhập, trả access + refresh token và user |
| POST | `/auth/refresh` | Rotate refresh token và cấp cặp token mới |
| POST | `/auth/logout` | Thu hồi refresh token |
| GET/PATCH | `/auth/me` | Xem/cập nhật hồ sơ |
| POST | `/auth/change-password` | Đổi mật khẩu, thu hồi toàn bộ refresh token |

## Người dùng

- `GET /users?role=STAFF&active=true`: Admin/Dispatcher.
- `POST /users`: Admin tạo tài khoản.
- `PATCH /users/{id}`: ADMIN duyệt tài khoản nghiệp vụ, sửa thông tin, khóa/mở khóa.
- Không endpoint công khai nào được tạo thêm ADMIN; hệ thống chỉ dùng tài khoản bootstrap.

## Địa điểm và danh mục

- `GET /locations`: danh sách hierarchy.
- `POST /locations`, `PATCH /locations/{id}`: Admin.
- `GET /locations/resolve/{qr_token}`: giải mã QR đã xác thực.
- `GET /locations/{id}/qr`: Admin/Dispatcher tải PNG QR.
- `GET /categories`: danh mục đang hoạt động.
- `POST /categories`, `PATCH /categories/{id}`: Admin.

Hierarchy hợp lệ: `AREA → BUILDING → FLOOR → ROOM`. Backend kiểm tra loại parent,
không chỉ tin dữ liệu từ giao diện.

## Sự cố

### Tạo báo cáo

`POST /incidents`

```json
{
  "title": "Máy chiếu không hoạt động",
  "description": "Máy chiếu phòng A101 không thể bật dù đã kiểm tra nguồn.",
  "category_id": "UUID",
  "priority": "HIGH",
  "location_id": "UUID",
  "idempotency_key": "UUID-sinh-phía-client"
}
```

Có thể bỏ `location_id` nếu gửi đủ `latitude` và `longitude`. Cùng reporter và
idempotency key luôn trả cùng một incident, tránh trùng do offline retry.

### Truy vấn và nghiệp vụ

| Method | Endpoint | Quyền/ý nghĩa |
|---|---|---|
| GET | `/incidents` | Student: của mình; Staff: được giao; Dispatcher/Admin: toàn bộ |
| GET | `/incidents/{id}` | Áp cùng rule sở hữu, trả timeline + metadata ảnh |
| PATCH | `/incidents/{id}/status` | Chuyển trạng thái qua state machine |
| POST | `/incidents/{id}/assign` | Dispatcher/Admin phân công Staff |
| POST | `/incidents/{id}/feedback` | Student sở hữu đánh giá và đóng sự cố |
| POST | `/incidents/{id}/images` | Multipart `kind`, `file`; tối đa 8 MB |
| GET | `/incidents/{id}/images/{image_id}` | Stream ảnh sau kiểm tra quyền |

`kind`: `REPORT`, `BEFORE`, `AFTER`. MIME được hỗ trợ: `image/jpeg`, `image/png`,
`image/webp`; server còn decode ảnh để chống file giả MIME.

## Thông báo và realtime

- `GET /notifications`
- `PATCH /notifications/{id}/read`
- `POST /notifications/read-all`
- WebSocket `/api/ws`, gửi subprotocol `campuscare` và access token; token không
  nằm trong URL/access log.

Sự kiện WebSocket:

```json
{ "event": "incident.updated", "incident_id": "UUID", "status": "RESOLVED" }
```

Client phải coi đây là tín hiệu invalidation và đọc lại REST API; không coi payload
WebSocket là nguồn dữ liệu đầy đủ.

## Báo cáo và audit

- `GET /reports/summary`: Admin/Dispatcher; tổng số, theo trạng thái/loại, thời gian
  xử lý trung bình, SLA và workload.
- `GET /reports/incidents.csv`: UTF-8 BOM để mở đúng tiếng Việt trong Excel.
- `GET /audit-logs`: chỉ Admin.

## Mã lỗi chính

- `401`: chưa đăng nhập/token hết hạn.
- `403`: role không phù hợp.
- `404`: tài nguyên không tồn tại hoặc bị che để chống IDOR.
- `409`: email/mã trùng hoặc chuyển trạng thái không hợp lệ.
- `413`/`415`: ảnh quá lớn/sai định dạng.
- `422`: validation Pydantic/nghiệp vụ.
- `429`: vượt rate limit.
