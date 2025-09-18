import { NextResponse } from 'next/server'

// Cache for bulk applications data
let applicationsCache: any[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    
    // Parse filter parameters
    const deviceNames = searchParams.getAll('deviceNames')
    const applicationNames = searchParams.getAll('applicationNames')
    const publishers = searchParams.getAll('publishers')
    const categories = searchParams.getAll('categories')
    const versions = searchParams.getAll('versions')
    const searchQuery = searchParams.get('search')
    const installDateFrom = searchParams.get('installDateFrom')
    const installDateTo = searchParams.get('installDateTo')
    const sizeMin = searchParams.get('sizeMin')
    const sizeMax = searchParams.get('sizeMax')
    const loadAll = searchParams.get('loadAll') === 'true'
    
    const hasFilters = !loadAll && (
      deviceNames.length > 0 || applicationNames.length > 0 || publishers.length > 0 ||
      categories.length > 0 || versions.length > 0 || searchQuery ||
      installDateFrom || installDateTo || sizeMin || sizeMax
    )
    
    console.log(`[BULK APPLICATIONS API] ${timestamp} - Fetching applications${hasFilters ? ' with filters' : ' (load all)'}:`, {
      deviceNames: deviceNames.length,
      applicationNames: applicationNames.length,
      publishers: publishers.length,
      categories: categories.length,
      searchQuery,
      loadAll
    })

    // Only use cache for "load all" requests, not filtered requests
    if (loadAll && !hasFilters) {
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
    }

    console.log(`[BULK APPLICATIONS API] ${timestamp} - Fetching fresh data`)

    // Get database connection
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    let poolClosed = false

    try {
      // Build WHERE clause based on device filters
      let deviceWhereClause = ''
      const queryParams: any[] = []
      let paramIndex = 1

      if (deviceNames.length > 0) {
        const deviceNamePlaceholders = deviceNames.map(() => `$${paramIndex++}`).join(',')
        deviceWhereClause += ` AND (inv.data->>'deviceName' IN (${deviceNamePlaceholders}) OR inv.data->>'computerName' IN (${deviceNamePlaceholders}) OR d.serial_number IN (${deviceNamePlaceholders}))`
        queryParams.push(...deviceNames, ...deviceNames, ...deviceNames)
      }

      // Get all devices with their application data
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
          inv.data->>'computerName' as computer_name,
          -- Get inventory data for filtering
          inv.data->>'usage' as inventory_usage,
          inv.data->>'catalog' as inventory_catalog,
          inv.data->>'location' as inventory_location,
          inv.data->>'assetTag' as inventory_asset_tag
        FROM devices d
        LEFT JOIN applications a ON d.id = a.device_id
        LEFT JOIN inventory inv ON d.id = inv.device_id
        WHERE d.serial_number IS NOT NULL
          AND d.serial_number NOT LIKE 'TEST-%'
          AND d.serial_number != 'localhost'
          AND a.data IS NOT NULL  -- Only include devices that have application data
          ${deviceWhereClause}
        ORDER BY d.serial_number, a.updated_at DESC, inv.updated_at DESC
      `

      const result = await pool.query(query, queryParams)
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

          // Transform and filter each application
          installedApps.forEach((app: any, index: number) => {
            const appName = app.name || app.displayName || 'Unknown Application'
            const appPublisher = app.publisher || app.signed_by || app.vendor || 'Unknown'
            const appCategory = app.category || 'Other'
            const appVersion = app.version || app.bundle_version || 'Unknown'
            const appSize = app.size || app.estimatedSize
            const appInstallDate = app.installDate || app.install_date || app.last_modified

            // Apply application-level filters
            if (applicationNames.length > 0 && !applicationNames.some(name => 
              appName.toLowerCase().includes(name.toLowerCase())
            )) return

            if (publishers.length > 0 && !publishers.some(pub => 
              appPublisher.toLowerCase().includes(pub.toLowerCase())
            )) return

            if (categories.length > 0 && !categories.includes(appCategory)) return

            if (versions.length > 0 && !versions.includes(appVersion)) return

            if (searchQuery && !appName.toLowerCase().includes(searchQuery.toLowerCase())) return

            // Size filtering
            if (sizeMin && appSize && appSize < parseInt(sizeMin)) return
            if (sizeMax && appSize && appSize > parseInt(sizeMax)) return

            // Date filtering (basic implementation)
            if (installDateFrom || installDateTo) {
              if (!appInstallDate) return
              const installDate = new Date(appInstallDate)
              if (installDateFrom && installDate < new Date(installDateFrom)) return
              if (installDateTo && installDate > new Date(installDateTo)) return
            }

            allApplications.push({
              id: `${row.device_id}_${index}`,
              deviceId: row.device_id,
              deviceName: deviceName,
              serialNumber: serialNumber,
              lastSeen: row.last_seen,
              collectedAt: row.applications_collected_at || row.last_seen,
              // Application-specific fields
              name: appName,
              version: appVersion,
              vendor: appPublisher,
              publisher: appPublisher,
              category: appCategory,
              installDate: appInstallDate,
              size: appSize,
              path: app.path || app.install_location,
              architecture: app.architecture || 'Unknown',
              bundleId: app.bundleId || app.bundle_id,
              // Include inventory data for filtering
              usage: row.inventory_usage,
              catalog: row.inventory_catalog,
              location: row.inventory_location,
              assetTag: row.inventory_asset_tag,
              raw: app // Include raw data for detailed views
            })
          })

        } catch (error) {
          console.warn(`[BULK APPLICATIONS API] Error processing device ${row.serial_number}:`, error)
        }
      }

      // Close pool connection - only once
      await pool.end()
      poolClosed = true

      // Only update cache for "load all" requests
      if (loadAll && !hasFilters) {
        applicationsCache = allApplications
        cacheTimestamp = Date.now()
      }

      console.log(`[BULK APPLICATIONS API] ${timestamp} - Processed ${allApplications.length} applications from ${result.rows.length} devices`)
      
      return NextResponse.json(allApplications, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'X-Fetched-At': timestamp,
          'X-Data-Source': hasFilters ? 'database-filtered' : 'database-fresh',
          'X-Filter-Applied': String(hasFilters)
        }
      })

    } finally {
      // Ensure pool is closed only if not already closed
      if (!poolClosed) {
        try {
          await pool.end()
        } catch (poolError) {
          console.warn(`[BULK APPLICATIONS API] ${timestamp} - Error closing pool:`, poolError)
        }
      }
    }

  } catch (error) {
    console.error('[BULK APPLICATIONS API] Error:', error)
    
    // If we have cached data and this was a "load all" request, return it even if fresh fetch fails
    const { searchParams: errorSearchParams } = new URL(request.url)
    const isLoadAllRequest = errorSearchParams.get('loadAll') === 'true'
    
    if (isLoadAllRequest && applicationsCache.length > 0) {
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