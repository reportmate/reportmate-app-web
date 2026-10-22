import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'
import { normalizeAppNameForFilters } from '@/src/lib/applications/appNames'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Ultra-robust application name normalization (same as page)


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

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    
    // Use FastAPI server-side filters endpoint (SQL DISTINCT queries)
    // This returns ~100KB instead of downloading 131MB of all application records
    const baseUrl = CONTAINER_APPS_API_BASE
    const headers = getInternalApiHeaders()
    
    const response = await fetch(`${baseUrl}/api/v1/applications/filters`, {
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
        const normalized = normalizeAppNameForFilters(appName)
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
      areas: data.areas || [],
      fleets: Array.from(new Set(
        ((data.fleets || []) as string[])
          .map(f => (typeof f === 'string' ? f.replace(/[,;]+\s*$/, '').trim() : ''))
          .filter(Boolean)
      )).sort(),
      devicesWithData: data.devicesWithData || 0
    }
    
    return NextResponse.json(filterOptions, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
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
