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
            
      // Map the raw API data to the frontend Identity interface
      const mappedData = Array.isArray(identityData) ? identityData.map((item: any) => {
        const raw = item.raw || {};
        const summary = raw.summary || {};
        const users = raw.users || [];
        const loggedInUsers = raw.loggedInUsers || [];
        
        // Count admins
        const adminCount = users.filter((u: any) => u.isAdmin).length;
        
        // Get unique logged in users
        const uniqueLoggedIn = [...new Set(loggedInUsers.map((s: any) => s.user).filter(Boolean))];
        
        return {
          id: item.id,
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          serialNumber: item.serialNumber,
          lastSeen: item.lastSeen,
          collectedAt: item.collectedAt,
          platform: item.platform || 'Unknown',
          
          // Summary fields
          totalUsers: summary.totalUsers || users.length || 0,
          adminUsers: summary.adminUsers || adminCount || 0,
          disabledUsers: summary.disabledUsers || 0,
          localUsers: summary.localUsers,
          domainUsers: summary.domainUsers,
          currentlyLoggedIn: summary.currentlyLoggedIn || uniqueLoggedIn.length || 0,
          failedLoginsLast7Days: summary.failedLoginsLast7Days,
          
          // macOS specific
          btmdbStatus: raw.btmdbHealth?.status || null,
          btmdbSizeMB: raw.btmdbHealth?.sizeMB || null,
          secureTokenUsers: raw.secureTokenUsers?.tokenGrantedCount || null,
          secureTokenMissing: raw.secureTokenUsers?.tokenMissingCount || null,
          
          // Platform SSO (macOS 13+)
          platformSSORegistered: raw.platformSSOUsers?.deviceRegistered || false,
          platformSSOUserCount: raw.platformSSOUsers?.registeredUserCount || 0,
          
          // Directory Services
          adBound: raw.directoryServices?.activeDirectory?.bound || false,
          adDomain: raw.directoryServices?.activeDirectory?.domain || null,
          ldapBound: raw.directoryServices?.ldap?.bound || false,
          
          // User list for detailed view
          users: users.slice(0, 5).map((u: any) => ({
            username: u.username,
            realName: u.realName,
            isAdmin: u.isAdmin,
            lastLogon: u.lastLogon
          })),
          
          // Logged in users
          loggedInUsernames: uniqueLoggedIn.slice(0, 3)
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
