import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NUCLEAR OPTION: Complete authentication bypass for localhost development
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname
  
  // LOCALHOST BYPASS - NO AUTHENTICATION FOR LOCAL DEVELOPMENT
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    console.log('[MIDDLEWARE] LOCALHOST DETECTED - COMPLETE BYPASS - NO AUTH REQUIRED')
    console.log('[MIDDLEWARE] URL:', request.url)
    console.log('[MIDDLEWARE] Pathname:', pathname)
    
    // Handle device routes (existing logic for localhost too)
    if (pathname.startsWith('/device/') && pathname.split('/').length === 3) {
      const deviceId = pathname.split('/')[2]
      
      // Check if this looks like a UUID or Asset Tag that might need forwarding
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const assetTagPattern = /^[A-Z][0-9A-Z]{3,}$/i
      
      // If it looks like a UUID or Asset Tag, let the client-side resolution handle it
      if (uuidPattern.test(deviceId) || assetTagPattern.test(deviceId)) {
        const response = NextResponse.next()
        response.headers.set('X-Device-Resolution-Needed', 'true')
        response.headers.set('X-Device-Identifier-Type', 
          uuidPattern.test(deviceId) ? 'uuid' : 'assetTag'
        )
        console.log('[MIDDLEWARE] Device route with resolution needed for localhost')
        return response
      }
    }
    
    // For localhost, just pass everything through without any auth checks
    console.log('[MIDDLEWARE] LOCALHOST - ALLOWING ALL ROUTES')
    return NextResponse.next()
  }
  
  // For production, use simple redirect to Azure AD (we'll fix this later)
  console.log('[MIDDLEWARE] Production request - redirecting to Azure AD')
  return NextResponse.redirect(new URL('/api/auth/signin/azure-ad', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
