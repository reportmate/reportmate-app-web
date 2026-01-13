import { NextResponse } from 'next/server'
import { getDeviceNames, getDeviceNamesFromCache } from '../../../lib/device-names'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serials = searchParams.get('serials')?.split(',') || []
  
  try {
    // Get device names (uses shared cache)
    await getDeviceNames(serials)
    
    // Return only the requested device names
    const requestedNames = getDeviceNamesFromCache(serials)
    
    console.log(`[DEVICE-NAMES API] Returning ${Object.keys(requestedNames).length} requested device names`)
    
    return NextResponse.json({
      success: true,
      deviceNames: requestedNames
    })
    
  } catch (error) {
    console.error('[DEVICE-NAMES API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch device names'
    }, { status: 500 })
  }
}