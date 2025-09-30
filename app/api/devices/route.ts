import { NextResponse } from 'next/server'

// Device status calculation (inline to avoid import issues)
type DeviceStatus = 'active' | 'stale' | 'warning' | 'error' | 'missing'

function calculateDeviceStatus(lastSeen: string | Date | null | undefined): DeviceStatus {
  const activeThresholdHours = 24
  const staleThresholdHours = 168 // 7 days
  
  if (!lastSeen) return 'missing'
  
  try {
    const lastSeenDate = new Date(lastSeen)
    if (isNaN(lastSeenDate.getTime())) return 'missing'
    
    const now = new Date()
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < activeThresholdHours) return 'active'
    if (diffHours < staleThresholdHours) return 'stale'
    return 'missing'
    
  } catch (error) {
    return 'missing'
  }
}

// Quick cache for devices data (in memory, resets on server restart)
let devicesCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 60 * 1000 // 60 seconds for better performance

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeOSVersions = searchParams.get('includeOSVersions') === 'true'
  const includeDashboardData = searchParams.get('includeDashboardData') === 'true'
  const timestamp = new Date().toISOString()
  
  try {
    // Check cache first - but check if OS versions or dashboard data are requested
    const now = Date.now()
    const needsModuleData = includeOSVersions || includeDashboardData
    if (devicesCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION && !needsModuleData) {
      console.log(`[DEVICES API] ${timestamp} - Returning cached data (${devicesCache.length} devices)`)
      return NextResponse.json({
        success: true,
        devices: devicesCache,
        count: devicesCache.length
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'in-memory-cache'
        }
      })
    }

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[DEVICES API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log(`[DEVICES API] ${timestamp} - Fetching devices from Container Apps API${needsModuleData ? ' (with module data)' : ''} - URL: ${apiBaseUrl}/api/devices`)
    
    // Fetch devices from Container Apps API with timeout and error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(`${apiBaseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[DEVICES API] ${timestamp} - Container Apps API failed:`, {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      })
      throw new Error(`Container Apps API failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`[DEVICES API] ${timestamp} - Container Apps API response:`, {
      success: data.success,
      deviceCount: data.devices ? data.devices.length : 'no devices property',
      isArray: Array.isArray(data),
      arrayLength: Array.isArray(data) ? data.length : 'not array',
      firstDeviceKeys: data.devices && data.devices.length > 0 ? Object.keys(data.devices[0]) : 'no devices'
    })
    
    // Extract devices array - handle multiple response formats
    // Azure Functions API returns { devices: [...], total: N } without success field
    // Container Apps API returns { success: true, devices: [...] }
    let devicesArray = []
    if (Array.isArray(data)) {
      devicesArray = data
    } else if (data.devices && Array.isArray(data.devices)) {
      devicesArray = data.devices
    } else if (data.success && Array.isArray(data.devices)) {
      devicesArray = data.devices
    }
    
    if (!Array.isArray(devicesArray)) {
      console.error(`[DEVICES API] ${timestamp} - Invalid devices data structure:`, {
        devicesArray: typeof devicesArray,
        dataKeys: Object.keys(data)
      })
      throw new Error('Invalid devices data structure returned from API')
    }
    
    // Helper function to detect platform from serial number patterns
    const detectPlatform = (serialNumber: string): string => {
      if (!serialNumber) return 'Windows' // Default to Windows for unknown
      
      // Windows serial number patterns (most common in this fleet)
      if (serialNumber.match(/^[0-9][A-Z0-9]{11,13}$/)) return 'Windows' // 0F33V9G25083HJ
      if (serialNumber.match(/^WIN-/)) return 'Windows'                  // WIN-prefixed
      if (serialNumber.match(/^[A-Z0-9]{7,8}$/)) return 'Windows'        // PF4QEAX7, 3GWCPY2, 3H19PY2 etc.
      if (serialNumber.match(/^[A-Z]{2}[0-9][A-Z0-9]{4}$/)) return 'Windows' // CTDQ0Q2
      if (serialNumber.match(/^[0-9]{2}[A-Z0-9]{5}$/)) return 'Windows'  // 53G4FF3, 37BQKQ3
      
      // macOS serial number patterns (Apple-specific - very narrow patterns)
      if (serialNumber.match(/^[FM][A-Z0-9]{10}$/)) return 'macOS'       // MJ0KP6FK, MZ008KGX (true Apple serials)
      if (serialNumber.match(/^G[A-Z0-9]{7}$/)) return 'macOS'           // GM0MB0JS (true Apple serials)
      if (serialNumber.match(/^[8-9][A-Z0-9]{6}$/)) return 'macOS'       // 8LCX9Z2 (true Apple serials)
      if (serialNumber.match(/^[CDF][A-Z0-9]{9}$/)) return 'macOS'       // D7C10R3, F7C10R3 (true Apple serials)
      
      // Default to Windows since this fleet is primarily Windows
      return 'Windows'
      
      return 'unknown'
    }

    // Enhanced transformation with platform detection using module data when available
    const transformedDevices = Array.isArray(devicesArray) ? devicesArray.map((device: any) => {
      // Calculate proper device status based on lastSeen timestamp
      const calculatedStatus = calculateDeviceStatus(device.lastSeen)
      
      // Use OS data from modules if available (FastAPI Container provides this)
      const osData = device.modules?.system?.operatingSystem
      let platform = detectPlatform(device.serialNumber)
      let osVersionForGraphs = null
      let friendlyOSVersion = device.os || 'Unknown OS'
      
      // If OS data is available from the Container API, use it
      if (osData) {
        if (osData.name?.toLowerCase().includes('windows')) {
          platform = 'Windows'
          // Windows version: major.build.featureUpdate
          osVersionForGraphs = `${osData.major || 10}.${osData.build}.${osData.featureUpdate || '0'}`
          friendlyOSVersion = `${osData.name} ${osData.displayVersion || osData.version}`
        } else if (osData.name?.toLowerCase().includes('macos')) {
          platform = 'macOS'
          // macOS version: major.minor.patch  
          osVersionForGraphs = `${osData.major}.${osData.minor}.${osData.patch}`
          friendlyOSVersion = `${osData.name} ${osData.version}`
        }
      }
      
      const transformedDevice: any = {
        deviceId: device.deviceId || device.serialNumber,
        serialNumber: device.serialNumber,
        name: device.deviceName || device.name || device.serialNumber,
        lastSeen: device.lastSeen,
        createdAt: device.createdAt,
        status: calculatedStatus, // Use calculated status instead of API's "online"
        platform: platform,
        clientVersion: device.clientVersion || '1.0.0',
        totalEvents: device.totalEvents || 0,
        hasData: true,
        os_version: friendlyOSVersion,
        osVersionForGraphs: osVersionForGraphs,
        // Include inventory fields from the enhanced FastAPI Container endpoint
        assetTag: device.assetTag || null,
        usage: device.usage || null,
        catalog: device.catalog || null,
        location: device.location || null,
        department: device.department || null
      }
      
      // Include the complete modules structure if available (needed for dashboard charts)
      if (device.modules) {
        transformedDevice.modules = device.modules
      }
      
      return transformedDevice
    }) : []
    
    console.log(`[DEVICES API] ${timestamp} - Transformed ${transformedDevices.length} devices with OS data from Container API`)
    
    // Update cache
    devicesCache = transformedDevices
    cacheTimestamp = now
    
    return NextResponse.json({
      success: true,
      devices: transformedDevices,
      count: transformedDevices.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'container-apps-api'
      }
    })
      
  } catch (error) {
    console.error(`[DEVICES API] ${timestamp} - Error occurred:`, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      errorName: error instanceof Error ? error.name : typeof error
    })
    
    // If we have cached data, return it even if fresh fetch fails
    if (devicesCache.length > 0) {
      console.log(`[DEVICES API] ${timestamp} - Returning stale cache data due to error`)
      return NextResponse.json({
        success: true,
        devices: devicesCache,
        count: devicesCache.length
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'stale-cache-fallback',
          'X-Warning': 'Fresh-data-fetch-failed'
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch devices',
      details: error instanceof Error ? error.message : String(error),
      devices: [],
      count: 0
    }, { status: 500 })
  }
}
