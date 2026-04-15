# POR1 Runtime Starter

param(
    [int]$FrontendPort = 8082,
    [int]$ProxyPort = 3001,
    [string]$FrontendDir = "C:\Users\jborremans\Desktop\por1-frontend",
    [string]$ProxyDir = "C:\Users\jborremans\Desktop\POR1"
)

$ErrorActionPreference = "Stop"

function Stop-PortProcess {
    param([int]$Port)

    $processIds = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $processIds) {
        if ($processId) {
            Write-Host "Stopping process $processId on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POR1 Runtime Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "$FrontendDir\dist")) {
    Write-Host "ERROR: Frontend build folder not found at $FrontendDir\dist" -ForegroundColor Red
    Write-Host "Run npm run build in the frontend folder first." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "$ProxyDir\server.js")) {
    Write-Host "ERROR: Proxy server.js not found at $ProxyDir" -ForegroundColor Red
    exit 1
}

Stop-PortProcess -Port $ProxyPort
Stop-PortProcess -Port $FrontendPort

Start-Sleep -Seconds 1

Write-Host "Starting proxy on port $ProxyPort..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList @("server.js") -WorkingDirectory $ProxyDir -WindowStyle Hidden

Write-Host "Starting frontend on port $FrontendPort..." -ForegroundColor Green
Start-Process -FilePath "npx" -ArgumentList @("http-server", "./dist", "-p", "$FrontendPort", "-c-1", "--cors") -WorkingDirectory $FrontendDir -WindowStyle Hidden

Write-Host ""
Write-Host "Frontend: http://10.1.0.88:$FrontendPort" -ForegroundColor Cyan
Write-Host "Proxy:    http://10.1.0.88:$ProxyPort/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this any time you want to restart both services together." -ForegroundColor Gray