import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Define routes that should not trigger auto-redirect
const publicRoutes = [
  '/api/auth',
  '/api/transmission',  // Device data transmission endpoint
  '/api/healthz',       // Health check endpoint for Front Door
  '/api/health',        // Alternative health check endpoint
  '/auth',
  '/_next',
  '/favicon.ico',
  '/public',
  '/manifest.json',
  '/.well-known'
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname
  
  // Log all requests for debugging
  console.log('[MIDDLEWARE] Request:', {
    url: request.url,
    hostname: hostname,
    pathname: pathname,
    nodeEnv: process.env.NODE_ENV
  })
  
  // STRICT LOCALHOST BYPASS - ONLY FOR ACTUAL LOCAL DEVELOPMENT
  const isActualLocalhost = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') && process.env.NODE_ENV === 'development'
  
  if (isActualLocalhost) {
    console.log('[MIDDLEWARE] LOCALHOST DETECTED - COMPLETE BYPASS - NO AUTH REQUIRED')
    return NextResponse.next()
  }
  
  // Don't redirect public routes
  if (isPublicRoute(pathname)) {
    console.log('[MIDDLEWARE] Public route, allowing through')
    return NextResponse.next()
  }
  
  // PRODUCTION: Check if user has valid session
  console.log('[MIDDLEWARE] Production request - checking authentication')
  
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    if (token) {
      console.log('[MIDDLEWARE] Valid session found - allowing access')
      return NextResponse.next()
    }
    
    console.log('[MIDDLEWARE] No valid session - redirecting to sign in')
    const callbackUrl = encodeURIComponent(request.url)
    return NextResponse.redirect(
      new URL(`/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`, request.url)
    )
  } catch (error) {
    console.error('[MIDDLEWARE] Error checking session:', error)
    // If there's an error checking the session, redirect to sign in
    const callbackUrl = encodeURIComponent(request.url)
    return NextResponse.redirect(
      new URL(`/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`, request.url)
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths to enforce authentication everywhere
     * except for static assets, authentication endpoints, and health endpoints
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/healthz|api/health).*)',
  ],
}
