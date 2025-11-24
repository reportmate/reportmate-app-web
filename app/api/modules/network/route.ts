import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[NETWORK API] ${timestamp} - Fetching network data from FastAPI`)
    
    // Fetch from FastAPI - use dedicated bulk network endpoint
    const apiBaseUrl = process.env.API_BASE_URL;
    
    if (!apiBaseUrl) {
      return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
    }
    
    // Get managed identity principal ID from Azure Container Apps
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    
    // For localhost, use passphrase authentication
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'User-Agent': 'ReportMate-Frontend/1.0'
    }
    
    // Prioritize passphrase if available (for local dev or when explicitly configured)
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    } else if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }

    const response = await fetch(`${apiBaseUrl}/api/devices/network`, {
      headers
    })
    
    if (!response.ok) {
      throw new Error(`Azure Functions API error: ${response.status}`)
    }
    
    const networkData = await response.json()
    console.log(`[NETWORK API] ${timestamp} - FastAPI returned ${Array.isArray(networkData) ? networkData.length : 0} network records`)
    
    // If we got an array, it's already in the correct format from FastAPI
    if (Array.isArray(networkData)) {
      return NextResponse.json(networkData, {
        headers: { 
          'X-Fetched-At': timestamp, 
          'X-Data-Source': 'fastapi-devices-network',
          'X-Records-Count': String(networkData.length)
        }
      })
    }
    
    // If we got an empty result or unexpected format, return empty array
    console.log(`[NETWORK API] ${timestamp} - No network data available`)
    return NextResponse.json([], {
      headers: { 
        'X-Fetched-At': timestamp, 
        'X-Data-Source': 'fastapi-devices-network-empty',
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
