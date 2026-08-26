param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "ntx2035@gmail.com",
  [string]$AdminPassword = $env:DEMO_ADMIN_PASSWORD
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
$origin = ([Uri]$BaseUrl).GetLeftPart([System.UriPartial]::Authority)

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [string]$Token,
    $Body = $null
  )

  $headers = @{}
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $parameters = @{
    Method = $Method
    Uri = $Uri
    Headers = $headers
  }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 8
    $parameters.ContentType = "application/json; charset=utf-8"
    $parameters.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
  }
  Invoke-RestMethod @parameters
}

function Login {
  param([string]$Email, [string]$Password)
  Invoke-Json -Method Post -Uri "$BaseUrl/auth/login" -Body @{
    email = $Email
    password = $Password
  }
}

function Create-TestUser {
  param(
    [string]$Token,
    [string]$Prefix,
    [string]$Domain,
    [string]$Role,
    [string]$AccountType,
    [string]$Password
  )
  $suffix = ([guid]::NewGuid().ToString("N")).Substring(0, 10)
  $email = "$Prefix.$suffix@$Domain"
  $null = Invoke-Json -Method Post -Uri "$BaseUrl/users" -Token $Token -Body @{
    email = $email
    full_name = "Tài khoản kiểm thử $Prefix"
    password = $Password
    role = $Role
    account_type = $AccountType
  }
  Login $email $Password
}

function Get-AuthorizedBytes {
  param([string]$Uri, [string]$Token)
  $client = [System.Net.Http.HttpClient]::new()
  try {
    $client.DefaultRequestHeaders.Authorization =
      [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
    $response = $client.GetAsync($Uri).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode() | Out-Null
    $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  } finally {
    $client.Dispose()
  }
}

function Upload-Image {
  param(
    [string]$IncidentId,
    [string]$Token,
    [string]$Kind,
    [byte[]]$Bytes
  )
  $client = [System.Net.Http.HttpClient]::new()
  $form = [System.Net.Http.MultipartFormDataContent]::new()
  try {
    $client.DefaultRequestHeaders.Authorization =
      [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
    $form.Add([System.Net.Http.StringContent]::new($Kind), "kind")
    $file = [System.Net.Http.ByteArrayContent]::new($Bytes)
    $file.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new("image/png")
    $form.Add($file, "file", "campuscare-integration.png")
    $response = $client.PostAsync(
      "$BaseUrl/incidents/$IncidentId/images",
      $form
    ).GetAwaiter().GetResult()
    $response.EnsureSuccessStatusCode() | Out-Null
    $json = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $json | ConvertFrom-Json
  } finally {
    $form.Dispose()
    $client.Dispose()
  }
}

$health = Invoke-Json -Method Get -Uri "$BaseUrl/health"
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

$admin = Login $AdminEmail $AdminPassword
$student = Create-TestUser $admin.access_token "student" "ictu.edu.vn" "STUDENT" "STUDENT" "StudentTest@2026!"
$otherStudent = Create-TestUser $admin.access_token "student.other" "ictu.edu.vn" "STUDENT" "STUDENT" "StudentTest@2026!"
$dispatcher = Create-TestUser $admin.access_token "dispatcher" "gmail.com" "DISPATCHER" "DISPATCHER" "DispatchTest@2026!"
$staff = Create-TestUser $admin.access_token "staff" "gmail.com" "STAFF" "STAFF" "StaffTest@2026!"

$staffProfile = Invoke-Json -Method Get -Uri "$BaseUrl/auth/me" -Token $staff.access_token
$categories = Invoke-Json -Method Get -Uri "$BaseUrl/categories" -Token $student.access_token
$locations = Invoke-Json -Method Get -Uri "$BaseUrl/locations" -Token $student.access_token
$room = $locations | Where-Object { $_.kind -eq "ROOM" } | Select-Object -First 1
if (-not $categories -or -not $room) { throw "Seed thiếu category hoặc room" }

# Mở WebSocket trước khi tạo sự cố để kiểm tra event đến mà không tải lại trang.
$wsUrl = "$($BaseUrl -replace '^http', 'ws')/ws"
$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$socket.Options.AddSubProtocol("campuscare")
$socket.Options.AddSubProtocol($dispatcher.access_token)
$socket.ConnectAsync(
  [Uri]$wsUrl,
  [System.Threading.CancellationToken]::None
).GetAwaiter().GetResult() | Out-Null
$handshakeBuffer = [byte[]]::new(1024)
$handshakeSegment = [System.ArraySegment[byte]]::new($handshakeBuffer)
$handshakeTimeout = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(5))
$handshakeResult = $socket.ReceiveAsync(
  $handshakeSegment,
  $handshakeTimeout.Token
).GetAwaiter().GetResult()
$handshakeJson = [System.Text.Encoding]::UTF8.GetString(
  $handshakeBuffer,
  0,
  $handshakeResult.Count
)
$handshake = $handshakeJson | ConvertFrom-Json
if ($handshake.event -ne "connected") { throw "WebSocket handshake không hợp lệ" }
$handshakeTimeout.Dispose()
$buffer = [byte[]]::new(8192)
$segment = [System.ArraySegment[byte]]::new($buffer)
$timeout = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(15))
$receiveTask = $socket.ReceiveAsync($segment, $timeout.Token)

