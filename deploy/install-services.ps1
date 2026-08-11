# ── Install POR1 proxy + frontend as Windows Services (NSSM) ──
# Run ONCE in an ELEVATED PowerShell window (Run as Administrator):
#   .\deploy\install-services.ps1
#
# After this, both services start automatically at boot and restart on crash.
# You never need to run start-runtime.ps1 again.

#Requires -RunAsAdministrator

param(
    [string]$FrontendDir = "C:\Users\jborremans\Desktop\por1-frontend",
    [string]$ProxyDir    = "C:\Users\jborremans\Desktop\POR1",
    [int]$FrontendPort   = 8082,
    [int]$ProxyPort      = 3001,
    [string]$NssmDir     = "C:\nssm"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== POR1 Windows Service Installer ===`n" -ForegroundColor Cyan

# ── 1. Get NSSM ──
$nssm = Join-Path $NssmDir "nssm.exe"
if (-not (Test-Path $nssm)) {
    Write-Host "[1/5] Downloading NSSM..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $NssmDir | Out-Null
    $zip = Join-Path $env:TEMP "nssm.zip"
    Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $env:TEMP\nssm-extract -Force
    Copy-Item "$env:TEMP\nssm-extract\nssm-2.24\win64\nssm.exe" $nssm -Force
    Remove-Item $zip -Force
} else {
    Write-Host "[1/5] NSSM already present." -ForegroundColor Green
}

# ── 2. Resolve node / npx paths ──
Write-Host "[2/5] Locating Node.js..." -ForegroundColor Yellow
$node = (Get-Command node).Source
$npx  = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { $npx = (Get-Command npx).Source }
Write-Host "  node: $node"
Write-Host "  npx:  $npx"

# ── 3. Remove any existing services ──
Write-Host "[3/5] Removing existing services (if any)..." -ForegroundColor Yellow
foreach ($svc in @("POR1Proxy", "POR1Frontend")) {
    if (Get-Service -Name $svc -ErrorAction SilentlyContinue) {
        & $nssm stop $svc | Out-Null
        & $nssm remove $svc confirm | Out-Null
        Write-Host "  Removed $svc"
    }
}
Start-Sleep -Seconds 2

# ── 4. Install proxy service (port 3001) ──
Write-Host "[4/5] Installing POR1Proxy (port $ProxyPort)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$ProxyDir\logs" | Out-Null
& $nssm install POR1Proxy $node "server.js"
& $nssm set POR1Proxy AppDirectory $ProxyDir
& $nssm set POR1Proxy DisplayName "POR1 SAP Proxy (3001)"
& $nssm set POR1Proxy Description "Node proxy bridging POR1 frontend to SAP Business One"
& $nssm set POR1Proxy Start SERVICE_AUTO_START
& $nssm set POR1Proxy AppStdout "$ProxyDir\logs\proxy.log"
& $nssm set POR1Proxy AppStderr "$ProxyDir\logs\proxy-error.log"
& $nssm set POR1Proxy AppRotateFiles 1
& $nssm set POR1Proxy AppRotateBytes 10485760
& $nssm set POR1Proxy AppExit Default Restart
& $nssm set POR1Proxy AppRestartDelay 5000
& $nssm start POR1Proxy

# ── 5. Install frontend service (port 8082) ──
Write-Host "[5/5] Installing POR1Frontend (port $FrontendPort)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$FrontendDir\logs" | Out-Null
& $nssm install POR1Frontend $npx "http-server ./dist -p $FrontendPort -c-1 --cors"
& $nssm set POR1Frontend AppDirectory $FrontendDir
& $nssm set POR1Frontend DisplayName "POR1 Frontend (8082)"
& $nssm set POR1Frontend Description "Static http-server serving the POR1 Delivery Date Mass Updater"
& $nssm set POR1Frontend Start SERVICE_AUTO_START
& $nssm set POR1Frontend AppStdout "$FrontendDir\logs\frontend.log"
& $nssm set POR1Frontend AppStderr "$FrontendDir\logs\frontend-error.log"
& $nssm set POR1Frontend AppRotateFiles 1
& $nssm set POR1Frontend AppRotateBytes 10485760
& $nssm set POR1Frontend AppExit Default Restart
& $nssm set POR1Frontend AppRestartDelay 5000
& $nssm start POR1Frontend

Start-Sleep -Seconds 3

# ── Firewall rules ──
foreach ($p in @($ProxyPort, $FrontendPort)) {
    if (-not (Get-NetFirewallRule -DisplayName "POR1 $p" -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName "POR1 $p" -Direction Inbound -LocalPort $p -Protocol TCP -Action Allow | Out-Null
        Write-Host "  Firewall rule added for port $p" -ForegroundColor Green
    }
}

Write-Host "`n=== Status ===" -ForegroundColor Cyan
Get-Service POR1Proxy, POR1Frontend | Format-Table Name, Status, StartType -AutoSize

Write-Host "Frontend: http://10.1.0.88:$FrontendPort" -ForegroundColor Green
Write-Host "Proxy:    http://10.1.0.88:$ProxyPort/api/health" -ForegroundColor Green
Write-Host "`nBoth services now start automatically at boot and restart on crash.`n" -ForegroundColor Green
