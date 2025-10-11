import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Ultra-robust application name normalization (same as page)
function normalizeAppName(appName: string): string {
  if (!appName || typeof appName !== 'string') return ''
  
  let normalized = appName.trim()
  if (!normalized) return ''
  
  // Step 1: Remove placeholder/junk entries
  if (normalized.includes('${{') || normalized.includes('}}')) return ''
  if (normalized === 'Unknown' || normalized === 'N/A') return ''
  
  // Step 2: Handle specific product lines first
  if (normalized.match(/Microsoft Visual C\+\+ \d{4}/i)) {
    return 'Microsoft Visual C++ Redistributable'
  }
  
  if (normalized.startsWith('Microsoft.NET') || normalized.includes('Microsoft ASP.NET Core')) {
    if (normalized.includes('Workload')) return 'Microsoft .NET Workload'
    if (normalized.includes('Sdk') || normalized.includes('SDK')) return 'Microsoft .NET SDK'
    if (normalized.includes('ASP.NET Core')) return 'Microsoft ASP.NET Core'
    if (normalized.includes('Runtime') || normalized.includes('AppHost') || 
        normalized.includes('Targeting Pack') || normalized.includes('Host FX Resolver')) {
      return 'Microsoft .NET Runtime'
    }
    return 'Microsoft .NET'
  }
  
  if (normalized.includes('Microsoft Visual Studio Tools')) {
    return 'Microsoft Visual Studio Tools'
  }
  
  if (normalized.match(/Microsoft (365|Office 365)/i)) {
    return 'Microsoft 365'
  }
  
  // Kinect Language Packs - consolidate all language variants
  if (normalized.match(/Kinect for Windows Speech Recognition Language Pack/i)) {
    return 'Kinect for Windows Speech Recognition Language Pack'
  }
  
  // Microsoft Language Packs (general pattern)
  if (normalized.match(/Microsoft.*Language Pack/i)) {
    return 'Microsoft Language Pack'
  }
  
  // Kits Configuration Installer
  if (normalized.match(/Kits Configuration Installer/i)) {
    return 'Kits Configuration Installer'
  }
  
  // VRS/VR related software
  if (normalized.match(/Kofax VRS/i)) {
    return 'Kofax VRS'
  }
  
  if (normalized.startsWith('Adobe ')) {
    const product = normalized.match(/Adobe ([A-Za-z\s]+)/)?.[1]?.split(/\s+/)[0]
    if (product && product !== 'AIR') return `Adobe ${product}`
  }
  
  if (normalized.match(/^7-Zip/i)) {
    return '7-Zip'
  }
  
  if (normalized.match(/Google Chrome|Chrome/i)) {
    return 'Google Chrome'
  }
  
  if (normalized.match(/Mozilla Firefox|Firefox/i)) {
    return 'Mozilla Firefox'
  }
  
  // Step 3: Generic version number removal
  normalized = normalized
    .replace(/\s+v?\d+(\.\d+)*(\.\d+)*(\.\d+)*$/i, '')
    .replace(/\s+\d{4}(\.\d+)*$/i, '')
    .replace(/\s+-\s+\d+(\.\d+)*$/i, '')
    .replace(/\s+\(\d+(\.\d+)*(\.\d+)*\)$/i, '')
    .replace(/\s+build\s+\d+/i, '')
    .replace(/\s+\d+(\.\d+)*(\.\d+)*(\.\d+)*$/i, '')
    
  // Step 4: Remove architecture and platform info
  normalized = normalized
    .replace(/\s+(x64|x86|64-bit|32-bit|amd64|i386)$/i, '')
    .replace(/\s+\((x64|x86|64-bit|32-bit|amd64|i386)\)$/i, '')
    .replace(/\s+\(Python\s+[\d\.]+\s+(64-bit|32-bit)\)$/i, '')
    .replace(/\s+\(git\s+[a-f0-9]+\)$/i, '')
    .replace(/\s+\([^)]*bit[^)]*\)/i, '')
    .replace(/\s+\([^)]*\d+\.\d+\.\d+[^)]*\)/i, '')
  
  // Step 5: Final cleanup
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')
    .replace(/^\s*-\s*/, '')
    .trim()
  
  if (!normalized || normalized.length < 2) return ''
  
  return normalized
}

