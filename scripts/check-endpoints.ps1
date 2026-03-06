<#
.SYNOPSIS
    Quick endpoint health check for all ReportMate API and frontend routes.

.DESCRIPTION
    Runs HTTP requests against every known endpoint and reports pass/fail.
    Use this after deployments or code changes to catch broken endpoints fast.

    Does NOT require Playwright or Node.js - pure PowerShell.

.PARAMETER Target
    Which target to test: "api", "frontend", or "all" (default: all)

.PARAMETER ApiBase
    FastAPI container URL (default: production)

.PARAMETER FrontendBase
    Frontend URL (default: production)

.EXAMPLE
    .\check-endpoints.ps1
    .\check-endpoints.ps1 -Target api
    .\check-endpoints.ps1 -Target frontend -FrontendBase http://localhost:3000
#>

param(
    [ValidateSet("api", "frontend", "all")]
    [string]$Target = "all",

    [string]$ApiBase = "https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io",

    [string]$FrontendBase = "https://reportmate.ecuad.ca",

    [string]$DeviceSerial = "0F33V9G25083HJ"
)

$ErrorActionPreference = "Continue"

# Auth headers
$authHeaders = @{ "User-Agent" = "ReportMate-HealthCheck/1.0" }
if ($env:API_INTERNAL_SECRET) {
    $authHeaders["X-Internal-Secret"] = $env:API_INTERNAL_SECRET
} elseif ($env:REPORTMATE_PASSPHRASE) {
    $authHeaders["X-API-PASSPHRASE"] = $env:REPORTMATE_PASSPHRASE
}

$passed = 0
$failed = 0
$errors = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200)
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -TimeoutSec 60 -UseBasicParsing -ErrorAction Stop
        if ($ExpectedStatus -contains $response.StatusCode) {
            Write-Host "  PASS  " -ForegroundColor Green -NoNewline
            Write-Host " $Name ($($response.StatusCode))"
            $script:passed++
        } else {
            Write-Host "  FAIL  " -ForegroundColor Red -NoNewline
            Write-Host " $Name - expected $($ExpectedStatus -join '/'), got $($response.StatusCode)"
            $script:failed++
            $script:errors += "$Name -> status $($response.StatusCode)"
        }
    } catch {
        $status = 0
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        if ($ExpectedStatus -contains $status) {
            Write-Host "  PASS  " -ForegroundColor Green -NoNewline
            Write-Host " $Name ($status)"
            $script:passed++
        } else {
            Write-Host "  FAIL  " -ForegroundColor Red -NoNewline
            $msg = if ($status -gt 0) { "status $status" } else { $_.Exception.Message }
            Write-Host " $Name - $msg"
            $script:failed++
            $script:errors += "$Name -> $msg"
        }
    }
}

# ── FastAPI Backend ──────────────────────────────────────────────

