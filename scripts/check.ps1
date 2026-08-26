$ErrorActionPreference = "Stop"
npm run typecheck
npm test
npm run lint -w @campuscare/admin-web
npm run build -w @campuscare/admin-web
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $PWD ".expo-home"
npm run build:web -w @campuscare/mobile

if (Get-Command python -ErrorAction SilentlyContinue) {
  Push-Location services/api
  try {
    python -m ruff check .
    python -m pytest
  } finally { Pop-Location }
} else {
  Write-Warning "Bỏ qua backend: không tìm thấy Python 3.12."
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose config
} else {
  Write-Warning "Bỏ qua Compose: không tìm thấy Docker."
}

