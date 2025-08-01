import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Only handle device routes
  if (pathname.startsWith('/device/') && pathname.split('/').length === 3) {
    const deviceId = pathname.split('/')[2]
    
    // Check if this looks like a UUID or Asset Tag that might need forwarding
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const assetTagPattern = /^[A-Z][0-9A-Z]{3,}$/i
    
    // If it looks like a UUID or Asset Tag, let the client-side resolution handle it
    // We don't do server-side resolution here to avoid blocking the middleware
    if (uuidPattern.test(deviceId) || assetTagPattern.test(deviceId)) {
      // Add a header to indicate this might need resolution
      const response = NextResponse.next()
      response.headers.set('X-Device-Resolution-Needed', 'true')
      response.headers.set('X-Device-Identifier-Type', 
        uuidPattern.test(deviceId) ? 'uuid' : 'assetTag'
      )
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match device routes that might need forwarding
     * - /device/:path*
     */
    '/device/:path*',
  ],
}
