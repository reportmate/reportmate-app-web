import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[CHART DATA API] ${timestamp} - Getting system data for charts only`)

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
    
    // Use shared authentication headers
    const headers = getInternalApiHeaders()

    // Get bulk devices first
    const devicesResponse = await fetch(`${API_BASE_URL}/api/devices`, { headers })
    if (!devicesResponse.ok) {
      throw new Error(`FastAPI Container returned ${devicesResponse.status}`)
    }

    const devicesData = await devicesResponse.json()
    const devices = devicesData.devices || []
    
    // Get system data from ALL devices - NO LIMITS!
    const sampleDevices = devices
    
    console.log(`[CHART DATA API] ${timestamp} - Getting system data from ALL ${devices.length} devices`)
    
    const chartData = []
    
    for (const device of sampleDevices) {
      try {
        const deviceResponse = await fetch(`${API_BASE_URL}/api/device/${device.serialNumber}`, { headers })
        
        if (deviceResponse.ok) {
          const deviceData = await deviceResponse.json()
          const systemModule = deviceData.device?.modules?.system
          
          if (systemModule?.operatingSystem) {
            chartData.push({
              deviceId: device.deviceId,
              serialNumber: device.serialNumber,
              deviceName: device.deviceName,
              operatingSystem: systemModule.operatingSystem
            })
          }
        }
        
        // Small delay to avoid socket errors - 25ms for faster loading
        await new Promise(resolve => setTimeout(resolve, 25))
        
      } catch (error) {
        console.warn(`[CHART DATA API] Failed to get data for ${device.serialNumber}:`, error)
      }
    }
    
    console.log(`[CHART DATA API] ${timestamp} - Got chart data for ${chartData.length}/${sampleDevices.length} devices`)
    
    // Process chart data
    const osVersionCounts = new Map<string, number>()
    const platformCounts = new Map<string, number>()
    
    chartData.forEach(device => {
      const os = device.operatingSystem
      if (os) {
        // OS Version counting
        const osVersion = `${os.name || 'Unknown'} ${os.version || ''}`.trim()
        osVersionCounts.set(osVersion, (osVersionCounts.get(osVersion) || 0) + 1)
        
        // Platform counting  
        const platform = os.platform || os.name || 'Unknown'
        platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1)
      }
    })
    
    const result = {
      totalDevices: devices.length,
      sampledDevices: chartData.length,
      charts: {
        osVersions: Array.from(osVersionCounts.entries()).map(([version, count]) => ({
          version,
          count
        })).sort((a, b) => b.count - a.count),
        platforms: Array.from(platformCounts.entries()).map(([platform, count]) => ({
          platform,
          count
        })).sort((a, b) => b.count - a.count)
      }
    }
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Sample-Size': devices.length.toString(),
        'X-Performance': 'chart-data-ALL-DEVICES'
      }
    })

  } catch (error) {
    console.error('[CHART DATA API] Error:', error)
    return NextResponse.json({ 
      totalDevices: 0, 
      sampledDevices: 0,
      charts: { osVersions: [], platforms: [] }
    }, {
      headers: {
        'X-Error': error instanceof Error ? error.message : String(error)
      }
    })
  }
}