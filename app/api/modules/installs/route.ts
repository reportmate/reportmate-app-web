import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INSTALLS API] ${timestamp} - Fetching installs data`)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[INSTALLS API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/installs`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[INSTALLS API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[INSTALLS API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    // Fallback to local database query if Azure Functions API fails
    if (useLocalFallback) {
      console.log(`[INSTALLS API] ${timestamp} - Using local database fallback`)
      
      try {
        const { Pool } = require('pg')
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL
        })

        const result = await pool.query(`
          SELECT 
            i.device_id,
            d.name as device_name,
            d.serial_number,
            d.last_seen,
            i.data,
            i.collected_at,
            i.created_at,
            inv.data as inventory_data
          FROM installs i
          JOIN devices d ON i.device_id = d.id
          LEFT JOIN inventory inv ON i.device_id = inv.device_id
          ORDER BY i.updated_at DESC
          LIMIT 1000
        `)
        
        const installsData = result.rows.map((row: any) => {
          const data = row.data || {}
          const inventoryData = row.inventory_data || {}
          
          // Prioritize device name from inventory module, fallback to devices table name
          const deviceName = inventoryData.deviceName || row.device_name || 'Unknown Device'
          
          return {
            id: row.device_id,
            deviceId: row.device_id,
            deviceName: deviceName,
            serialNumber: row.serial_number,
            lastSeen: row.last_seen,
            collectedAt: row.collected_at,
            // Installs-specific fields
            totalPackages: data.packages?.length || 0,
            installed: data.packages?.filter((p: any) => p.status?.toLowerCase() === 'installed').length || 0,
            pending: data.packages?.filter((p: any) => p.status?.toLowerCase() === 'pending').length || 0,
            failed: data.packages?.filter((p: any) => p.status?.toLowerCase() === 'failed' || p.status?.toLowerCase() === 'error').length || 0,
            lastUpdate: data.lastUpdate || data.last_update || null,
            packages: data.packages || [],
            // Raw data for debugging
            raw: data
          }
        })
        
        console.log(`[INSTALLS API] ${timestamp} - Successfully fetched ${installsData.length} install records from local database`)
        
        return NextResponse.json(installsData, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[INSTALLS API] ${timestamp} - Local database error:`, dbError)
        return NextResponse.json({
          error: 'Database error',
          details: 'Failed to fetch installs data from both API and database'
        }, { status: 500 })
      }
    }
    
    // If we get here, Azure Functions API worked
    if (!response) {
      throw new Error('Response is undefined')
    }
    
    const data = await response.json()
    console.log(`[INSTALLS API] ${timestamp} - Successfully received data from Azure Functions API`)
    
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
    console.error('[INSTALLS API] Failed to fetch installs data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({
      error: 'API request failed',
      details: errorMessage
    }, { status: 500 })
  }
}