// Filter function to exclude junk/system applications
function shouldIncludeApplication(appName: string): boolean {
  if (!appName || typeof appName !== 'string') return false
  
  const trimmed = appName.trim()
  if (!trimmed) return false
  
  if (trimmed.includes('${{') || trimmed.includes('}}')) return false
  if (trimmed === 'Unknown' || trimmed === 'N/A') return false
  
  const excludePatterns = [
    /^Microsoft\.NET\.Workload\./i,
    /^Microsoft\.NET\.Sdk\./i,
    /^Windows Software Development Kit/i,
    /^Microsoft Visual Studio Installer$/i,
    /Update for Windows/i,
    /Security Update for Microsoft/i,
    /^KB\d+/i,
    /Driver$/i,
    /^Intel.*Driver/i,
    /^NVIDIA.*Driver/i,
    /^AMD.*Driver/i,
    /Microsoft Visual C\+\+ \d{4} x\d{2} (Additional|Minimum) Runtime/i,
    /Microsoft .NET (Runtime|AppHost Pack|Targeting Pack|Host FX Resolver) - [\d\.]+ \(x\d+/i,
    /Microsoft ASP.NET Core [\d\.]+ (Shared Framework|Targeting Pack) \(x\d+/i,
    /^\$\{\{.*\}\}$/i,
    /^Unknown$/i,
    /^N\/A$/i,
    /^\s*$/
  ]
  
  return !excludePatterns.some(pattern => pattern.test(trimmed))
}

// Container Apps API configuration
const CONTAINER_APPS_API_BASE = process.env.CONTAINER_APPS_API_BASE || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[APPLICATIONS FILTERS API] ${timestamp} - Fetching filter options from Container Apps API`)

    // Fetch all devices from Container Apps API
    const devicesResponse = await fetch(`${CONTAINER_APPS_API_BASE}/api/devices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!devicesResponse.ok) {
      console.error('[APPLICATIONS FILTERS API] Container Apps API devices request failed:', devicesResponse.status, devicesResponse.statusText)
      throw new Error(`Container Apps API request failed: ${devicesResponse.status}`)
    }

    const devicesData = await devicesResponse.json()
    
    // FastAPI returns: { devices: [], total: N, message: "..." } - NO success field
    if (!Array.isArray(devicesData.devices)) {
      console.error('[APPLICATIONS FILTERS API] Invalid Container Apps API response:', devicesData)
      throw new Error('Invalid Container Apps API response format')
    }

    console.log(`[APPLICATIONS FILTERS API] Successfully fetched ${devicesData.devices.length} devices from Container Apps API`)

    // Process ALL devices to get complete filter data
    const devicesToProcess = devicesData.devices // Process ALL devices
    console.log(`[APPLICATIONS FILTERS API] Processing ${devicesToProcess.length} devices for application data`)

    // Process devices and extract application data by calling individual device endpoints
    const devices = []
    const applicationNames = new Set<string>()
    const normalizedAppNames = new Set<string>()
    const publishers = new Set<string>()
    const categories = new Set<string>()

    for (const deviceBasic of devicesToProcess) {
      // Skip test devices
      if (!deviceBasic.serialNumber || deviceBasic.serialNumber.includes('TEST-') || deviceBasic.serialNumber === 'localhost') {
        continue
      }

      try {
        // Fetch full device data including modules
        const deviceResponse = await fetch(`${CONTAINER_APPS_API_BASE}/api/device/${deviceBasic.serialNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!deviceResponse.ok) {
          console.log(`[APPLICATIONS FILTERS API] Failed to fetch device ${deviceBasic.serialNumber}: ${deviceResponse.status}`)
          continue
        }

        const deviceData = await deviceResponse.json()
        
        if (!deviceData.success || !deviceData.device) {
          console.log(`[APPLICATIONS FILTERS API] Invalid device response for ${deviceBasic.serialNumber}`)
          continue
        }

        const device = deviceData.device

        // Extract device info WITH full modules data (needed for stats cards)
        const deviceInfo = {
          id: device.deviceId || device.device_id || device.id,
          name: device.modules?.inventory?.deviceName || device.modules?.inventory?.computerName || device.deviceName || device.serial_number || deviceBasic.serialNumber || 'Unknown Device',
          serialNumber: device.serialNumber || deviceBasic.serialNumber,
          usage: device.modules?.inventory?.usage || '',
          catalog: device.modules?.inventory?.catalog || '',
          location: device.modules?.inventory?.location || '',
          room: device.modules?.inventory?.location || '', // Use location as room
          fleet: '', // Fleet not implemented yet - leave empty
          modules: {
            applications: device.modules?.applications || null,
            inventory: device.modules?.inventory || null
          }
        }
        
        // Debug log for first few devices to verify data
        if (devices.length < 3) {
          console.log(`[APPLICATIONS FILTERS API] Device ${devices.length + 1}:`, {
            serial: deviceInfo.serialNumber,
            usage: deviceInfo.usage,
            catalog: deviceInfo.catalog,
            location: deviceInfo.location,
            appsCount: device.modules?.applications?.installedApplications?.length || 0
          })
        }
        
        devices.push(deviceInfo)

        // Extract applications data - applications are at device.modules.applications.installedApplications
        const applicationsModule = device.modules?.applications
        if (applicationsModule?.installedApplications && Array.isArray(applicationsModule.installedApplications)) {
          console.log(`[APPLICATIONS FILTERS API] Processing ${applicationsModule.installedApplications.length} apps from device ${deviceInfo.serialNumber}`)
          
          applicationsModule.installedApplications.forEach((app: any) => {
            // Process application names with normalization
            const appName = app.name || app.displayName
            if (appName && shouldIncludeApplication(appName)) {
              applicationNames.add(appName) // Keep original for backward compatibility
              const normalized = normalizeAppName(appName)
              if (normalized) {
                normalizedAppNames.add(normalized)
              }
            }
            
            // Process publishers and categories
            if (app.publisher) publishers.add(app.publisher)
            if (app.signed_by) publishers.add(app.signed_by)
            if (app.vendor) publishers.add(app.vendor)
            if (app.category) categories.add(app.category)
          })
        } else {
          console.log(`[APPLICATIONS FILTERS API] No applications found for device ${deviceInfo.serialNumber}`)
        }
      } catch (error) {
        console.error(`[APPLICATIONS FILTERS API] Error processing device ${deviceBasic.serialNumber}:`, error)
        continue
      }
    }

    // Extract inventory filter values from devices array
    const usages = [...new Set(devices.map(d => d.usage).filter(Boolean))]
    const catalogs = [...new Set(devices.map(d => d.catalog).filter(Boolean))]
    const locations = [...new Set(devices.map(d => d.location).filter(Boolean))]
    const rooms = [...new Set(devices.map(d => d.room).filter(Boolean))]
    const fleets = [...new Set(devices.map(d => d.fleet).filter(Boolean))]
    
    const filterOptions = {
      devices,
      applicationNames: Array.from(normalizedAppNames).sort(),
      publishers: Array.from(publishers).filter(p => p && p.trim()).sort(),
      categories: Array.from(categories).filter(c => c && c.trim()).sort(),
      versions: [] // We'll populate this when needed, as it's app-specific
    }

    console.log(`[APPLICATIONS FILTERS API] ${timestamp} - Generated filter options from Container Apps API:`, {
      devicesProcessed: devices.length,
      originalAppNames: applicationNames.size,
      normalizedAppNames: filterOptions.applicationNames.length,
      publishers: filterOptions.publishers.length,
      categories: filterOptions.categories.length,
      inventoryFilters: {
        usages: usages.length,
        catalogs: catalogs.length,
        locations: locations.length,
        rooms: rooms.length,
        fleets: fleets.length
      },
      sampleUsages: usages.slice(0, 5),
      sampleCatalogs: catalogs.slice(0, 5),
      sampleLocations: locations.slice(0, 5)
    })
    
    return NextResponse.json(filterOptions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'container-apps-api'
      }
    })

  } catch (error) {
    console.error('[APPLICATIONS FILTERS API] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch filter options',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      devices: [],
      applicationNames: [],
      publishers: [],
      categories: [],
      versions: []
    }, { status: 500 })
  }
}