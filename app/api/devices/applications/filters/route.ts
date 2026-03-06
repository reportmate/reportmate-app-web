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
    
    // Use FastAPI server-side filters endpoint (SQL DISTINCT queries)
    // This returns ~100KB instead of downloading 131MB of all application records
    const baseUrl = CONTAINER_APPS_API_BASE
    const headers = getInternalApiHeaders()
    
    const response = await fetch(`${baseUrl}/api/devices/applications/filters`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      console.error('[APPLICATIONS FILTERS API] Failed to fetch filters:', response.status, response.statusText)
      throw new Error(`Failed to fetch application filters: ${response.status}`)
    }

    const data = await response.json()
    
    // Normalize and filter application names (same logic as before)
    const normalizedAppNames = new Set<string>()
    const rawNames: string[] = data.applicationNames || []
    
    for (const appName of rawNames) {
      if (appName && shouldIncludeApplication(appName)) {
        const normalized = normalizeAppName(appName)
        if (normalized) {
          normalizedAppNames.add(normalized)
        }
      }
    }
    
    // Filter publishers 
    const filteredPublishers = (data.publishers || []).filter((p: string) => p && p.trim())

    const filterOptions = {
      devices: data.devices || [],
      applicationNames: Array.from(normalizedAppNames).sort(),
      publishers: filteredPublishers.sort(),
      categories: (data.categories || []).filter((c: string) => c && c.trim()).sort(),
      versions: [],
      usages: data.usages || [],
      catalogs: data.catalogs || [],
      locations: data.locations || [],
      rooms: data.rooms || [],
      fleets: data.fleets || [],
      devicesWithData: data.devicesWithData || 0
    }
    
    return NextResponse.json(filterOptions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-filters-endpoint'
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