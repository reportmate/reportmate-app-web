import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// 30-second cache for applications data
let applicationsCache: {
  data: any[] | null
  timestamp: number
  ttl: number
} = {
  data: null,
  timestamp: 0,
  ttl: 30000
}

// Clear cache for fresh data from all devices
applicationsCache.data = null
applicationsCache.timestamp = 0

export async function GET(_request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    const now = Date.now()
    
    // Check cache first
    if (applicationsCache.data && (now - applicationsCache.timestamp) < applicationsCache.ttl) {
            return NextResponse.json(applicationsCache.data, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'memory-cache',
          'X-Cache-Hit': 'true'
        }
      })
    }

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[APPLICATIONS API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
        
    try {
      // First, get all devices
            const headers = getInternalApiHeaders()
      const devicesResponse = await fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers
      })
      
      if (!devicesResponse.ok) {
        throw new Error(`Devices API error: ${devicesResponse.status} ${devicesResponse.statusText}`)
      }
      
      const devicesData = await devicesResponse.json()
            
      if (devicesData.length === 0) {
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'azure-functions',
            'X-Total-Devices': '0'
          }
        })
      }
      
      // Collect applications from all devices
      const allApplications: any[] = []
      let processedDevices = 0
      let devicesWithApps = 0
      
            
      // Process devices in batches to avoid overwhelming the API
      const batchSize = 10
      for (let i = 0; i < devicesData.length; i += batchSize) {
        const batch = devicesData.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (device: any) => {
          const deviceSerial = device.serialNumber || device.serial_number || device.id || 'unknown'
          try {
            const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${deviceSerial}`, {
              cache: 'no-store',
              headers
            })
            
            if (!deviceResponse.ok) {
              console.warn(`[APPLICATIONS API] ${timestamp} - Failed to fetch device ${deviceSerial}: ${deviceResponse.status}`)
              return
            }
            
            const deviceData = await deviceResponse.json()
            
            // Extract applications from device modules
            const applications = getApplicationsFromDevice(deviceData, deviceSerial)
            
            if (applications.length > 0) {
                            allApplications.push(...applications)
              devicesWithApps++
            }
            
            processedDevices++
            
          } catch (deviceError) {
            console.warn(`[APPLICATIONS API] ${timestamp} - Error fetching device ${deviceSerial}:`, deviceError)
          }
        }))
        
        // Brief pause between batches to be gentle on the API
        if (i + batchSize < devicesData.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
                        
      // Cache the successful result
      applicationsCache = {
        data: allApplications,
        timestamp: now,
        ttl: 30000 // 30 seconds
      }
      
      return NextResponse.json(allApplications, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions',
          'X-Total-Devices': devicesData.length.toString(),
          'X-Processed-Devices': processedDevices.toString(),
          'X-Devices-With-Apps': devicesWithApps.toString(),
          'X-Total-Applications': allApplications.length.toString()
        }
      })
      
    } catch (fetchError) {
      console.error(`[APPLICATIONS API] ${timestamp} - Failed to fetch applications data:`, fetchError)
      return NextResponse.json({
        error: 'Service temporarily unavailable',
        details: 'Failed to fetch applications data from cloud infrastructure'
      }, { status: 503 })
    }
    
  } catch (error) {
    console.error('[APPLICATIONS API] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({
      error: 'API request failed',
      details: errorMessage
    }, { status: 500 })
  }
}

function getApplicationsFromDevice(deviceData: any, serialNumber: string): any[] {
  const applications: any[] = []
  
  if (!deviceData?.device) {
    return applications
  }
  
  const device = deviceData.device
  const deviceId = device.deviceId || device.serialNumber || serialNumber
  
  // Try to get a friendly device name from multiple sources
  let deviceName = 'Unknown Device'
  
  // First try inventory module for device name
  if (device.modules?.inventory?.deviceName) {
    deviceName = device.modules.inventory.deviceName
  }
  // Then try hostname from inventory
  else if (device.modules?.inventory?.hostname) {
    deviceName = device.modules.inventory.hostname
  }
  // Try direct device name fields
  else if (device.name) {
    deviceName = device.name
  } else if (device.hostname) {
    deviceName = device.hostname
  }
  // Try computer name from inventory
  else if (device.modules?.inventory?.computerName) {
    deviceName = device.modules.inventory.computerName
  }
  // Try system info module
  else if (device.modules?.system?.computerName) {
    deviceName = device.modules.system.computerName
  } else if (device.modules?.system?.hostname) {
    deviceName = device.modules.system.hostname
  }
  // Fallback to serial number
  else {
    deviceName = `Device ${serialNumber}`
  }
  
  // Try to get applications from modules
  const applicationsModule = device.modules?.applications
  
  if (!applicationsModule) {
    return applications
  }
  
  // Try different field names that might contain applications
  let installedApps: any[] = []
  
  if (applicationsModule.installedApplications) {
    installedApps = applicationsModule.installedApplications
  } else if (applicationsModule.InstalledApplications) {
    installedApps = applicationsModule.InstalledApplications
  } else if (applicationsModule.installed_applications) {
    installedApps = applicationsModule.installed_applications
  }
  
  // Transform each application to the expected format
  installedApps.forEach((app: any, index: number) => {
    applications.push({
      id: `${deviceId}_${index}`,
      deviceId,
      deviceName,
      serialNumber,
      lastSeen: device.lastSeen,
      collectedAt: applicationsModule.collectedAt || applicationsModule.collected_at,
      // Application-specific fields
      name: app.name || app.displayName || 'Unknown Application',
      version: app.version || app.bundle_version || 'Unknown',
      vendor: app.publisher || app.signed_by || app.vendor || 'Unknown',
      publisher: app.publisher || app.signed_by || app.vendor || 'Unknown',
      category: app.category || 'Other',
      installDate: app.installDate || app.install_date || app.last_modified,
      size: app.size || app.estimatedSize,
      path: app.path || app.install_location,
      bundleId: app.bundleId || app.bundle_id,
      description: app.description || app.info,
      // Raw app data for debugging
      rawApp: app
    })
  })
  
  return applications
}
