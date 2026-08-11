# ── POR1 Deploy (service-based) ──
# Use this INSTEAD of start-runtime.ps1 once install-services.ps1 has been run.
# Run in an ELEVATED PowerShell window:
#   .\deploy\deploy-services.ps1

param(
    [string]$FrontendDir = "C:\Users\jborremans\Desktop\por1-frontend",
    [string]$ProxyDir    = "C:\Users\jborremans\Desktop\POR1"
)

$ErrorActionPreference = "Continue"

Write-Host "`n[1/5] Pulling latest code..." -ForegroundColor Yellow
Set-Location $FrontendDir
git pull origin main

Write-Host "`n[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n[3/5] Building frontend..." -ForegroundColor Yellow
npm run build
if (-not (Test-Path "$FrontendDir\dist\index.html")) {
    Write-Host "ERROR: build produced no dist/index.html - aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[4/5] Copying proxy server.js to $ProxyDir..." -ForegroundColor Yellow
Copy-Item "$FrontendDir\deploy\server.js" "$ProxyDir\server.js" -Force

Write-Host "`n[5/5] Restarting services..." -ForegroundColor Yellow
Restart-Service POR1Proxy -Force
Restart-Service POR1Frontend -Force

Start-Sleep -Seconds 3
Get-Service POR1Proxy, POR1Frontend | Format-Table Name, Status, StartType -AutoSize

try {
    $health = Invoke-RestMethod "http://localhost:3001/api/health" -TimeoutSec 10
    Write-Host "Proxy health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "Proxy health check FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDeployment complete - http://10.1.0.88:8082 (hard refresh Ctrl+F5)`n" -ForegroundColor Cyan
