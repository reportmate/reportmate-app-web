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

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[APPLICATIONS FILTERS API] ${timestamp} - Fetching filter options`)

    // Get database connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    let poolClosed = false

    try {
      // Get devices with basic info for device filters
      const devicesQuery = `
        SELECT DISTINCT 
          d.serial_number,
          d.device_id,
          inv.data->>'deviceName' as device_name,
          inv.data->>'computerName' as computer_name,
          inv.data->>'usage' as usage,
          inv.data->>'catalog' as catalog,
          inv.data->>'location' as location
        FROM devices d
        LEFT JOIN inventory inv ON d.id = inv.device_id
        WHERE d.serial_number IS NOT NULL
          AND d.serial_number NOT LIKE 'TEST-%'
          AND d.serial_number != 'localhost'
        ORDER BY d.serial_number
      `

      const devicesResult = await pool.query(devicesQuery)
      
      // Get application names, publishers, categories from existing applications
      const appsQuery = `
        SELECT DISTINCT 
          a.data as applications_data
        FROM applications a
        INNER JOIN devices d ON a.device_id = d.id
        WHERE d.serial_number IS NOT NULL
          AND d.serial_number NOT LIKE 'TEST-%'
          AND d.serial_number != 'localhost'
          AND a.data IS NOT NULL
        LIMIT 1000  -- Increased limit to get better normalization results
      `

      const appsResult = await pool.query(appsQuery)
      
      // Extract unique application names, publishers, categories
      const applicationNames = new Set<string>()
      const normalizedAppNames = new Set<string>()
      const publishers = new Set<string>()
      const categories = new Set<string>()
      
      for (const row of appsResult.rows) {
        try {
          const applicationsData = row.applications_data
          
          let installedApps: any[] = []
          if (applicationsData.installedApplications) {
            installedApps = applicationsData.installedApplications
          } else if (applicationsData.InstalledApplications) {
            installedApps = applicationsData.InstalledApplications
          } else if (applicationsData.installed_applications) {
            installedApps = applicationsData.installed_applications
          }

          installedApps.forEach((app: any) => {
            // Process application names with normalization
            const appName = app.name || app.displayName
            if (appName && shouldIncludeApplication(appName)) {
              applicationNames.add(appName) // Keep original for backward compatibility
              const normalized = normalizeAppName(appName)
              if (normalized) {
                normalizedAppNames.add(normalized)
              }
            }
            
            // Process publishers and categories as before
            if (app.publisher) publishers.add(app.publisher)
            if (app.signed_by) publishers.add(app.signed_by)
            if (app.vendor) publishers.add(app.vendor)
            if (app.category) categories.add(app.category)
          })
        } catch (error) {
          console.warn(`[APPLICATIONS FILTERS API] Error processing app data:`, error)
        }
      }

      // Close pool connection - only once
      await pool.end()
      poolClosed = true

      const devices = devicesResult.rows.map((row: any) => ({
        id: row.device_id,
        name: row.device_name || row.computer_name || row.serial_number || 'Unknown Device',
        serialNumber: row.serial_number,
        usage: row.usage,
        catalog: row.catalog,
        location: row.location
      }))

      const filterOptions = {
        devices,
        applicationNames: Array.from(normalizedAppNames).sort(),
        publishers: Array.from(publishers).filter(p => p && p.trim()).sort(),
        categories: Array.from(categories).filter(c => c && c.trim()).sort(),
        versions: [] // We'll populate this when needed, as it's app-specific
      }

      console.log(`[APPLICATIONS FILTERS API] ${timestamp} - Generated filter options:`, {
        devices: devices.length,
        originalAppNames: applicationNames.size,
        normalizedAppNames: filterOptions.applicationNames.length,
        publishers: filterOptions.publishers.length,
        categories: filterOptions.categories.length
      })
      
      return NextResponse.json(filterOptions, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp
        }
      })

    } finally {
      // Ensure pool is closed only if not already closed
      if (!poolClosed) {
        try {
          await pool.end()
        } catch (poolError) {
          console.warn(`[APPLICATIONS FILTERS API] ${timestamp} - Error closing pool:`, poolError)
        }
      }
    }

  } catch (error) {
    console.error('[APPLICATIONS FILTERS API] Error:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch filter options',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}