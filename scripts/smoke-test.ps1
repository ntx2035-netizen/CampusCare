param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "ntx2035@gmail.com",
  [string]$AdminPassword = $env:DEMO_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod -Uri "$BaseUrl/health"
if ($health.status -ne "healthy") { throw "API chưa healthy" }

if (-not $AdminPassword -and (Test-Path -LiteralPath ".env")) {
  $secretLine = Get-Content -LiteralPath ".env" |
    Where-Object { $_ -match '^DEMO_ADMIN_PASSWORD=' } |
    Select-Object -First 1
  if ($secretLine) { $AdminPassword = ($secretLine -split '=', 2)[1] }
}
if (-not $AdminPassword) {
  throw "Thiếu DEMO_ADMIN_PASSWORD. Hãy đặt trong .env hoặc truyền tham số AdminPassword."
}

$adminBody = @{
  email = $AdminEmail
  password = $AdminPassword
} | ConvertTo-Json
$adminSession = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body $adminBody
$adminHeaders = @{ Authorization = "Bearer $($adminSession.access_token)" }

$suffix = ([guid]::NewGuid().ToString("N")).Substring(0, 10)
$studentPassword = "SmokeTest@2026!"
$studentEmail = "smoke.$suffix@ictu.edu.vn"
$studentBody = @{
  email = $studentEmail
  full_name = "Sinh viên Smoke Test"
  password = $studentPassword
  role = "STUDENT"
  account_type = "STUDENT"
} | ConvertTo-Json
$null = Invoke-RestMethod -Method Post -Uri "$BaseUrl/users" -Headers $adminHeaders -ContentType "application/json" -Body $studentBody
$loginBody = @{ email = $studentEmail; password = $studentPassword } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($session.access_token)" }

$categories = Invoke-RestMethod -Uri "$BaseUrl/categories" -Headers $headers
$locations = Invoke-RestMethod -Uri "$BaseUrl/locations" -Headers $headers
$room = $locations | Where-Object { $_.kind -eq "ROOM" } | Select-Object -First 1
if (-not $categories -or -not $room) { throw "Seed thiếu category hoặc room" }

$incidentBody = @{
  title = "Smoke test CampusCare"
  description = "Báo cáo được tạo tự động để kiểm tra API qua Nginx."
  category_id = $categories[0].id
  priority = "LOW"
  location_id = $room.id
  idempotency_key = "smoke-$([guid]::NewGuid())"
} | ConvertTo-Json
$incidentBytes = [System.Text.Encoding]::UTF8.GetBytes($incidentBody)
$incident = Invoke-RestMethod -Method Post -Uri "$BaseUrl/incidents" -Headers $headers -ContentType "application/json; charset=utf-8" -Body $incidentBytes
if ($incident.status -ne "NEW") { throw "Incident smoke test không ở trạng thái NEW" }

Write-Host "PASS health/login/seed/create: $($incident.code)" -ForegroundColor Green
