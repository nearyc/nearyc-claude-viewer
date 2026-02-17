# Claude Viewer - Application Startup Script
# This script starts both the backend and frontend servers

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$Dev,
    [int]$BackendPort = 13927,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

# Colors for output
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

function Write-Info { param([string]$Message) Write-Host $Message -ForegroundColor $ColorInfo }
function Write-Success { param([string]$Message) Write-Host $Message -ForegroundColor $ColorSuccess }
function Write-Warning { param([string]$Message) Write-Host $Message -ForegroundColor $ColorWarning }
function Write-Error { param([string]$Message) Write-Host $Message -ForegroundColor $ColorError }

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Info @"
========================================
  Claude Viewer - Starting Application
========================================
"@

# Step 1: Clear ports (stop existing processes)
Write-Info "`n[Step 1/4] Cleaning up ports..."

$backendConn = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($backendConn) {
    Stop-Process -Id $backendConn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Warning "  Port $BackendPort cleared"
}

$frontendConn = Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | Select-Object -First 1
if ($frontendConn) {
    Stop-Process -Id $frontendConn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Warning "  Port $FrontendPort cleared"
}

Start-Sleep -Seconds 1

# Step 2: Check dependencies
Write-Info "`n[Step 2/4] Checking dependencies..."

if (-not $SkipBackend) {
    if (-not (Test-Path "$ScriptDir\backend\node_modules")) {
        Write-Warning "  Backend dependencies not found. Running npm install..."
        Set-Location "$ScriptDir\backend"
        npm install | Out-Null
        Set-Location $ScriptDir
    }
    Write-Success "  Backend dependencies OK"
}

if (-not $SkipFrontend) {
    if (-not (Test-Path "$ScriptDir\frontend\node_modules")) {
        Write-Warning "  Frontend dependencies not found. Running npm install..."
        Set-Location "$ScriptDir\frontend"
        npm install | Out-Null
        Set-Location $ScriptDir
    }
    Write-Success "  Frontend dependencies OK"
}

# Step 3: Start Backend
$BackendJob = $null
if (-not $SkipBackend) {
    Write-Info "`n[Step 3/4] Starting Backend Server..."
    Write-Info "  Port: $BackendPort"

    $BackendJob = Start-Job -ScriptBlock {
        param($d, $port)
        Set-Location $d
        $env:PORT = $port
        npm run dev
    } -ArgumentList "$ScriptDir\backend", $BackendPort

    # Wait for backend to be ready
    $BackendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $BackendReady = $true
                break
            }
        } catch {}
    }

    if ($BackendReady) {
        Write-Success "  Backend running at http://localhost:$BackendPort"
    } else {
        Write-Warning "  Backend starting..."
    }
}

# Step 4: Start Frontend
$FrontendJob = $null
if (-not $SkipFrontend) {
    Write-Info "`n[Step 4/4] Starting Frontend Server..."
    Write-Info "  Port: $FrontendPort"

    $FrontendJob = Start-Job -ScriptBlock {
        param($d)
        Set-Location $d
        npm run dev
    } -ArgumentList "$ScriptDir\frontend"

    # Wait for frontend to be ready
    $FrontendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $FrontendReady = $true
                break
            }
        } catch {}
    }

    if ($FrontendReady) {
        Write-Success "  Frontend running at http://localhost:$FrontendPort"
    } else {
        Write-Warning "  Frontend starting..."
    }
}

# Display summary and open browser
Write-Info @"

========================================
  Claude Viewer - Application Started
========================================
"@

if (-not $SkipBackend) {
    Write-Success "Backend:  http://localhost:$BackendPort"
}
if (-not $SkipFrontend) {
    Write-Success "Frontend: http://localhost:$FrontendPort"
}

Write-Info @"

API Endpoints:
  GET  /api/health                - Health check
  GET  /api/sessions              - List all sessions
  GET  /api/sessions/:sessionId   - Get session details
  GET  /api/teams                 - List all teams
  GET  /api/teams/:teamId         - Get team details

WebSocket Events:
  sessions:initial, sessions:updated
  teams:initial, teams:updated
  team:data, messages:updated
========================================
"@

# Open browser
if (-not $SkipFrontend) {
    Write-Info "`nOpening browser..."
    Start-Process "http://localhost:$FrontendPort"
}

Write-Info "`nPress Ctrl+C to stop all services`n"

# Watch logs
try {
    while ($true) {
        if ($BackendJob) {
            $b = Receive-Job -Job $BackendJob -ErrorAction SilentlyContinue
            if ($b) { Write-Host "[Backend] $b" -ForegroundColor DarkGray }
        }

        if ($FrontendJob) {
            $f = Receive-Job -Job $FrontendJob -ErrorAction SilentlyContinue
            if ($f) { Write-Host "[Frontend] $f" -ForegroundColor Gray }
        }

        Start-Sleep -Seconds 1
    }
} finally {
    Write-Info "`nStopping services..."

    if ($BackendJob) {
        Stop-Job -Job $BackendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $BackendJob -ErrorAction SilentlyContinue
        Write-Success "Backend stopped"
    }

    if ($FrontendJob) {
        Stop-Job -Job $FrontendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $FrontendJob -ErrorAction SilentlyContinue
        Write-Success "Frontend stopped"
    }

    Write-Success "`nAll services stopped. Goodbye!"
}
