import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

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
const CONTAINER_APPS_API_BASE = process.env.API_BASE_URL || 'http://reportmate-functions-api'

export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const { headers: requestHeaders } = request
    const host = requestHeaders.get('host') || ''
    const isLocalDev = host.includes('localhost')
    
    console.log(`[APPLICATIONS FILTERS API] ${timestamp} - Fetching applications from FastAPI bulk endpoint (localhost: ${isLocalDev})`)

    // PERFORMANCE FIX: Use FastAPI bulk applications endpoint instead of fetching each device individually
    // This reduces 234 sequential API calls to just 2 calls (devices + applications)
    
    // Use internal API URL for container-to-container communication
    const baseUrl = CONTAINER_APPS_API_BASE
    const headers = getInternalApiHeaders()
    
    // 1. Fetch devices for inventory metadata
    const devicesResponse = await fetch(`${baseUrl}/api/devices`, {
      method: 'GET',
      headers,
    })

    if (!devicesResponse.ok) {
      console.error('[APPLICATIONS FILTERS API] Failed to fetch devices:', devicesResponse.status, devicesResponse.statusText)
      throw new Error(`Failed to fetch devices: ${devicesResponse.status}`)
    }

    const devicesData = await devicesResponse.json()
    
    if (!Array.isArray(devicesData.devices)) {
      console.error('[APPLICATIONS FILTERS API] Invalid devices response:', devicesData)
      throw new Error('Invalid devices response format')
    }

    console.log(`[APPLICATIONS FILTERS API] Fetched ${devicesData.devices.length} devices`)

    // 2. Fetch ALL applications using bulk endpoint (much faster than 234 individual calls)
    const applicationsResponse = await fetch(`${baseUrl}/api/devices/applications?loadAll=true`, {
      method: 'GET',
      headers,
    })

    if (!applicationsResponse.ok) {
      console.error('[APPLICATIONS FILTERS API] Failed to fetch applications:', applicationsResponse.status, applicationsResponse.statusText)
      throw new Error(`Failed to fetch applications: ${applicationsResponse.status}`)
    }

    const applicationsData = await applicationsResponse.json()
    
    if (!Array.isArray(applicationsData)) {
      console.error('[APPLICATIONS FILTERS API] Invalid applications response:', applicationsData)
      throw new Error('Invalid applications response format')
    }

    console.log(`[APPLICATIONS FILTERS API] Fetched ${applicationsData.length} applications from bulk endpoint`)

    // Build devices array with inventory metadata AND group applications by device
    const devicesMap = new Map()
    const deviceAppsCount = new Map() // Track app count per device
    
    for (const device of devicesData.devices) {
      if (!device.serialNumber || device.serialNumber.includes('TEST-') || device.serialNumber === 'localhost') {
        continue
      }

      devicesMap.set(device.serialNumber, {
        id: device.deviceId || device.serial_number,
        name: device.deviceName || device.name || device.serialNumber,
        serialNumber: device.serialNumber,
        usage: device.usage || '',
        catalog: device.catalog || '',
        location: device.location || '',
        room: device.location || '',
        fleet: '',
        modules: {
          applications: { installedApplications: [] }, // Will populate from bulk data
          inventory: device.inventory || null
        }
      })
      deviceAppsCount.set(device.serialNumber, 0)
    }

    // Process bulk applications and group by device
    const applicationNames = new Set<string>()
    const normalizedAppNames = new Set<string>()
    const publishers = new Set<string>()
    const categories = new Set<string>()
    
    // Collect inventory filters from applications data
    const usagesSet = new Set<string>()
    const catalogsSet = new Set<string>()
    const locationsSet = new Set<string>()
    const roomsSet = new Set<string>()
    const fleetsSet = new Set<string>()

    for (const app of applicationsData) {
      const deviceSerial = app.serialNumber
      if (!deviceSerial) continue
      
      // Extract inventory filters from application data
      if (app.usage) usagesSet.add(app.usage)
      if (app.catalog) catalogsSet.add(app.catalog)
      if (app.location) locationsSet.add(app.location)
      if (app.location) roomsSet.add(app.location) // Room is typically stored in location field

      // Add to device's applications array (reconstruct raw format from bulk data)
      const device = devicesMap.get(deviceSerial)
      if (device) {
        // Convert bulk app format back to raw module format for consistency
        const rawApp = app.raw || {
          name: app.name,
          displayName: app.name,
          version: app.version,
          publisher: app.publisher,
          vendor: app.vendor,
          category: app.category,
          installDate: app.installDate,
          size: app.size,
          path: app.path,
          architecture: app.architecture,
          bundleId: app.bundleId
        }
        device.modules.applications.installedApplications.push(rawApp)
        deviceAppsCount.set(deviceSerial, deviceAppsCount.get(deviceSerial)! + 1)
      }

      // Extract filter values
      const appName = app.name || app.displayName
      if (appName && shouldIncludeApplication(appName)) {
        applicationNames.add(appName)
        const normalized = normalizeAppName(appName)
        if (normalized) {
          normalizedAppNames.add(normalized)
        }
      }

      if (app.publisher) publishers.add(app.publisher)
      if (app.vendor) publishers.add(app.vendor)
      if (app.category) categories.add(app.category)
    }

    // Only include devices that have applications
    const devices = Array.from(devicesMap.values()).filter(d => {
      const appCount = deviceAppsCount.get(d.serialNumber) || 0
      return appCount > 0
    })

    // Convert sets to sorted arrays
    const usages = Array.from(usagesSet).filter(Boolean).sort()
    const catalogs = Array.from(catalogsSet).filter(Boolean).sort()
    const locations = Array.from(locationsSet).filter(Boolean).sort()
    const rooms = Array.from(roomsSet).filter(Boolean).sort()
    const fleets = Array.from(fleetsSet).filter(Boolean).sort()
    
    const filterOptions = {
      devices,
      applicationNames: Array.from(normalizedAppNames).sort(),
      publishers: Array.from(publishers).filter(p => p && p.trim()).sort(),
      categories: Array.from(categories).filter(c => c && c.trim()).sort(),
      versions: [],
      // Inventory filters extracted from applications data
      usages,
      catalogs,
      locations,
      rooms,
      fleets
    }

    console.log(`[APPLICATIONS FILTERS API] Generated filter options:`, {
      devicesProcessed: devices.length,
      totalApplications: applicationsData.length,
      normalizedAppNames: filterOptions.applicationNames.length,
      publishers: filterOptions.publishers.length,
      categories: filterOptions.categories.length,
      inventoryFilters: {
        usages: usages.length,
        catalogs: catalogs.length,
        locations: locations.length,
        rooms: rooms.length,
        fleets: fleets.length
      }
    })
    
    return NextResponse.json(filterOptions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-endpoint'
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