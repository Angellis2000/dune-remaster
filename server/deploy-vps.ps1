# Выкладка сервера сетевой игры Dune на общий VPS такси (hoster.kz), по правилам docs/SHARED_SERVER_MONACO.md
# проекта такси: свой compose-проект /opt/dune в сети vector_default, свой блок сайта в Caddyfile такси.
# Доступ к VPS — те же локальные файлы, что у deploy-hoster.ps1 такси (ключ, known_hosts, адрес).
param(
    [string]$TaxiRoot = 'D:\TAXI VECTOR 2026'
)
$ErrorActionPreference = 'Stop'
$serverDir = $PSScriptRoot
$credentialFile = Join-Path $TaxiRoot '.env.hoster-vps'
$keyFile = Join-Path $TaxiRoot '.env.hoster-vps.key'
$knownHostsFile = Join-Path $TaxiRoot '.env.hoster-vps.known_hosts'
$taxiCaddyfile = Join-Path $TaxiRoot 'deploy\hoster\Caddyfile'
$duneBlock = Join-Path $serverDir 'Caddyfile.dune'
$publicUrl = 'https://dune.109-235-116-121.sslip.io'

function Get-CredentialSetting([string]$Key) {
    $line = Get-Content -LiteralPath $credentialFile | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -Last 1
    if (-not $line) { throw "В $credentialFile не найден $Key" }
    return $line.Substring($line.IndexOf('=') + 1).Trim()
}
foreach ($required in @($credentialFile, $keyFile, $knownHostsFile, $taxiCaddyfile, $duneBlock)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Не найдено: $required" }
}
$remote = "$(Get-CredentialSetting 'HOSTER_VPS_USER')@$(Get-CredentialSetting 'HOSTER_VPS_HOST')"
$ssh = @('-i', $keyFile, '-o', 'BatchMode=yes', '-o', "UserKnownHostsFile=$knownHostsFile")

# 1. Блок сайта Dune — в Caddyfile такси (иначе следующая выкладка такси его сотрёт), если его там ещё нет.
if (-not (Select-String -LiteralPath $taxiCaddyfile -Pattern 'dune\.109-235-116-121' -Quiet)) {
    Add-Content -LiteralPath $taxiCaddyfile -Value (Get-Content -LiteralPath $duneBlock -Raw) -NoNewline
    Write-Host "Блок Dune добавлен в $taxiCaddyfile"
}

# 2. Файлы сервера → /opt/dune
Write-Host "Копирую сервер на VPS..."
& ssh @ssh $remote 'install -d -m 755 /opt/dune'
if ($LASTEXITCODE -ne 0) { throw "Не удалось подготовить /opt/dune: $LASTEXITCODE" }
$files = @('Dockerfile', 'compose.yml', 'package.json', 'package-lock.json', 'dune-net.mjs', 'Caddyfile.dune') | ForEach-Object { Join-Path $serverDir $_ }
& scp @ssh @files "${remote}:/opt/dune/"
if ($LASTEXITCODE -ne 0) { throw "Не удалось скопировать файлы: $LASTEXITCODE" }

# 3. Контейнер, блок в Caddyfile на сервере и перезагрузка Caddy (такси, касса и Talco продолжают работать)
$remoteCommand = @'
set -e
cd /opt/dune
docker compose up -d --build
CADDYFILE=/opt/vector/deploy/hoster/Caddyfile
if ! grep -q 'dune.109-235-116-121' "$CADDYFILE"; then
  cp "$CADDYFILE" "$CADDYFILE.before-dune"
  cat /opt/dune/Caddyfile.dune >> "$CADDYFILE"
fi
cd /opt/vector/deploy/hoster
docker compose --env-file ../../server/.env exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
docker ps --filter name=dune-net --format '{{.Names}} {{.Status}}'
'@
& ssh @ssh $remote $remoteCommand
if ($LASTEXITCODE -ne 0) { throw "Не удалось запустить dune-net или перезагрузить Caddy: $LASTEXITCODE" }

# 4. Проверка снаружи
for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri "$publicUrl/health" -TimeoutSec 5
        if ($health.status -eq 'ok') { Write-Host "Сервер Dune работает: $publicUrl (комнат: $($health.rooms))"; break }
    } catch {
        if ($attempt -eq 30) { throw "Нет ответа: $publicUrl/health" }
    }
    Start-Sleep -Seconds 2
}
