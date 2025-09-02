import { NextResponse, NextRequest } from 'next/server'
import { extractInstalls } from '@/src/lib/data-processing/modules/installs'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[INSTALLS API] ${timestamp} - Fetching installs data`)

    // Get device parameter from URL
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device')
    
    if (!deviceId) {
      console.error(`[INSTALLS API] ${timestamp} - Device ID parameter required`)
      return NextResponse.json({
        error: 'Device ID required',
        details: 'Please provide device parameter in query string'
      }, { status: 400 })
    }

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[INSTALLS API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // Fetch device data first to get the installs module data
    console.log(`[INSTALLS API] ${timestamp} - Fetching device data for: ${deviceId}`)
    
    try {
      const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
      })
      
      if (!deviceResponse.ok) {
        console.error(`[INSTALLS API] ${timestamp} - Device API error:`, deviceResponse.status, deviceResponse.statusText)
        return NextResponse.json({
          error: 'Failed to fetch device data',
          details: `Device API returned ${deviceResponse.status}: ${deviceResponse.statusText}`
        }, { status: 502 })
      }
      
      const deviceData = await deviceResponse.json()
      console.log(`[INSTALLS API] ${timestamp} - Device data received successfully`)
      
      // Extract installs data using the ReportMate processing module
      if (deviceData.success && deviceData.device && deviceData.device.modules) {
        console.log(`[INSTALLS API] ${timestamp} - Processing installs data with ReportMate module`)
        const installsInfo = extractInstalls(deviceData.device.modules)
        
        console.log(`[INSTALLS API] ${timestamp} - Installs processing complete:`, {
          totalPackages: installsInfo.totalPackages,
          installed: installsInfo.installed,
          pending: installsInfo.pending,
          failed: installsInfo.failed,
          errorsFound: installsInfo.messages?.errors.length || 0,
          warningsFound: installsInfo.messages?.warnings.length || 0
        })
        
        return NextResponse.json({
          success: true,
          data: installsInfo,
          timestamp: timestamp,
          device: deviceId
        }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'device-api-processed'
          }
        })
      } else {
        console.error(`[INSTALLS API] ${timestamp} - Invalid device data structure`)
        return NextResponse.json({
          error: 'Invalid device data structure',
          details: 'Device data does not contain expected modules structure'
        }, { status: 502 })
      }
      
    } catch (deviceError) {
      console.error(`[INSTALLS API] ${timestamp} - Failed to fetch device data:`, deviceError)
      return NextResponse.json({
        error: 'Failed to fetch device data',
        details: deviceError instanceof Error ? deviceError.message : String(deviceError)
      }, { status: 502 })
    }
  } catch (error) {
    console.error('[INSTALLS API] Error processing installs data:', error)
    return NextResponse.json({
      error: 'Failed to process installs data',
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