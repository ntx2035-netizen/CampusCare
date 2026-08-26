# Kịch bản demo CampusCare (10–15 phút)

## Chuẩn bị (trước buổi demo)

```bash
docker compose up --build -d
docker compose ps
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

Trước buổi demo, đăng ký tài khoản sinh viên bằng email ICTU; đăng ký kỹ thuật viên
và điều phối bằng Gmail rồi dùng ADMIN duyệt. Mở ba phiên trình duyệt cùng một URL
`http://localhost` (cửa sổ thường và hai cửa sổ riêng tư), mỗi phiên đăng nhập một
vai trò. Có thể thay phiên sinh viên/kỹ thuật viên bằng ứng dụng trên điện thoại.

## 1. Giới thiệu và dashboard (2 phút)

1. Nêu bài toán: báo sai kênh, thiếu vị trí, khó theo dõi trách nhiệm và SLA.
2. Trên dashboard Dispatcher, chỉ ra tổng số, tình trạng, khẩn cấp, SLA, biểu đồ
   workload và danh sách tự cập nhật.
3. Mở bản đồ; giải thích marker đỏ cho khẩn cấp và fallback danh sách tọa độ khi
   OpenStreetMap không tải được.

## 2. Sinh viên gửi báo cáo (3 phút)

1. Phiên sinh viên hoặc ứng dụng → **Báo sự cố**.
2. Nhập “Ổ cắm phòng A101 phát tia lửa”, mô tả ít nhất 10 ký tự, chọn loại điện,
   mức **Khẩn cấp**, phòng A101.
3. Chụp/chọn ảnh. Nếu demo trên web, dùng file ảnh JPEG nhỏ.
4. Nhấn **Gửi báo cáo**; chỉ ra UUID idempotency và hàng đợi offline.
5. Tùy chọn offline: tắt Network trong DevTools, tạo báo cáo thứ hai, thấy
   **Chờ đồng bộ**, bật lại mạng và nhấn thử đồng bộ.

## 3. Realtime và điều phối (3 phút)

1. Không refresh admin web; sự cố mới xuất hiện nhờ WebSocket invalidation.
2. Mở chi tiết, xem nội dung, vị trí, ảnh, SLA và timeline `NEW`.
3. Nhấn **Tiếp nhận** (`NEW → ACCEPTED`).
4. Chọn Staff 1 và **Phân công** (`ACCEPTED → ASSIGNED`).
5. Chuyển sang cửa sổ Staff; thông báo/nhiệm vụ xuất hiện.

## 4. Nhân viên xử lý (3 phút)

1. Staff mở nhiệm vụ, chụp ảnh **trước xử lý**.
2. Nhấn **Bắt đầu xử lý** (`ASSIGNED → IN_PROGRESS`).
3. Nhập “Đã ngắt nguồn, thay ổ cắm đạt chuẩn và kiểm tra an toàn.”, chụp ảnh
   **sau xử lý**, nhấn hoàn tất (`IN_PROGRESS → RESOLVED`).
4. Quay lại Dispatcher để xem timeline/ảnh cập nhật không cần tải lại.

## 5. Sinh viên xác nhận và báo cáo (2 phút)

1. Mobile Student mở sự cố, xem trạng thái **Đã xử lý** và nội dung giải quyết.
2. Nhấn **Đánh giá 5 sao và đóng** (`RESOLVED → CLOSED`).
3. Dispatcher mở **Thống kê**, chỉ ra số theo loại/trạng thái, thời gian trung bình,
   tỷ lệ SLA/workload; tải CSV.
4. Admin mở Audit log để chứng minh dấu vết hành động.

## 6. Bảo mật và kết luận (1–2 phút)

- Thử Student truy cập `/api/users`: API trả 403.
- Giải thích sinh viên khác nhận 404 khi đoán incident ID (chống IDOR).
- Nêu refresh rotation, Argon2, file validation, MinIO private, Docker volumes.
- Kết thúc bằng hướng phát triển: Redis Pub/Sub, push, SSO và observability.
