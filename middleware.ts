import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Define routes that should not trigger auto-redirect
const publicRoutes = [
  '/api/auth',          // NextAuth authentication endpoints
  '/api/transmission',  // Device data transmission endpoint (client authentication via passphrase)
  '/api/healthz',       // Health check endpoint for Front Door
  '/api/health',        // Alternative health check endpoint
  '/api/version',       // Build/version metadata endpoint for status widgets
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
function identifyDeviceIdentifierType(identifier: string): 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName' | 'hostname' {
  // UUID pattern: 8-4-4-4-12 hexadecimal characters
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (uuidPattern.test(identifier)) {
    return 'uuid'
  }
  
  // If it contains spaces, it's probably a device name
  if (identifier.includes(' ')) {
    return 'deviceName'
  }
  
  // Asset tag pattern: Letter followed by digits (e.g., L003994, A004733)
  const assetTagPattern = /^[A-Z]\d+$/i
  if (assetTagPattern.test(identifier)) {
    return 'assetTag'
  }
  
  // Hostname pattern: contains dots or dashes typical of hostnames (e.g., device.domain.com, device-name)
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
  if (hostnamePattern.test(identifier) && (identifier.includes('.') || identifier.includes('-'))) {
    return 'hostname'
  }
  
  // Everything else is assumed to be a serial number
  return 'serialNumber'
}

// Device resolution for middleware - direct API call, no Next.js dependency
async function resolveDeviceInMiddleware(identifier: string, _request: NextRequest): Promise<string | null> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  
  // Only resolve asset tags, device names, and hostnames - not UUIDs or serial numbers
  if (identifierType === 'serialNumber' || identifierType === 'uuid') {
    return null
  }
  
  try {
    // Get the API base URL from environment
    const apiBaseUrl = process.env.API_BASE_URL
    if (!apiBaseUrl) {
      return null
    }
    
    // Build authentication headers
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'ReportMate-Middleware/1.0'
    }
    
    // Priority 1: Internal secret for container-to-container authentication (production)
    if (process.env.API_INTERNAL_SECRET) {
      headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
    }
    // Priority 2: Passphrase authentication (local development fallback)
    else if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    }
    
    // Fetch devices directly from the Azure Function API (not the Next.js API)
    const response = await fetch(`${apiBaseUrl}/api/devices?limit=1000`, {
      headers
    })
    
    if (!response.ok) {
      console.error('[MIDDLEWARE] Failed to fetch devices from API:', response.status)
      return null
    }
    
    const data = await response.json()
    
    // Handle both response formats: {devices: [...]} or just [...]
    const devices = Array.isArray(data) ? data : data.devices
    
    if (!Array.isArray(devices)) {
      console.error('[MIDDLEWARE] Invalid devices response format:', typeof data)
      return null
    }
    
    // Try asset tag matches first (most common case for the reported issue)
    let device = devices.find((d: any) => d.assetTag === identifier)
    if (device && device.serialNumber) {
      return device.serialNumber
    }
    
    // Check for asset tag in inventory modules  
    device = devices.find((d: any) => d.inventory?.assetTag === identifier)
    if (device && device.serialNumber) {
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
      return device.serialNumber
    }
    
    // Check hostnames in network modules
    device = devices.find((d: any) => 
      d.network?.hostname === identifier ||
      d.network?.host_name === identifier ||
      d.system?.hostname === identifier ||
      d.system?.host_name === identifier
    )
    if (device && device.serialNumber) {
      return device.serialNumber
    }
    
    return null
    
  } catch (error) {
    console.error('[MIDDLEWARE] Error resolving device identifier:', error)
    return null
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname
  
  // Force correct base URL for callbacks in production
  const getCorrectUrl = (originalUrl: string): string => {
    if (process.env.NODE_ENV === 'production') {
      return originalUrl.replace(/(https?:\/\/)[^\/]+/, 'https://reportmate.ecuad.ca')
    }
    return originalUrl
  }
  
  // Handle device identifier resolution FIRST (before any bypasses)
  const devicePageMatch = pathname.match(/^\/device\/([^\/]+)/)
  if (devicePageMatch) {
    const deviceIdentifier = decodeURIComponent(devicePageMatch[1])
    const identifierType = identifyDeviceIdentifierType(deviceIdentifier)
    
    if (!process.env.API_BASE_URL) {
      // Continue without resolution
    } else if (identifierType === 'assetTag' || identifierType === 'deviceName' || identifierType === 'hostname') {
      const resolvedSerial = await resolveDeviceInMiddleware(deviceIdentifier, request)
      if (resolvedSerial && resolvedSerial !== deviceIdentifier) {
        const newUrl = new URL(getCorrectUrl(request.url))
        newUrl.pathname = `/device/${encodeURIComponent(resolvedSerial)}`
        // Preserve any hash fragments
        if (request.nextUrl.hash) {
          newUrl.hash = request.nextUrl.hash
        }
        return NextResponse.redirect(newUrl)
      } else {
      }
    } else {
    }
  }
  
  // STRICT LOCALHOST BYPASS - ONLY FOR ACTUAL LOCAL DEVELOPMENT
  const isActualLocalhost = (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') && process.env.NODE_ENV === 'development'
  
  if (isActualLocalhost) {
    return NextResponse.next()
  }
  
  // Don't redirect public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }
  
  // PRODUCTION: Check if user has valid session
  
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    })
    
    if (token) {
      return NextResponse.next()
    }
    
    const correctBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://reportmate.ecuad.ca'
    const correctUrl = request.url.replace(/(https?:\/\/)[^\/]+/, correctBaseUrl)
    const callbackUrl = encodeURIComponent(correctUrl)
    // Redirect directly to signin without error parameters
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, correctBaseUrl)
    )
  } catch (error) {
    console.error('[MIDDLEWARE] Error checking session:', error)
    // If there's an error checking the session, redirect to sign in without error parameters
    const correctBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://reportmate.ecuad.ca'
    const correctUrl = request.url.replace(/(https?:\/\/)[^\/]+/, correctBaseUrl)
    const callbackUrl = encodeURIComponent(correctUrl)
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, correctBaseUrl)
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths to enforce authentication everywhere
     * except for static assets, authentication endpoints, health endpoints,
     * and internal API routes (which handle their own authentication)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/healthz|api/health|api/device|api/devices|api/modules|api/stats|api/events|api/dashboard).*)',
  ],
}
