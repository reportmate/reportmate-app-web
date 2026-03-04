import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const timestamp = new Date().toISOString()
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // Call FastAPI bulk endpoint - NO LIMITS!
    try {
      const url = `${apiBaseUrl}/api/devices/identity${includeArchived ? '?includeArchived=true' : ''}`
            
      // Container-to-container auth requires X-Internal-Secret header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (process.env.API_INTERNAL_SECRET) {
        headers['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
      }
      
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const identityData = await response.json()
            
      // Map the API data to the frontend Identity interface
      // FastAPI now returns pre-extracted summary fields (no raw blob)
      const mappedData = Array.isArray(identityData) ? identityData.map((item: any) => {
        const summary = item.summary || {};
        const users = item.users || [];
        const ds = item.directoryServices || {};
        const ad = ds.activeDirectory || {};
        const entra = ds.azureAd || {};
        const domainJoined = ad.bound || ad.isDomainJoined || false;
        const entraJoined = entra.joined || item.platformSSOUsers?.deviceRegistered || false;
        
        let enrollmentType = 'Unknown';
        if (domainJoined && entraJoined) enrollmentType = 'Domain Joined';
        else if (entraJoined) enrollmentType = 'Cloud Joined';
        else if (domainJoined) enrollmentType = 'Domain Joined';
        else if (ds.workgroup) enrollmentType = 'Unjoined';
        else enrollmentType = 'Standard';
        
        return {
          id: item.id,
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          serialNumber: item.serialNumber,
          lastSeen: item.lastSeen,
          collectedAt: item.collectedAt,
          platform: item.platform || 'Unknown',
          
          // Summary fields (pre-extracted by API)
          totalUsers: summary.totalUsers || 0,
          adminUsers: summary.adminUsers || 0,
          disabledUsers: summary.disabledUsers || 0,
          currentlyLoggedIn: summary.currentlyLoggedIn || 0,
          
          // macOS specific
          btmdbStatus: item.btmdbHealth?.status || null,
          btmdbSizeMB: item.btmdbHealth?.sizeMB || null,
          secureTokenUsers: item.secureTokenUsers?.tokenGrantedCount || null,
          secureTokenMissing: item.secureTokenUsers?.tokenMissingCount || null,
          
          // Platform SSO
          platformSSORegistered: item.platformSSOUsers?.deviceRegistered || false,
          platformSSOUserCount: item.platformSSOUsers?.registeredUserCount || 0,
          
          // Directory Services
          adBound: ad.bound || false,
          adDomain: ad.domain || null,
          ldapBound: ds.ldap?.bound || false,
          
          // Enrollment 
          enrollmentType,
          entraJoined,
          domainJoined,
          tenantId: entra.tenantId || null,
          tenantName: entra.tenantName || null,
          
          // Domain trust
          trustStatus: item.domainTrust?.trustStatus || null,
          
          // Auth method
          authMethod: (() => {
            if (item.platformSSOUsers?.deviceRegistered) return 'Platform SSO';
            if (item.windowsHello?.statusDisplay && !item.windowsHello.statusDisplay.startsWith('Disabled')) return 'Hello for Business';
            return null;
          })(),
          
          // User previews (top 5, pre-sliced by API)
          users: users.map((u: any) => ({
            username: u.username,
            realName: u.realName,
            isAdmin: u.isAdmin,
            lastLogon: u.lastLogon
          })),
          
          loggedInUsernames: item.loggedInUsernames || []
        };
      }) : [];
      
      return NextResponse.json(mappedData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0',
          'X-Fetched-At': timestamp,
          'X-Data-Source': 'fastapi-container'
        }
      })
      
    } catch (apiError) {
      console.error(`[IDENTITY API] ${timestamp} - FastAPI error:`, apiError)
      
      // NO FAKE DATA: Return error when real API fails
      return NextResponse.json({
        error: 'Identity data not available',
        message: 'No real data available from API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
  } catch (error) {
    console.error('[IDENTITY API] Failed to fetch identity data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
