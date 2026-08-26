param([switch]$Yes)

$ErrorActionPreference = "Stop"

if (-not $Yes) {
  $answer = Read-Host "Gõ XOA DU LIEU để xác nhận xóa mọi sự cố và tài khoản không phải ADMIN"
  if ($answer -ne "XOA DU LIEU") {
    Write-Host "Đã hủy, không có dữ liệu nào bị xóa." -ForegroundColor Yellow
    exit 0
  }
}

docker compose exec -T `
  -e CONFIRM_RESET_DATA=DELETE_ALL_NON_ADMIN_DATA `
  api python -m app.cleanup_data

Write-Host "Đã giữ lại ADMIN, danh mục sự cố và địa điểm nền." -ForegroundColor Green
