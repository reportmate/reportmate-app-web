import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DeviceData {
  deviceId: string
  serialNumber: string
  lastSeen: string
  modules?: {
    applications?: {
      installedApplications?: any[]
      InstalledApplications?: any[]
      installed_applications?: any[]
    }
  }
}

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[APPLICATIONS API] ${timestamp} - Fetching applications data from all devices`)

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
      console.log(`[APPLICATIONS API] ${timestamp} - Fetching devices list`)
      const devicesResponse = await fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
      })
      
      if (!devicesResponse.ok) {
        throw new Error(`Devices API error: ${devicesResponse.status}`)
      }
      
      const devicesData = await devicesResponse.json()
      console.log(`[APPLICATIONS API] ${timestamp} - Devices API response structure:`, {
        type: typeof devicesData,
        isArray: Array.isArray(devicesData),
        hasDevicesProperty: !!devicesData.devices,
        keysOrLength: Array.isArray(devicesData) ? devicesData.length : Object.keys(devicesData || {})
      })
      
      // Handle both array format and object format with devices property
      let devicesList: any[] = []
      if (Array.isArray(devicesData)) {
        devicesList = devicesData
      } else if (devicesData.devices && Array.isArray(devicesData.devices)) {
        devicesList = devicesData.devices
      } else {
        console.warn(`[APPLICATIONS API] ${timestamp} - Unexpected devices API response format`)
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'azure-functions',
            'X-Warning': 'unexpected-devices-format'
          }
        })
      }
      
      console.log(`[APPLICATIONS API] ${timestamp} - Found ${devicesList.length} devices`)
      
      if (devicesList.length === 0) {
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'azure-functions'
          }
        })
      }
      
      // Collect applications from all devices
      const allApplications: any[] = []
      
      for (const device of devicesList) {
        const deviceSerial = device.serialNumber || device.serial_number || device.id || 'unknown'
        try {
          console.log(`[APPLICATIONS API] ${timestamp} - Fetching device ${deviceSerial} data`)
          
          const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${deviceSerial}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'User-Agent': 'ReportMate-Frontend/1.0'
            }
          })
          
          if (!deviceResponse.ok) {
            console.warn(`[APPLICATIONS API] ${timestamp} - Failed to fetch device ${deviceSerial}: ${deviceResponse.status}`)
            continue
          }
          
          const deviceData = await deviceResponse.json()
          
          // Extract applications from device modules
          const applications = getApplicationsFromDevice(deviceData, deviceSerial)
          
          if (applications.length > 0) {
            console.log(`[APPLICATIONS API] ${timestamp} - Found ${applications.length} applications on device ${deviceSerial}`)
            allApplications.push(...applications)
          }
          
        } catch (deviceError) {
          console.warn(`[APPLICATIONS API] ${timestamp} - Error fetching device ${deviceSerial}:`, deviceError)
          continue
        }
      }
      
      console.log(`[APPLICATIONS API] ${timestamp} - Successfully aggregated ${allApplications.length} applications from all devices`)
      
      return NextResponse.json(allApplications, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions',
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