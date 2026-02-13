# POR1 App Server - PowerShell Script
# Run this script on the production server to serve the app via HTTP

param(
    [int]$Port = 8080,
    [string]$DistPath = ".\dist"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POR1 ShipDate Updater - Local Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if dist folder exists
if (-not (Test-Path $DistPath)) {
    Write-Host "ERROR: '$DistPath' folder not found!" -ForegroundColor Red
    Write-Host "Make sure you have run 'npm run build' first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting HTTP server..." -ForegroundColor Green
Write-Host "App will be available at: http://10.1.0.88:$Port" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Navigate to dist and start http-server
Set-Location $DistPath
npx http-server -p $Port --cors

# If http-server isn't installed globally, it will be installed automatically
