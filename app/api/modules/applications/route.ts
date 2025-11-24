import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    
    const timestamp = new Date().toISOString()
    console.log(`[APPLICATIONS API] ${timestamp} - Fetching applications data (limit: ${limit})`)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // NO LOCAL FALLBACK: Call FastAPI container directly
    try {
      const url = `${apiBaseUrl}/api/modules/applications?limit=${limit}`
      console.log(`[APPLICATIONS API] ${timestamp} - Calling FastAPI: ${url}`)
      
      // Get managed identity principal ID from Azure Container Apps
      const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
      
      // For localhost, use passphrase authentication
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
      
      // Prioritize passphrase if available (for local dev or when explicitly configured)
      if (process.env.REPORTMATE_PASSPHRASE) {
        headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
      } else if (managedIdentityId) {
        headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
      }
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const applicationsData = await response.json()
      console.log(`[APPLICATIONS API] ${timestamp} - Successfully fetched ${applicationsData.length || 0} applications from FastAPI`)
      
      return NextResponse.json(applicationsData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-container'
        }
      })
      
    } catch (apiError) {
      console.error(`[APPLICATIONS API] ${timestamp} - FastAPI error:`, apiError)
      
      // NO FAKE DATA: Return error when real API fails
      return NextResponse.json({
        error: 'Applications data not available',
        message: 'No real data available from API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
  } catch (error) {
    console.error('[APPLICATIONS API] Failed to fetch applications data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
