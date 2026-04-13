# ── POR1 Full Deployment Script ──
# Run from any location on the production server (10.1.0.88)
# PowerShell: .\deploy\deploy-all.ps1

$ErrorActionPreference = "Continue"

$FrontendDir = "C:\Users\jborremans\Desktop\por1-frontend"
$ProxyDir    = "C:\Users\jborremans\Desktop\POR1"
$FrontendPort = 8082
$ProxyPort    = 3001

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  POR1 ShipDate Updater - Full Deploy"
Write-Host "========================================`n" -ForegroundColor Cyan

# ── 1. Pull latest frontend code ──
Write-Host "[1/5] Pulling latest code from GitHub..." -ForegroundColor Yellow
Set-Location $FrontendDir
git pull origin main 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: git pull failed" -ForegroundColor Red; exit 1 }
Write-Host "  Done.`n" -ForegroundColor Green

# ── 2. Install dependencies ──
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed" -ForegroundColor Red; exit 1 }
Write-Host "  Done.`n" -ForegroundColor Green

# ── 3. Build frontend ──
Write-Host "[3/5] Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Build failed" -ForegroundColor Red; exit 1 }
Write-Host "  Done.`n" -ForegroundColor Green

# ── 4. Restart proxy (port 3001) ──
Write-Host "[4/5] Restarting Node.js proxy on port $ProxyPort..." -ForegroundColor Yellow
# Kill existing proxy process on port 3001
$proxyPids = Get-NetTCPConnection -LocalPort $ProxyPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $proxyPids) {
    Write-Host "  Stopping process $pid on port $ProxyPort"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1
# Start proxy in background
Start-Process -FilePath "node" -ArgumentList "$ProxyDir\server.js" -WindowStyle Hidden
Write-Host "  Proxy started.`n" -ForegroundColor Green

# ── 5. Restart frontend server (port 8082) ──
Write-Host "[5/5] Restarting frontend server on port $FrontendPort..." -ForegroundColor Yellow
# Kill existing http-server on port 8082
$frontendPids = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $frontendPids) {
    Write-Host "  Stopping process $pid on port $FrontendPort"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1
# Start frontend in background
Start-Process -FilePath "npx" -ArgumentList "http-server ./dist -p $FrontendPort -c-1" -WorkingDirectory $FrontendDir -WindowStyle Hidden
Write-Host "  Frontend started.`n" -ForegroundColor Green

# ── Done ──
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "  Frontend: http://10.1.0.88:$FrontendPort"
Write-Host "  Proxy:    http://10.1.0.88:$ProxyPort"
Write-Host "========================================`n" -ForegroundColor Cyan
