import { NextRequest, NextResponse } from 'next/server'
import { resolveDeviceIdentifierServer } from '@/src/lib/deviceResolver'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params
    console.log('[DEVICE RESOLVE API] Resolving identifier:', identifier)

    // Resolve the identifier
    const result = await resolveDeviceIdentifierServer(identifier)
    
    if (result.found && result.serialNumber) {
      return NextResponse.json({
        success: true,
        resolved: true,
        serialNumber: result.serialNumber,
        originalIdentifier: result.originalIdentifier,
        identifierType: result.identifierType,
        redirectUrl: `/device/${encodeURIComponent(result.serialNumber)}`
      })
    } else {
      return NextResponse.json({
        success: true,
        resolved: false,
        originalIdentifier: result.originalIdentifier,
        identifierType: result.identifierType,
        message: `No device found for ${result.identifierType}: ${result.originalIdentifier}`
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('[DEVICE RESOLVE API] Error resolving device identifier:', error)
    return NextResponse.json({
      error: 'Failed to resolve device identifier',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
