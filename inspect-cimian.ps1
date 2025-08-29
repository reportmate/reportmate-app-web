# PowerShell script to inspect the actual API response for Cimian data
Write-Host "Fetching device data to inspect Cimian structure..."

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/device/0F33V9G25083HJ" -Method GET
    $device = $response.device
    $cimianData = $device.modules.installs.cimian
    
    Write-Host "`n=== CIMIAN DATA STRUCTURE ===" -ForegroundColor Green
    Write-Host "Has Cimian data: $($null -ne $cimianData)" -ForegroundColor Yellow
    
    if ($cimianData) {
        Write-Host "Cimian keys: $($cimianData.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        
        Write-Host "`n--- VERSION INFO ---" -ForegroundColor Cyan
        Write-Host "Root version: $($cimianData.version)"
        Write-Host "Config version: $($cimianData.config.version)"
        
        Write-Host "`n--- SESSIONS INFO ---" -ForegroundColor Cyan
        Write-Host "Has sessions: $($null -ne $cimianData.sessions)"
        Write-Host "Sessions count: $($cimianData.sessions.Count)"
        if ($cimianData.sessions -and $cimianData.sessions.Count -gt 0) {
            $lastSession = $cimianData.sessions[-1]
            Write-Host "Last session has duration: $($null -ne $lastSession.duration)"
            Write-Host "Last session duration: $($lastSession.duration)"
            Write-Host "Last session has startTime: $($null -ne $lastSession.startTime)"
            Write-Host "Last session startTime: $($lastSession.startTime)"
            Write-Host "Last session has endTime: $($null -ne $lastSession.endTime)"
            Write-Host "Last session endTime: $($lastSession.endTime)"
        }
        
        Write-Host "`n--- ITEMS INFO ---" -ForegroundColor Cyan
        Write-Host "Has items: $($null -ne $cimianData.items)"
        Write-Host "Items count: $($cimianData.items.Count)"
        if ($cimianData.items -and $cimianData.items.Count -gt 0) {
            for ($i = 0; $i -lt $cimianData.items.Count; $i++) {
                $item = $cimianData.items[$i]
                Write-Host "Item $($i + 1): $($item.itemName)"
                Write-Host "  - latestVersion: $($item.latestVersion)"
                Write-Host "  - installedVersion: $($item.installedVersion)"
                Write-Host "  - version: $($item.version)"
                Write-Host "  - currentStatus: $($item.currentStatus)"
                Write-Host "  - All item keys: $($item.PSObject.Properties.Name -join ', ')"
            }
        }
        
        Write-Host "`n--- PENDING PACKAGES ---" -ForegroundColor Cyan
        Write-Host "Has pendingPackages: $($null -ne $cimianData.pendingPackages)"
        Write-Host "Pending packages count: $($cimianData.pendingPackages.Count)"
        if ($cimianData.pendingPackages) {
            Write-Host "Pending packages: $($cimianData.pendingPackages -join ', ')"
        }
        
        Write-Host "`n--- SAMPLE DATA DUMP (first 2000 chars) ---" -ForegroundColor Magenta
        $jsonSample = $cimianData | ConvertTo-Json -Depth 5
        Write-Host $jsonSample.Substring(0, [Math]::Min(2000, $jsonSample.Length))
    }
    else {
        Write-Host "❌ No Cimian data found" -ForegroundColor Red
        Write-Host "Available modules: $($device.modules.PSObject.Properties.Name -join ', ')"
        if ($device.modules.installs) {
            Write-Host "Installs module keys: $($device.modules.installs.PSObject.Properties.Name -join ', ')"
        }
    }
}
catch {
    Write-Host "❌ Error fetching data: $($_.Exception.Message)" -ForegroundColor Red
}
