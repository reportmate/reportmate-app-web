import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000) // Max 5000, default 1000
    const timestamp = new Date().toISOString()
    
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    // Call FastAPI bulk endpoint
    try {
      const url = `${apiBaseUrl}/api/devices/security?limit=${limit}`
            
      // Use shared authentication headers
      const headers = getInternalApiHeaders()
      headers['Content-Type'] = 'application/json'
      
      const response = await fetch(url, {
        headers
      })
      
      if (!response.ok) {
        throw new Error(`FastAPI error: ${response.status} ${response.statusText}`)
      }
      
      const securityData = await response.json()
            
      // Map the raw API data to the frontend Security interface
      const mappedData = Array.isArray(securityData) ? securityData.map((item: any) => {
        const raw = item.raw || {};
        
        // Determine encryption status (BitLocker for Windows, FileVault for macOS)
        const isEncrypted = raw.encryption?.bitLocker?.isEnabled || raw.encryption?.fileVault?.isEnabled || false;
        
        return {
          id: item.id,
          deviceId: item.deviceId,
          deviceName: item.deviceName,
          serialNumber: item.serialNumber,
          lastSeen: item.lastSeen,
          collectedAt: item.collectedAt,
          platform: item.platform || 'Unknown',
          
          // Map security fields
          firewallEnabled: raw.firewall?.isEnabled || false,
          fileVaultEnabled: isEncrypted,
          
          // macOS specific fields (default to false/empty for Windows)
          gatekeeperEnabled: raw.gatekeeper?.isEnabled || false,
          systemIntegrityProtection: raw.sip?.isEnabled || false,
          
          // Boot security
          secureBootLevel: raw.tpm?.isEnabled ? 'Secure' : 'Not Secure',
          externalBootLevel: 'Unknown',
          
          // Other security settings
          activationLockEnabled: false,
          remoteDesktopEnabled: false,
          autoLoginUser: '',
          passwordPolicyEnforced: true, // Default to true for enterprise devices
          screenLockEnabled: true,      // Default to true for enterprise devices
          
          // Updates
          automaticUpdates: raw.antivirus?.isUpToDate || false,
          lastSecurityUpdate: raw.antivirus?.lastUpdate || item.lastSecurityScan || null,

          // Secure Shell
          secureShell: raw.secureShell || null
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
      console.error(`[SECURITY API] ${timestamp} - FastAPI error:`, apiError)
      
      // NO FAKE DATA: Return error when real API fails
      return NextResponse.json({
        error: 'Security data not available',
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
    console.error('[SECURITY API] Failed to fetch security data:', error)
    return NextResponse.json({
      error: 'API request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
