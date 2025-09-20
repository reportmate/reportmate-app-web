import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[NETWORK API] ${timestamp} - Fetching network data from Azure Functions`)
    
    // Fetch from Azure Functions API - use dedicated network endpoint
    const apiBaseUrl = process.env.API_BASE_URL || 'https://reportmate-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
    
    const response = await fetch(`${apiBaseUrl}/api/network`, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })
    
    if (!response.ok) {
      throw new Error(`Azure Functions API error: ${response.status}`)
    }
    
    const networkData = await response.json()
    console.log(`[NETWORK API] ${timestamp} - Azure Functions returned ${Array.isArray(networkData) ? networkData.length : 0} network records`)
    
    // If we got an array, it's already in the correct format from Azure Functions
    if (Array.isArray(networkData)) {
      return NextResponse.json(networkData, {
        headers: { 
          'X-Fetched-At': timestamp, 
          'X-Data-Source': 'azure-functions-network',
          'X-Records-Count': String(networkData.length)
        }
      })
    }
    
    // If we got an empty result or unexpected format, return empty array
    console.log(`[NETWORK API] ${timestamp} - No network data available`)
    return NextResponse.json([], {
      headers: { 
        'X-Fetched-At': timestamp, 
        'X-Data-Source': 'azure-functions-network-empty',
        'X-Records-Count': '0'
      }
    })
    
  } catch (error) {
    console.error('[NETWORK API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch network data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
