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
  '/.well-known',
  '/reportmate-logo.png',  // ReportMate logo file
  '/theme-init.js'         // Theme initialization script
]

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

// Simple identifier type detection
function identifyDeviceIdentifierType(identifier: string): 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName' {
  // UUID pattern: 8-4-4-4-12 hexadecimal characters
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (uuidPattern.test(identifier)) {
    return 'uuid'
  }
  
  // If it contains spaces, it's probably a device name
  if (identifier.includes(' ')) {
    return 'deviceName'
  }
  
  // For everything else, just call it an assetTag if it's not already known to be a serial
  return 'assetTag'
}

// Device resolution for middleware - direct API call, no Next.js dependency
async function resolveDeviceInMiddleware(identifier: string, request: NextRequest): Promise<string | null> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  
  // Only resolve asset tags and device names, not UUIDs or serial numbers
  if (identifierType === 'serialNumber' || identifierType === 'uuid') {
    return null
  }
  
  try {
    // Get the API base URL from environment
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      console.log('[MIDDLEWARE] No API_BASE_URL configured, skipping resolution')
      return null
    }
    
    console.log(`[MIDDLEWARE] Attempting to resolve ${identifierType}: ${identifier} using API: ${apiBaseUrl}`)
    
    // Fetch devices directly from the Azure Function API (not the Next.js API)
    const response = await fetch(`${apiBaseUrl}/api/devices?limit=1000`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'ReportMate-Middleware/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('[MIDDLEWARE] Failed to fetch devices from API:', response.status)
      return null
    }
    
    const devices = await response.json()
    
    if (!Array.isArray(devices)) {
      console.error('[MIDDLEWARE] Invalid devices response format')
      return null
    }
    
    console.log(`[MIDDLEWARE] Searching ${devices.length} devices for identifier: ${identifier}`)
    
    // Try asset tag matches first (most common case for the reported issue)
    let device = devices.find((d: any) => d.assetTag === identifier)
    if (device && device.serialNumber) {
      console.log(`[MIDDLEWARE] ✅ Resolved Asset Tag ${identifier} → serial number: ${device.serialNumber}`)
      return device.serialNumber
    }
    
    // Check for asset tag in inventory modules  
    device = devices.find((d: any) => d.inventory?.assetTag === identifier)
    if (device && device.serialNumber) {
      console.log(`[MIDDLEWARE] ✅ Resolved Asset Tag (inventory) ${identifier} → serial number: ${device.serialNumber}`)
      return device.serialNumber
    }
    
    // Check device names
    device = devices.find((d: any) => 
      d.name === identifier || 
      d.inventory?.deviceName === identifier ||
      d.inventory?.device_name === identifier ||
      d.inventory?.computerName === identifier ||
      d.inventory?.computer_name === identifier
    )
    if (device && device.serialNumber) {
      console.log(`[MIDDLEWARE] ✅ Resolved Device Name ${identifier} → serial number: ${device.serialNumber}`)
      return device.serialNumber
    }
    
    console.log(`[MIDDLEWARE] ❌ No device found for identifier: ${identifier}`)
    return null
    
  } catch (error) {
    console.error('[MIDDLEWARE] Error resolving device identifier:', error)
    return null
  }
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
    console.log('[MIDDLEWARE] LOCALHOST DETECTED - COMPLETE BYPASS - NO AUTH OR RESOLUTION')
    return NextResponse.next()
  }
  
  // Handle device identifier resolution BEFORE authentication (production only)
  const devicePageMatch = pathname.match(/^\/device\/([^\/]+)/)
  if (devicePageMatch && process.env.API_BASE_URL) {
    const deviceIdentifier = decodeURIComponent(devicePageMatch[1])
    const identifierType = identifyDeviceIdentifierType(deviceIdentifier)
    
    console.log('[MIDDLEWARE] Device page detected, identifier:', deviceIdentifier, 'type:', identifierType)
    
    // Only resolve asset tags and device names, not UUIDs or serial numbers
    if (identifierType === 'assetTag' || identifierType === 'deviceName') {
      console.log('[MIDDLEWARE] Attempting device resolution for:', deviceIdentifier)
      const resolvedSerial = await resolveDeviceInMiddleware(deviceIdentifier, request)
      if (resolvedSerial && resolvedSerial !== deviceIdentifier) {
        console.log(`[MIDDLEWARE] Redirecting /device/${deviceIdentifier} → /device/${resolvedSerial}`)
        const newUrl = new URL(request.url)
        newUrl.pathname = `/device/${encodeURIComponent(resolvedSerial)}`
        // Preserve any hash fragments
        if (request.nextUrl.hash) {
          newUrl.hash = request.nextUrl.hash
        }
        return NextResponse.redirect(newUrl)
      }
    }
  } else if (devicePageMatch && !process.env.API_BASE_URL) {
    console.log('[MIDDLEWARE] Device page detected but no API_BASE_URL configured, skipping resolution')
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
