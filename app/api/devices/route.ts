import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Initialize Prisma client
const prisma = new PrismaClient()

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[DEVICES API] ${timestamp} - Fetching devices from Azure Functions API`)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error(`[DEVICES API] ${timestamp} - API_BASE_URL environment variable not configured`)
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log(`[DEVICES API] ${timestamp} - Using API base URL:`, apiBaseUrl)
    
    let response
    let useLocalFallback = false
    
    try {
      response = await fetch(`${apiBaseUrl}/api/devices`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.error(`[DEVICES API] ${timestamp} - Azure Functions API error:`, response.status, response.statusText)
        useLocalFallback = true
      }
    } catch (fetchError) {
      console.error(`[DEVICES API] ${timestamp} - Failed to reach Azure Functions API:`, fetchError)
      useLocalFallback = true
    }
    
    // Fallback to local database query if Azure Functions API fails
    if (useLocalFallback) {
      console.log(`[DEVICES API] ${timestamp} - Using local database fallback`)
      
      try {
        const devices = await prisma.device.findMany({
          orderBy: {
            lastSeen: 'desc'
          }
        })
        
        // Transform Prisma result to match expected format
        const transformedDevices = devices.map(device => ({
          id: device.id,
          name: device.name || 'Unknown Device',
          model: device.model || 'Unknown Model',
          os: device.os || 'Unknown OS',
          serialNumber: device.serialNumber || device.id,
          assetTag: device.assetTag || '',
          ipAddress: device.ipAddress || 'Unknown',
          ipAddressV4: device.ipAddress || '',
          ipAddressV6: '',
          macAddress: device.macAddress || 'Unknown',
          location: device.location || 'Unassigned',
          lastSeen: device.lastSeen?.toISOString() || null,
          status: device.status === 'Active' ? 'online' : (device.status || 'unknown').toLowerCase(),
          uptime: 0, // We don't have uptime data in Prisma model yet
          totalEvents: device.totalEvents || 0,
          lastEventTime: device.lastEventTime?.toISOString() || null,
          architecture: device.architecture || 'Unknown',
          processor: device.processor || 'Unknown',
          memory: device.memory || 'Unknown',
          osName: '',  // Will be populated once Prisma client is updated
          osVersion: '',
          osBuild: '',
          osArchitecture: ''
        }))
        
        console.log(`[DEVICES API] ${timestamp} - 🚀 Returning ${transformedDevices.length} devices from local database`)
        return NextResponse.json(transformedDevices, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Fetched-At': timestamp,
            'X-Data-Source': 'local-database'
          }
        })
        
      } catch (dbError) {
        console.error(`[DEVICES API] ${timestamp} - Local database query failed:`, dbError)
        return NextResponse.json({
          error: 'Failed to fetch devices from both Azure Functions API and local database',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        }, { status: 500 })
      }
    }
    
    // Continue with Azure Functions API response processing if we have a valid response
    if (response) {
      const data = await response.json()
      console.log(`[DEVICES API] ${timestamp} - Successfully fetched data from Azure Functions`)
      
      // CRITICAL FIX: Always extract devices array from Azure Functions response
      // Azure Functions returns: {"devices": [...], "count": 4}
      // Frontend expects: [device1, device2, ...]
      
      console.log('[DEVICES API] Raw response type:', typeof data)
      console.log('[DEVICES API] Raw response structure:', Object.keys(data || {}))
      
      let devicesArray = []
      
      if (data && data.devices && Array.isArray(data.devices)) {
        devicesArray = data.devices
        console.log(`[DEVICES API] ✅ Extracted ${devicesArray.length} devices from wrapped format`)
      } else if (Array.isArray(data)) {
        devicesArray = data
        console.log(`[DEVICES API] ✅ Using direct array format with ${devicesArray.length} devices`)
      } else {
        console.error('[DEVICES API] ❌ Invalid response format from Azure Functions:', data)
        return NextResponse.json({
          error: 'Invalid response format from Azure Functions API',
          details: `Expected {devices: [...]} or [...], got ${typeof data}`,
          received: data
        }, { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      
      // Always return a direct array for the frontend
      console.log(`[DEVICES API] ${timestamp} - 🚀 Returning devices array with ${devicesArray.length} items`)
      return NextResponse.json(devicesArray, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
    console.error('[DEVICES API] Error fetching devices:', error)
    return NextResponse.json({
      error: 'Failed to fetch devices',
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
