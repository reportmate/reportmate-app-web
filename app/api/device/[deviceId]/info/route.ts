import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Fast Info Tab Data Endpoint
 * Returns only the minimal data needed for the Info tab widgets:
 * - Inventory (device name, usage, department, location, asset tag, serial, UUID)
 * - System (OS basics - name, version, display version, edition)
 * - Hardware (model, manufacturer, processor, memory, storage basics)
 * - Management (enrollment status, server URL)
 * - Security (TPM, BitLocker/FileVault status, Defender/XProtect)
 * - Network (hostname, primary IP, connection type)
 * 
 * This endpoint is optimized for speed and returns only what's displayed in InfoTab widgets.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    console.log('[INFO API] 🎯 Fast info fetch for device:', deviceId)

    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[INFO API] ❌ API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error'
      }, { status: 500 })
    }
    
    // Fetch full device data from FastAPI
    const azureFunctionsUrl = `${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`
    
    // Build headers with authentication for localhost
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': 'ReportMate-Frontend/1.0'
    }
    
    // Add passphrase authentication if configured (prioritize over Managed Identity)
    if (process.env.REPORTMATE_PASSPHRASE) {
      headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE
      console.log('[INFO API] 🔑 Added passphrase authentication')
    } else {
      const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID
      if (managedIdentityId) {
        headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId
      }
    }
    
    const response = await fetch(azureFunctionsUrl, {
      cache: 'no-store',
      headers
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Device not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch device info'
      }, { status: 502 })
    }

    const data = await response.json()
    
    // Extract only the modules needed for InfoTab
    // CRITICAL: Return FULL module data, not filtered subsets
    // Tabs need complete data to work properly
    const extractInfoData = (modules: Record<string, any>) => {
      return {
        inventory: modules.inventory || null,
        system: modules.system || null,  // FULL system data
        hardware: modules.hardware || null,  // FULL hardware data
        management: modules.management || null,  // FULL management data
        security: modules.security || null,  // FULL security data
        network: modules.network || null  // FULL network data
      }
    }
    
    // Handle nested Azure Functions format
    if (data.success && data.device && data.device.modules) {
      const infoData = extractInfoData(data.device.modules)
      
      console.log('[INFO API] ✅ Successfully extracted info data')
      
      // CRITICAL: Return the SAME structure as full endpoint, just with fewer modules
      // This ensures mapDeviceData() works correctly
      return NextResponse.json({
        success: true,
        device: {
          // Keep all top-level device fields
          serialNumber: data.device.serialNumber,
          deviceId: data.device.deviceId,
          lastSeen: data.device.lastSeen,
          createdAt: data.device.createdAt,
          registrationDate: data.device.registrationDate || data.device.createdAt,
          status: data.device.status,
          archived: data.device.archived || false,
          archivedAt: data.device.archivedAt || null,
          // Only include info modules (but in same format as full response)
          modules: infoData
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // Handle legacy format
    if (data.inventory || data.system || data.hardware) {
      const infoData = extractInfoData(data)
      
      return NextResponse.json({
        success: true,
        device: {
          deviceId: data.metadata?.deviceId,
          serialNumber: data.metadata?.serialNumber,
          lastSeen: data.metadata?.collectedAt,
          createdAt: data.metadata?.createdAt,
          clientVersion: data.metadata?.clientVersion,
          modules: infoData
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    return NextResponse.json({
      error: 'Invalid device data structure'
    }, { status: 500 })

  } catch (error) {
    console.error('[INFO API] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch device info',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
