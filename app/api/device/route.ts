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
    
    // Try Azure Functions first, fall back to local processing if it fails
    let response: Response | null = null
    let useLocalFallback = false
    
    try {
      // Forward the request to Azure Functions /api/device endpoint
      response = await fetch(`${apiBaseUrl}/api/device`, {
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
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[DEVICE API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    // Fallback to local database processing if Azure Functions failed
    if (useLocalFallback) {
      console.log(`[DEVICE API] ${timestamp} - Using local database fallback`)
      
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
          details: `Azure Functions failed and local fallback also failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`
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
    
    // If Azure Functions succeeded, process the response
    if (response && response.ok) {
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

    // If we reach here, Azure Functions succeeded
    if (response) {
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
    } else {
      // This should not happen, but handle it gracefully
      console.error(`[DEVICE API] ${timestamp} - No response from Azure Functions and no fallback triggered`)
      return NextResponse.json({
        success: false,
        error: 'No response from Azure Functions'
      }, { status: 500 })
    }
    
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
    
    // Process each module and create module-specific events
    const processedModules = []
    const eventIds = []
    
    for (const module of enabledModules) {
      if (deviceData[module]) {
        console.log(`[LOCAL PROCESSING] ${timestamp} - Processing ${module} module`)
        
        // Store module data in module-specific table
        const moduleQuery = `
          INSERT INTO ${module} (device_id, data, collected_at, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW(), NOW())
          ON CONFLICT (device_id) 
          DO UPDATE SET 
            data = EXCLUDED.data,
            collected_at = EXCLUDED.collected_at,
            updated_at = NOW()
          RETURNING id
        `
        
        const moduleResult = await pool.query(moduleQuery, [
          deviceId,
          JSON.stringify(deviceData[module])
        ])
        
        console.log(`[LOCAL PROCESSING] ${timestamp} - Updated ${module} table with ID: ${moduleResult.rows[0].id}`)
        
        // Create module-specific event
        const moduleEventQuery = `
          INSERT INTO events (device_id, event_type, message, timestamp, details) 
          VALUES ($1, $2, $3, NOW(), $4) 
          RETURNING id
        `
        const moduleEventResult = await pool.query(moduleEventQuery, [
          deviceId,
          'info',
          `Module '${module}' data collected and stored`,
          JSON.stringify({
            module_id: module,
            collection_type: 'modular',
            data_size_kb: Math.round(JSON.stringify(deviceData[module]).length / 1024),
            processing_method: 'local_fallback',
            timestamp: timestamp
          })
        ])
        
        processedModules.push(module)
        eventIds.push(moduleEventResult.rows[0].id)
        console.log(`[LOCAL PROCESSING] ${timestamp} - Created event for ${module} module with ID: ${moduleEventResult.rows[0].id}`)
      }
    }
    
    // Create summary event only if multiple modules processed
    let summaryEventId = null
    if (processedModules.length > 1) {
      const summaryEventQuery = `
        INSERT INTO events (device_id, event_type, message, timestamp, details) 
        VALUES ($1, $2, $3, NOW(), $4) 
        RETURNING id
      `
      const summaryEventResult = await pool.query(summaryEventQuery, [
        deviceId,
        'info',
        `Data collection completed for ${processedModules.length} modules`,
        JSON.stringify({
          modules: processedModules,
          collection_type: 'routine',
          module_id: 'system',
          processing_method: 'local_fallback',
          processed_locally: true,
          processing_timestamp: timestamp
        })
      ])
      summaryEventId = summaryEventResult.rows[0].id
      console.log(`[LOCAL PROCESSING] ${timestamp} - Created summary event with ID: ${summaryEventId}`)
    }
    
    console.log(`[LOCAL PROCESSING] ${timestamp} - Local processing completed successfully`)
    
    return {
      success: true,
      message: 'Device data processed locally',
      processed_modules: processedModules,
      event_ids: eventIds,
      summary_event_id: summaryEventId,
      processing_method: 'local_fallback'
    }
    
  } catch (error) {
    console.error(`[LOCAL PROCESSING] ${timestamp} - Error in local processing:`, error)
    throw error
  } finally {
    await pool.end()
  }
}
