/**
 * API Authentication Utilities
 * 
 * Provides shared authentication logic for frontendAPI communication.
 * 
 * Authentication priority (for server-side API calls):
 * 1. API_INTERNAL_SECRET - Shared secret for container-to-container auth (preferred)
 * 2. REPORTMATE_PASSPHRASE - Fallback for local development
 * 
 * The API_BASE_URL should point to:
 * - Production: http://reportmate-functions-api (internal Container App URL)
 * - Development: http://localhost:8000 or external URL
 */

/**
 * Get authentication headers for internal API calls (server-side only).
 * This should ONLY be used in Next.js API routes, not client-side code.
 * 
 * @returns Record of headers to include in fetch requests to the API
 */
export function getInternalApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'ReportMate-Frontend/1.0'
  }
  
  // Priority 1: Internal secret for container-to-container authentication
  // This is the secure method for production - shared secret between containers
  if (process.env.API_INTERNAL_SECRET) {
    headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
    return headers
  }
  
  // Priority 2: Passphrase authentication (for local development)
  if (process.env.REPORTMATE_PASSPHRASE) {
    headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
    return headers
  }
  
  // Fallback: No auth headers (will rely on internal network detection)
  console.warn('[API-AUTH] No API_INTERNAL_SECRET or REPORTMATE_PASSPHRASE configured')
  return headers
}

/**
 * Get the API base URL for server-side calls.
 * 
 * @returns The API base URL or null if not configured
 */
export function getApiBaseUrl(): string | null {
  return process.env.API_BASE_URL || null
}

/**
 * Verify that API configuration is complete.
 * 
 * @throws Error if required configuration is missing
 */
export function validateApiConfig(): void {
  if (!process.env.API_BASE_URL) {
    throw new Error('API_BASE_URL environment variable is not configured')
  }
  
  // In production, require either internal secret or passphrase
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.API_INTERNAL_SECRET && !process.env.REPORTMATE_PASSPHRASE) {
      console.warn('[API-AUTH] Production environment without API authentication configured')
    }
  }
}

/**
 * Make an authenticated fetch request to the internal API.
 * 
 * @param endpoint The API endpoint path (e.g., '/api/devices')
 * @param options Additional fetch options
 * @returns Fetch Response
 */
export async function fetchFromApi(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const apiBaseUrl = getApiBaseUrl()
  
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL environment variable is not configured')
  }
  
  const url = `${apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const headers = {
    ...getInternalApiHeaders(),
    ...(options.headers || {})
  }
  
  return fetch(url, {
    ...options,
    cache: 'no-store',
    headers
  })
}
