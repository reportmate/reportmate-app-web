import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    
    // Get the request body
    const requestData = await request.json()
    
    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[DEVICE API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
        
    // Get managed identity principal ID from Azure Container Apps
    const _managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID

    // Try Azure Functions first, fall back to local processing if it fails
    let response: Response | null = null
    let useLocalFallback = false
    
    try {
      // Use internal secret authentication for container-to-container communication
      const headers = getInternalApiHeaders()
      headers['Content-Type'] = 'application/json'

      // Forward the request to Azure Functions /api/device endpoint
      response = await fetch(`${apiBaseUrl}/api/device`, {
        method: 'POST',
        headers,
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
            return NextResponse.json(
        { error: 'Service temporarily unavailable - cloud infrastructure error' },
        { status: 503 }
      )
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
      
      // Azure Functions failed - return error
            
      return NextResponse.json({
        success: false,
        error: 'Failed to process device data',
        details: `Azure Functions returned ${response.status}: ${response.statusText}`
      }, { 
        status: response.status,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // If we reach here, Azure Functions succeeded
    if (response) {
      const data = await response.json()
            
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
  const _timestamp = new Date().toISOString()
    
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}

// NO LOCAL FALLBACK PROCESSING - Removed per instructions
// All data must come from Azure Functions API or return proper errors