$key = "integration-$([guid]::NewGuid())"
$incidentBody = @{
  title = "Kiểm thử tích hợp CampusCare"
  description = "Sự cố được tạo tự động để kiểm tra đầy đủ luồng xử lý thực tế."
  category_id = $categories[0].id
  priority = "HIGH"
  location_id = $room.id
  idempotency_key = $key
}
$incident = Invoke-Json -Method Post -Uri "$BaseUrl/incidents" `
  -Token $student.access_token -Body $incidentBody
$duplicate = Invoke-Json -Method Post -Uri "$BaseUrl/incidents" `
  -Token $student.access_token -Body $incidentBody
if ($duplicate.id -ne $incident.id) { throw "Idempotency không hoạt động" }

$receive = $receiveTask.GetAwaiter().GetResult()
$eventJson = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $receive.Count)
$event = $eventJson | ConvertFrom-Json
if (
  [string]$event.event -ne "incident.created" -or
  [string]$event.incident_id -ne [string]$incident.id
) {
  throw "WebSocket event không đúng: $eventJson; incident=$($incident.id)"
}
$socket.CloseAsync(
  [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
  "Đã kiểm tra",
  [System.Threading.CancellationToken]::None
).GetAwaiter().GetResult() | Out-Null
$timeout.Dispose()
$socket.Dispose()

# Lấy QR thật làm ảnh PNG hợp lệ rồi kiểm tra upload/download có xác thực.
$png = Get-AuthorizedBytes -Uri "$BaseUrl/locations/$($room.id)/qr" `
  -Token $dispatcher.access_token
$reportImage = Upload-Image -IncidentId $incident.id -Token $student.access_token `
  -Kind "REPORT" -Bytes $png
$downloaded = Get-AuthorizedBytes -Uri "$origin$($reportImage.url)" `
  -Token $student.access_token
if ($downloaded.Length -ne $png.Length) { throw "Ảnh tải xuống không khớp ảnh đã tải lên" }

$null = Invoke-Json -Method Patch -Uri "$BaseUrl/incidents/$($incident.id)/status" `
  -Token $dispatcher.access_token -Body @{
    status = "ACCEPTED"
    note = "Đã xác minh thông tin tích hợp"
  }
$assigned = Invoke-Json -Method Post -Uri "$BaseUrl/incidents/$($incident.id)/assign" `
  -Token $dispatcher.access_token -Body @{
    staff_id = $staffProfile.id
    note = "Phân công tự động trong bài kiểm thử"
  }
if ($assigned.status -ne "ASSIGNED") { throw "Phân công không thành công" }

$null = Upload-Image -IncidentId $incident.id -Token $staff.access_token `
  -Kind "BEFORE" -Bytes $png
$null = Invoke-Json -Method Patch -Uri "$BaseUrl/incidents/$($incident.id)/status" `
  -Token $staff.access_token -Body @{
    status = "IN_PROGRESS"
    note = "Nhân viên đã có mặt tại địa điểm"
  }
$resolved = Invoke-Json -Method Patch -Uri "$BaseUrl/incidents/$($incident.id)/status" `
  -Token $staff.access_token -Body @{
    status = "RESOLVED"
    resolution = "Đã kiểm tra, thay thế thiết bị hỏng và xác nhận hoạt động ổn định."
  }
$null = Upload-Image -IncidentId $incident.id -Token $staff.access_token `
  -Kind "AFTER" -Bytes $png
if ($resolved.status -ne "RESOLVED" -or $resolved.histories.Count -ne 5) {
  throw "Timeline hoặc trạng thái RESOLVED không đúng"
}

$studentView = Invoke-Json -Method Get -Uri "$BaseUrl/incidents/$($incident.id)" `
  -Token $student.access_token
if ($studentView.status -ne "RESOLVED") { throw "Sinh viên chưa thấy trạng thái mới" }

try {
  $null = Invoke-Json -Method Get -Uri "$BaseUrl/incidents/$($incident.id)" `
    -Token $otherStudent.access_token
  throw "IDOR: sinh viên khác đọc được sự cố"
} catch {
  if ($_.Exception.Message -eq "IDOR: sinh viên khác đọc được sự cố") { throw }
  $statusCode = [int]$_.Exception.Response.StatusCode
  if ($statusCode -ne 404) { throw }
}

$closed = Invoke-Json -Method Post -Uri "$BaseUrl/incidents/$($incident.id)/feedback" `
  -Token $student.access_token -Body @{
    rating = 5
    feedback = "Kết quả xử lý đạt yêu cầu."
  }
if ($closed.status -ne "CLOSED" -or $closed.histories.Count -ne 6) {
  throw "Đóng sự cố hoặc timeline cuối không đúng"
}

$summary = Invoke-Json -Method Get -Uri "$BaseUrl/reports/summary" -Token $admin.access_token
$audits = Invoke-Json -Method Get -Uri "$BaseUrl/audit-logs" -Token $admin.access_token
$notifications = Invoke-Json -Method Get -Uri "$BaseUrl/notifications" `
  -Token $student.access_token
if ($summary.total -lt 1 -or $audits.Count -lt 1 -or $notifications.Count -lt 1) {
  throw "Báo cáo, audit hoặc notification chưa có dữ liệu"
}

$successMessage = (
  "PASS integration: {0}; WebSocket; idempotency; upload/download; " +
  "accept/assign/progress/resolve/close; IDOR; report/audit/notification"
) -f $incident.code
Write-Host $successMessage -ForegroundColor Green
