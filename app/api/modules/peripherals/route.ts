import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Peripherals API Route - Proxy to FastAPI
 * Architecture: Next.js (proxy) → FastAPI (data layer) → PostgreSQL
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[PERIPHERALS API] ${timestamp} - Fetching bulk peripherals data from FastAPI`)
    
    const API_BASE_URL = process.env.API_BASE_URL
    if (!API_BASE_URL) {
      throw new Error('API_BASE_URL not configured')
    }
    
    const fastApiUrl = `${API_BASE_URL}/api/devices/peripherals`
    console.log(`[PERIPHERALS API] Calling: ${fastApiUrl}`)
    
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
    
    const peripheralsData = await response.json()
    
    console.log(`[PERIPHERALS API] Received ${Array.isArray(peripheralsData) ? peripheralsData.length : 0} devices with peripherals data`)
    
    return NextResponse.json(peripheralsData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Fetched-At': timestamp,
        'X-Data-Source': 'fastapi-bulk-peripherals'
      }
    })
    
  } catch (error) {
    console.error('[PERIPHERALS API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch peripherals',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
