import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * @deprecated Profiles API Route - DEPRECATED
 * Profiles module has been integrated into Management module.
 * Profile data is now available via /api/device/[deviceId] in the management section.
 * This route is kept for backwards compatibility but returns a deprecation notice.
 */
export async function GET() {
  return NextResponse.json({
    error: 'DEPRECATED: Profiles module has been integrated into Management',
    message: 'Profile data is now available via /api/device/[deviceId] in the management module',
    deprecated: true,
    deprecatedAt: '2025-06-16'
  }, { 
    status: 410, // HTTP 410 Gone
    headers: {
      'X-Deprecated': 'true',
      'X-Deprecation-Notice': 'Profiles merged into Management module'
    }
  })
}
