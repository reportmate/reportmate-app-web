import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/dashboard',
  '/devices',
  '/events',
  '/settings',
  '/debug-device'
]

// Routes that should be accessible without authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/error',
  '/terms',
  '/privacy'
]

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route))
}

export default withAuth(
  function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    
    // Handle device routes (existing logic)
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
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow public routes
        if (isPublicRoute(pathname)) {
          return true
        }
        
        // Allow API routes (they handle their own auth)
        if (pathname.startsWith('/api/')) {
          return true
        }
        
        // For protected routes, if no token, redirect to automatic Azure AD sign-in
        if (!token && isProtectedRoute(pathname)) {
          return false // This will trigger the automatic redirect below
        }
        
        // Require auth for all other routes (including root)
        return !!token
      },
    },
    pages: {
      signIn: '/api/auth/signin/azure-ad', // Automatic redirect to Azure AD
    },
  }
)

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
