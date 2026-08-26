$ErrorActionPreference = "Stop"

function Set-EnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $lines = @([System.IO.File]::ReadAllLines($Path))
  $updatedLines = @()
  $found = $false
  $pattern = "^" + [System.Text.RegularExpressions.Regex]::Escape($Name) + "="

  foreach ($line in $lines) {
    if ($line -match $pattern) {
      $updatedLines += "$Name=$Value"
      $found = $true
    }
    else {
      $updatedLines += $line
    }
  }

  if (-not $found) {
    $updatedLines += "$Name=$Value"
  }

  # Keep this script ASCII for Windows PowerShell 5 compatibility.
  # Write .env without a BOM so its first variable remains valid.
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, [string[]]$updatedLines, $utf8WithoutBom)
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
  Copy-Item -LiteralPath ".env.example" -Destination $envPath
}

$gmail = (Read-Host "Sender Gmail address").Trim().ToLowerInvariant()
if ($gmail -notmatch '^[^@\s]+@gmail\.com$') {
  throw "The sender address must end with @gmail.com"
}

$securePassword = Read-Host "Paste the 16-character Google App Password" -AsSecureString
$passwordPointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $appPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer).Replace(" ", "")
}
finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

if ($appPassword.Length -ne 16) {
  throw "The Google App Password must contain exactly 16 characters"
}

Set-EnvValue -Path $envPath -Name "MAIL_TRANSPORT" -Value "smtp"
Set-EnvValue -Path $envPath -Name "SMTP_HOST" -Value "smtp.gmail.com"
Set-EnvValue -Path $envPath -Name "SMTP_PORT" -Value "587"
Set-EnvValue -Path $envPath -Name "SMTP_USERNAME" -Value $gmail
Set-EnvValue -Path $envPath -Name "SMTP_PASSWORD" -Value $appPassword
Set-EnvValue -Path $envPath -Name "SMTP_STARTTLS" -Value "true"
Set-EnvValue -Path $envPath -Name "SMTP_USE_TLS" -Value "false"
Set-EnvValue -Path $envPath -Name "SMTP_FROM_EMAIL" -Value "CampusCare <$gmail>"

$appPassword = $null
$securePassword = $null

Write-Host "Gmail SMTP settings were saved to .env. The password was not printed."
Write-Host "Restarting the API container..."
docker compose up -d --force-recreate api

if ($LASTEXITCODE -ne 0) {
  throw "Docker could not restart the API container"
}

Write-Host "Done. Register a test account, then check the Gmail inbox and Spam folder."