if ($Target -eq "api" -or $Target -eq "all") {
    Write-Host ""
    Write-Host "FastAPI Backend ($ApiBase)" -ForegroundColor Cyan
    Write-Host ("=" * 60)

    Write-Host "`nHealth (no auth):" -ForegroundColor Yellow
    Test-Endpoint "GET /"            "$ApiBase/"
    Test-Endpoint "GET /api/health"  "$ApiBase/api/health"
    Test-Endpoint "GET /api/negotiate" "$ApiBase/api/negotiate" -ExpectedStatus @(200, 500)

    Write-Host "`nCore endpoints (auth):" -ForegroundColor Yellow
    Test-Endpoint "GET /api/dashboard"  "$ApiBase/api/dashboard"   -Headers $authHeaders
    Test-Endpoint "GET /api/devices"    "$ApiBase/api/devices"     -Headers $authHeaders
    Test-Endpoint "GET /api/events"     "$ApiBase/api/events"      -Headers $authHeaders

    Write-Host "`nDevice-specific ($DeviceSerial):" -ForegroundColor Yellow
    Test-Endpoint "GET /api/device/:serial"          "$ApiBase/api/device/$DeviceSerial"          -Headers $authHeaders
    Test-Endpoint "GET /api/device/:serial/events"   "$ApiBase/api/device/$DeviceSerial/events"   -Headers $authHeaders
    Test-Endpoint "GET /api/device/:serial/info"     "$ApiBase/api/device/$DeviceSerial/info"     -Headers $authHeaders
    Test-Endpoint "GET /api/device/:serial/installs/log" "$ApiBase/api/device/$DeviceSerial/installs/log" -Headers $authHeaders

    Write-Host "`nFleet module endpoints:" -ForegroundColor Yellow
    $fleetEndpoints = @(
        "applications", "hardware", "installs", "network",
        "security", "security/certificates",
        "management", "inventory", "system", "peripherals", "identity"
    )
    foreach ($ep in $fleetEndpoints) {
        Test-Endpoint "GET /api/devices/$ep" "$ApiBase/api/devices/$ep" -Headers $authHeaders
    }

    Write-Host "`nDevice module data:" -ForegroundColor Yellow
    $modules = @("applications", "hardware", "installs", "inventory", "management", "network", "security", "system")
    foreach ($mod in $modules) {
        Test-Endpoint "GET /api/device/:serial/modules/$mod" "$ApiBase/api/device/$DeviceSerial/modules/$mod" -Headers $authHeaders
    }

    Write-Host "`nStats endpoints:" -ForegroundColor Yellow
    Test-Endpoint "GET /api/stats/installs"           "$ApiBase/api/stats/installs"           -Headers $authHeaders
    Test-Endpoint "GET /api/stats/applications/usage"  "$ApiBase/api/stats/applications/usage"  -Headers $authHeaders
    Test-Endpoint "GET /api/devices/applications/usage" "$ApiBase/api/devices/applications/usage" -Headers $authHeaders
    Test-Endpoint "GET /api/device/:serial/applications/usage" "$ApiBase/api/device/$DeviceSerial/applications/usage" -Headers $authHeaders

    Write-Host "`nAuth enforcement (should reject):" -ForegroundColor Yellow
    Test-Endpoint "GET /api/devices (no auth)" "$ApiBase/api/devices" -ExpectedStatus @(401, 403)
    Test-Endpoint "GET /api/dashboard (no auth)" "$ApiBase/api/dashboard" -ExpectedStatus @(401, 403)
}

# ── Frontend ─────────────────────────────────────────────────────

if ($Target -eq "frontend" -or $Target -eq "all") {
    Write-Host ""
    Write-Host "Frontend ($FrontendBase)" -ForegroundColor Cyan
    Write-Host ("=" * 60)

    Write-Host "`nPages:" -ForegroundColor Yellow
    $pages = @(
        "/", "/dashboard", "/events", "/settings",
        "/device/$DeviceSerial",
        "/devices", "/devices/applications", "/devices/hardware",
        "/devices/installs", "/devices/inventory", "/devices/management",
        "/devices/network", "/devices/peripherals",
        "/devices/security", "/devices/system", "/devices/identity"
    )
    foreach ($p in $pages) {
        Test-Endpoint "GET $p" "$FrontendBase$p"
    }

    Write-Host "`nAPI proxy routes:" -ForegroundColor Yellow
    Test-Endpoint "GET /api/healthz"    "$FrontendBase/api/healthz"
    Test-Endpoint "GET /api/version"    "$FrontendBase/api/version"
    Test-Endpoint "GET /api/dashboard"  "$FrontendBase/api/dashboard"
    Test-Endpoint "GET /api/devices"    "$FrontendBase/api/devices"
    Test-Endpoint "GET /api/events"     "$FrontendBase/api/events"
    Test-Endpoint "GET /api/stats"      "$FrontendBase/api/stats" -ExpectedStatus @(200, 405)
    Test-Endpoint "GET /api/stats/installs" "$FrontendBase/api/stats/installs"
}

# ── Summary ──────────────────────────────────────────────────────

Write-Host ""
Write-Host ("=" * 60)
$total = $passed + $failed
Write-Host "Results: $passed/$total passed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "Failures:" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
    exit 1
}

exit 0
