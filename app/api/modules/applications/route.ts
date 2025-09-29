import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    
    const timestamp = new Date().toISOString()
    console.log(`[APPLICATIONS API] ${timestamp} - Fetching applications data (limit: ${limit})`)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[APPLICATIONS API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      // Use Azure Managed Identity for authentication (no passphrase needed for internal Azure-to-Azure communication)
      response = await fetch(`${apiBaseUrl}/api/applications`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
      })
      
      if (!response.ok) {
        console.error(`[APPLICATIONS API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[APPLICATIONS API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    // Fallback to local database query if Azure Functions API fails
    if (useLocalFallback) {
      console.log(`[APPLICATIONS API] ${timestamp} - Azure Functions API failed - NO FALLBACK ALLOWED`)
      return NextResponse.json(
        { error: 'Service temporarily unavailable - cloud infrastructure error' },
        { status: 503 }
      )
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })

        const result = await pool.query(`
          SELECT 
            a.device_id,
            d.name as device_name,
            d.serial_number,
            d.last_seen,
            a.data,
            a.collected_at,
            a.created_at
          FROM applications a
          JOIN devices d ON a.device_id = d.id
          ORDER BY a.updated_at DESC
          LIMIT $1
        `, [limit])
        
        // Flatten applications data to create individual records for each app
        const applicationsData: any[] = []
        
        result.rows.forEach((row: any) => {
          const data = row.data || {}
          const apps = data.applications || data.installedApplications || []
          
          apps.forEach((app: any, index: number) => {
            applicationsData.push({
              id: `${row.device_id}_${index}`,
              deviceId: row.device_id,
              deviceName: row.device_name || 'Unknown Device',
              serialNumber: row.serial_number,
              lastSeen: row.last_seen,
              collectedAt: row.collected_at,
              // Application-specific fields
              name: app.name || app.displayName || app.applicationName || 'Unknown Application',
              version: app.version || app.displayVersion || null,
              publisher: app.publisher || app.vendor || null,
              installDate: app.installDate || app.installed_date || null,
              size: app.size || app.estimatedSize || null,
              path: app.path || app.installPath || null,
              bundleId: app.bundleId || app.bundle_id || null,
              category: app.category || null,
              // Raw app data
              rawApp: app
            })
          })
        })
        
        console.log(`[APPLICATIONS API] ${timestamp} - Successfully processed ${applicationsData.length} application records from local database`)
        
        return NextResponse.json(applicationsData, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[APPLICATIONS API] ${timestamp} - Local database error:`, dbError)
        return NextResponse.json({
          error: 'Database error',
          details: 'Failed to fetch applications data from both API and database'
        }, { status: 500 })
      }
    }
    
    // If we get here, Azure Functions API worked
    if (!response) {
      throw new Error('Response is undefined')
    }
    
    const data = await response.json()
    console.log(`[APPLICATIONS API] ${timestamp} - Successfully received data from Azure Functions API`)
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'azure-functions'
      }
    })
    
  } catch (error) {
    console.error('[APPLICATIONS API] Failed to fetch applications data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({
      error: 'API request failed',
      details: errorMessage
    }, { status: 500 })
  }
}
