import { NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEVICE API] ${timestamp} - Received POST request for device data ingestion`)

    // Get the request body
    const requestData = await request.json()
    console.log(`[DEVICE API] ${timestamp} - Request data:`, JSON.stringify(requestData, null, 2))

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[DEVICE API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log(`[DEVICE API] ${timestamp} - Forwarding to Azure Functions API:`, apiBaseUrl)
    
    // Forward the request to Azure Functions /api/device endpoint
    const response = await fetch(`${apiBaseUrl}/api/device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
      },
      body: JSON.stringify(requestData)
    })
    
    if (!response.ok) {
      console.error(`[DEVICE API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
      
      // Get error details from the response
      let errorText = ''
      try {
        errorText = await response.text()
        console.error(`[DEVICE API] ${timestamp} - Error response body:`, errorText)
      } catch (e) {
        console.error(`[DEVICE API] ${timestamp} - Could not read error response body:`, e)
      }
      
      // Azure Functions failed, try local processing as fallback
      console.log(`[DEVICE API] ${timestamp} - Azure Functions failed, attempting local processing...`)
      
      try {
        const localResult = await processDeviceDataLocally(requestData, timestamp)
        console.log(`[DEVICE API] ${timestamp} - Local processing successful`)
        return NextResponse.json(localResult, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      } catch (localError) {
        console.error(`[DEVICE API] ${timestamp} - Local processing also failed:`, localError)
        return NextResponse.json({
          success: false,
          error: 'Failed to process device data',
          details: `Azure Functions returned ${response.status}: ${response.statusText}. Local fallback also failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`,
          errorBody: errorText
        }, { 
          status: response.status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
    }

    const data = await response.json()
    console.log(`[DEVICE API] ${timestamp} - Successfully processed device data`)
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    const timestamp = new Date().toISOString()
    console.error(`[DEVICE API] ${timestamp} - Error processing device data:`, error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
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

// Also support HEAD requests for endpoint availability checks
export async function HEAD() {
  const timestamp = new Date().toISOString()
  console.log(`[DEVICE API] ${timestamp} - Received HEAD request for endpoint availability check`)
  
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}

// Local fallback processing function for when Azure Functions is unavailable
async function processDeviceDataLocally(deviceData: any, timestamp: string) {
  console.log(`[LOCAL PROCESSING] ${timestamp} - Starting local device data processing`)
  
  // Import database connection
  const { Pool } = require('pg')
  const pool = new Pool({
    connectionString: 'postgresql://reportmate:2sSWbVxyqjXp9WUpeMmzRaC@reportmate-database.postgres.database.azure.com:5432/reportmate?sslmode=require'
  })
  
  try {
    // Extract key device information
    const deviceId = deviceData.device || deviceData.metadata?.serialNumber || 'unknown'
    const collectionType = deviceData.metadata?.collectionType || 'Unknown'
    const enabledModules = deviceData.metadata?.enabledModules || []
    const clientVersion = deviceData.metadata?.clientVersion || 'Unknown'
    
    console.log(`[LOCAL PROCESSING] ${timestamp} - Processing device: ${deviceId}, modules: ${enabledModules.join(', ')}`)
    
    // Create event record for the device data
    const eventData = {
      device: deviceId,
      kind: 'info',
      payload: {
        device_name: deviceId,
        serial_number: deviceId,
        client_version: clientVersion,
        collection_type: collectionType,
        enabled_modules: enabledModules,
        modules_processed: enabledModules.length,
        processed_locally: true,
        processing_timestamp: timestamp
      }
    }
    
    // Insert event into events table
    const eventQuery = `
      INSERT INTO events (device_id, event_type, message, timestamp, details) 
      VALUES ($1, $2, $3, NOW(), $4) 
      RETURNING id
    `
    const eventResult = await pool.query(eventQuery, [
      deviceId,
      'info',
      `Device data processed locally for modules: ${enabledModules.join(', ')}`,
      JSON.stringify(eventData.payload)
    ])
    
    console.log(`[LOCAL PROCESSING] ${timestamp} - Created event with ID: ${eventResult.rows[0].id}`)
    
    // Process installs data if present
    if (deviceData.installs && enabledModules.includes('installs')) {
      console.log(`[LOCAL PROCESSING] ${timestamp} - Processing installs data`)
      
      // Update or insert into installs table
      const installsQuery = `
        INSERT INTO installs (device_id, data, collected_at, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW(), NOW())
        ON CONFLICT (device_id) 
        DO UPDATE SET 
          data = EXCLUDED.data,
          collected_at = EXCLUDED.collected_at,
          updated_at = NOW()
        RETURNING id
      `
      
      const installsResult = await pool.query(installsQuery, [
        deviceId,
        JSON.stringify(deviceData.installs)
      ])
      
      console.log(`[LOCAL PROCESSING] ${timestamp} - Updated installs table with ID: ${installsResult.rows[0].id}`)
    }
    
    console.log(`[LOCAL PROCESSING] ${timestamp} - Local processing completed successfully`)
    
    return {
      success: true,
      message: 'Device data processed locally',
      processed_modules: enabledModules,
      event_id: eventResult.rows[0].id,
      processing_method: 'local_fallback'
    }
    
  } catch (error) {
    console.error(`[LOCAL PROCESSING] ${timestamp} - Error in local processing:`, error)
    throw error
  } finally {
    await pool.end()
  }
}
