import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    console.log('[MANAGEMENT TEST API] Starting test endpoint')
    
    return NextResponse.json({
      status: 'working',
      message: 'Management test API is functional',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[MANAGEMENT TEST API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to test management API', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
