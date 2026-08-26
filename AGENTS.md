# Hướng dẫn làm việc trong repository

- Giao diện và thông báo dành cho người dùng phải dùng tiếng Việt.
- Không đưa secret thật vào mã nguồn; mọi cấu hình đi qua biến môi trường.
- Backend bắt buộc kiểm tra RBAC và quyền sở hữu, không chỉ dựa vào frontend.
- Mỗi thay đổi nghiệp vụ sự cố phải ghi timeline; hành động nhạy cảm phải audit.
- Chạy kiểm thử/typecheck/build tương ứng trước khi cập nhật báo cáo kiểm thử.
- Không chỉnh sửa migration đã được phát hành; tạo migration mới khi schema đổi.

