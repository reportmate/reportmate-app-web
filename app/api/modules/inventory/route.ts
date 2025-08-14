import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create database connection directly in this file to avoid import issues
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INVENTORY API] ${timestamp} - Fetching inventory data`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[INVENTORY API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/inventory`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
        }
      })
      
      if (!response.ok) {
        console.error(`[INVENTORY API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[INVENTORY API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    if (useLocalFallback) {
      console.log(`[INVENTORY API] ${timestamp} - Azure Functions API unavailable - querying database directly`)
      
      try {
        // Query the database directly for inventory data        
        const inventoryQuery = `
          SELECT 
            d.id as deviceId,
            d.serial_number as serialNumber,
            d.name as deviceName,
            d.last_seen as lastSeen,
            i.data,
            i.collected_at as collectedAt,
            d.manufacturer,
            d.model
          FROM devices d
          LEFT JOIN inventory i ON d.id = i.device_id
          WHERE d.serial_number IS NOT NULL 
            AND d.serial_number != ''
            AND d.serial_number NOT LIKE 'TEST-%'
            AND d.serial_number != 'localhost'
          ORDER BY d.last_seen DESC
        `
        
        const result = await pool.query(inventoryQuery)
        console.log(`[INVENTORY API] ${timestamp} - Found ${result.rows.length} devices in database`)
        
        const inventoryData = result.rows.map((row: any) => {
          const inventoryJsonData = row.data || {}
          
          const processedItem = {
            id: row.deviceid,
            deviceId: row.deviceid,
            deviceName: inventoryJsonData.deviceName || row.devicename || row.serialnumber || row.deviceid,
            serialNumber: row.serialnumber,
            lastSeen: row.lastseen,
            collectedAt: row.collectedat,
            // Extract inventory fields from the JSON data
            assetTag: inventoryJsonData.assetTag || inventoryJsonData.asset_tag || null,
            location: inventoryJsonData.location || null,
            usage: inventoryJsonData.usage || null,
            catalog: inventoryJsonData.catalog || null,
            computerName: inventoryJsonData.computerName || inventoryJsonData.computer_name || row.devicename,
            domain: inventoryJsonData.domain || null,
            organizationalUnit: inventoryJsonData.organizationalUnit || inventoryJsonData.organizational_unit || null,
            manufacturer: row.manufacturer || inventoryJsonData.manufacturer || null,
            model: row.model || inventoryJsonData.model || null,
            uuid: inventoryJsonData.uuid || inventoryJsonData.device_id || null,
            raw: inventoryJsonData
          }
          
          return processedItem
        })
        
        console.log(`[INVENTORY API] ${timestamp} - Processed ${inventoryData.length} inventory items from database`)
        
        return NextResponse.json(inventoryData, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache', 
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'direct-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[INVENTORY API] ${timestamp} - Database fallback error:`, dbError)
        
        // Return empty array instead of error to prevent UI issues
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache', 
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'empty-fallback',
            'X-Error': 'Database query failed'
          }
        })
      }
    }
    
    // Continue with Azure Functions API response processing if we have a valid response
    if (response) {
      const data = await response.json()
      console.log(`[INVENTORY API] ${timestamp} - Successfully received data from Azure Functions API`)
      
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'azure-functions'
        }
      })
    }
    
    // This should not be reached since we handle the fallback above
    return NextResponse.json({
      error: 'Unexpected error in API routing'
    }, { status: 500 })

  } catch (error) {
    console.error('[INVENTORY API] Error fetching inventory:', error)
    return NextResponse.json({
      error: 'Failed to fetch inventory data',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}
