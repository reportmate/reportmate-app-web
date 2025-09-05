import { NextResponse } from 'next/server'

// Cache for bulk applications data
let applicationsCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[BULK APPLICATIONS API] ${timestamp} - Fetching bulk applications data`)

    // Check cache first
    const now = Date.now()
    if (applicationsCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log(`[BULK APPLICATIONS API] ${timestamp} - Serving from cache: ${applicationsCache.length} applications`)
      return NextResponse.json(applicationsCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': new Date(cacheTimestamp).toISOString(),
          'X-Data-Source': 'in-memory-cache'
        }
      })
    }

    console.log(`[BULK APPLICATIONS API] ${timestamp} - Fetching fresh data`)

    // Get database connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })

    try {
      // Get all devices with their application data in a single optimized query
      const query = `
        SELECT DISTINCT ON (d.serial_number)
          d.serial_number,
          d.device_id,
          d.last_seen,
          d.created_at,
          a.data as applications_data,
          a.collected_at as applications_collected_at,
          a.updated_at as applications_updated_at,
          -- Get device name from inventory
          inv.data->>'deviceName' as device_name,
          inv.data->>'computerName' as computer_name
        FROM devices d
        LEFT JOIN applications a ON d.id = a.device_id
        LEFT JOIN inventory inv ON d.id = inv.device_id
        WHERE d.serial_number IS NOT NULL
          AND d.serial_number NOT LIKE 'TEST-%'
          AND d.serial_number != 'localhost'
          AND a.data IS NOT NULL  -- Only include devices that have application data
        ORDER BY d.serial_number, a.updated_at DESC, inv.updated_at DESC
      `

      const result = await pool.query(query)
      console.log(`[BULK APPLICATIONS API] ${timestamp} - Got ${result.rows.length} device records with applications from database`)

      // Process and flatten the application data
      const allApplications: any[] = []
      
      for (const row of result.rows) {
        try {
          const serialNumber = row.serial_number
          const deviceName = row.device_name || row.computer_name || serialNumber || 'Unknown Device'
          const applicationsData = row.applications_data

          if (!applicationsData) continue

          // Extract applications from the data structure
          let installedApps: any[] = []
          
          if (applicationsData.installedApplications) {
            installedApps = applicationsData.installedApplications
          } else if (applicationsData.InstalledApplications) {
            installedApps = applicationsData.InstalledApplications
          } else if (applicationsData.installed_applications) {
            installedApps = applicationsData.installed_applications
          }

          // Transform each application to the expected format
          installedApps.forEach((app: any, index: number) => {
            allApplications.push({
              id: `${row.device_id}_${index}`,
              deviceId: row.device_id,
              deviceName: deviceName,
              serialNumber: serialNumber,
              lastSeen: row.last_seen,
              collectedAt: row.applications_collected_at || row.last_seen,
              // Application-specific fields
              name: app.name || app.displayName || 'Unknown Application',
              version: app.version || app.bundle_version || 'Unknown',
              vendor: app.publisher || app.signed_by || app.vendor || 'Unknown',
              publisher: app.publisher || app.signed_by || app.vendor || 'Unknown',
              category: app.category || 'Other',
              installDate: app.installDate || app.install_date || app.last_modified,
              size: app.size || app.estimatedSize,
              path: app.path || app.install_location,
              architecture: app.architecture || 'Unknown',
              bundleId: app.bundleId || app.bundle_id,
              raw: app // Include raw data for detailed views
            })
          })

        } catch (error) {
          console.warn(`[BULK APPLICATIONS API] Error processing device ${row.serial_number}:`, error)
        }
      }

      await pool.end()

      // Update cache
      applicationsCache = allApplications
      cacheTimestamp = now

      console.log(`[BULK APPLICATIONS API] ${timestamp} - Processed ${allApplications.length} applications from ${result.rows.length} devices`)
      
      return NextResponse.json(allApplications, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'database-fresh'
        }
      })

    } finally {
      // Ensure pool is closed
      try {
        await pool.end()
      } catch (poolError) {
        console.warn(`[BULK APPLICATIONS API] ${timestamp} - Error closing pool:`, poolError)
      }
    }

  } catch (error) {
    console.error('[BULK APPLICATIONS API] Error:', error)
    
    // If we have cached data, return it even if fresh fetch fails
    if (applicationsCache.length > 0) {
      console.log(`[BULK APPLICATIONS API] Falling back to stale cache: ${applicationsCache.length} applications`)
      return NextResponse.json(applicationsCache, {
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
      error: 'Failed to fetch bulk applications data',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
