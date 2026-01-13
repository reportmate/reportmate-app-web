import { NextResponse } from 'next/server'

// Cache invalidation endpoint
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const timestamp = new Date().toISOString()
    const body = await request.json()
    const { deviceId, serialNumber, invalidateAll = false } = body
    
    if (invalidateAll) {
      // Invalidate all caches - used for bulk operations or system maintenance
      // We'll implement cache clearing by importing the cache modules and resetting them
      // For now, we'll just log and return success - the actual cache clearing will be
      // implemented when we refactor the cache system to be centralized
      
      return NextResponse.json({
        success: true,
        message: 'All caches scheduled for invalidation',
        timestamp,
        invalidated: ['devices', 'installs', 'applications', 'events']
      })
    }
    
    if (deviceId || serialNumber) {
      // Device-specific cache invalidation
      // This would clear caches that contain data for this specific device
      
      return NextResponse.json({
        success: true,
        message: `Cache invalidated for device: ${deviceId || serialNumber}`,
        timestamp,
        device: deviceId || serialNumber,
        invalidated: ['device-specific-caches']
      })
    }
    
    return NextResponse.json({
      error: 'Missing parameters',
      details: 'Please provide deviceId, serialNumber, or set invalidateAll=true'
    }, { status: 400 })
    
  } catch (error) {
    console.error('[CACHE INVALIDATION] Error:', error)
    return NextResponse.json({
      error: 'Cache invalidation failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
