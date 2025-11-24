import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INVENTORY API] ${timestamp} - Fetching bulk inventory data from FastAPI`)
    
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${apiBaseUrl}/api/devices/inventory`
    console.log(`[INVENTORY API] Calling: ${fastApiUrl}`)
    
    // Get managed identity principal ID from Azure Container Apps
    const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
    
    // For localhost, use passphrase authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Prioritize passphrase if available (for local dev or when explicitly configured)
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    } else if (managedIdentityId) {
      headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
    }
    
    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`)
    }
    
    const inventoryData = await response.json()
    
    console.log(`[INVENTORY API] Received ${Array.isArray(inventoryData) ? inventoryData.length : 0} devices with inventory data`)
    
    return NextResponse.json(inventoryData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-inventory'
      }
    })
    
  } catch (error) {
    console.error('[INVENTORY API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch inventory',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
