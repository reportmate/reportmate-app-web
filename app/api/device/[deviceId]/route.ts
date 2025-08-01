import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params
    console.log('[DEVICE API] Fetching device data for:', deviceId)

    // Use server-side API base URL configuration
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICE API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    console.log('[DEVICE API] Using API base URL:', apiBaseUrl)
    const response = await fetch(`${apiBaseUrl}/api/device/${encodeURIComponent(deviceId)}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-API-PASSPHRASE': 's3cur3-p@ssphras3!'
      }
    })
    
    if (!response.ok) {
      console.error('[DEVICE API] Azure Functions API error:', response.status, response.statusText)
      
      // If Azure Functions API is not available, fall back to sample data
      console.log('[DEVICE API] Falling back to sample data')
      
      try {
        // Read sample data from file
        const workingDir = process.cwd()
        console.log('[DEVICE API] Working directory:', workingDir)
        
        // Try multiple possible paths
        const possiblePaths = [
          path.join(workingDir, 'sample-api-data.json'),
          path.join(workingDir, '../../sample-api-data.json'),
          path.join(workingDir, '../../../sample-api-data.json'),
          path.join(__dirname, '../../../../../../sample-api-data.json')
        ]
        
        let sampleDataPath = null
        for (const testPath of possiblePaths) {
          console.log('[DEVICE API] Testing path:', testPath)
          if (fs.existsSync(testPath)) {
            sampleDataPath = testPath
            console.log('[DEVICE API] Found sample data at:', testPath)
            break
          }
        }
        
        if (sampleDataPath) {
          const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'))
          console.log('[DEVICE API] Using sample data fallback')
          
          // Return sample data in the expected format
          return NextResponse.json({
            success: true,
            device: sampleData,
            source: 'sample-data'
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        } else {
          console.log('[DEVICE API] Sample data file not found in any of the expected locations')
        }
      } catch (sampleError) {
        console.error('[DEVICE API] Failed to load sample data:', sampleError)
      }
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Device not found'
        }, { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
      return NextResponse.json({
        error: 'Failed to fetch device from API',
        details: `API returned ${response.status}: ${response.statusText}`
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    const data = await response.json()
    console.log('[DEVICE API] Successfully fetched device data from Azure Functions')
    console.log('[DEVICE API] Response structure:', {
      hasMetadata: 'metadata' in data,
      metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
      responseKeys: Object.keys(data),
      responseSize: JSON.stringify(data).length
    })
    
    console.log('[DEVICE API] Unified data structure sample:', JSON.stringify({
      metadata: data.metadata,
      moduleKeys: Object.keys(data).filter(k => k !== 'metadata')
    }, null, 2).substring(0, 500) + '...')
    
    // Handle new unified structure - data is the device info directly
    if (data.metadata) {
      const metadata = data.metadata
      
      console.log('[DEVICE API] Clean modular response - deviceId:', metadata.deviceId, 'serialNumber:', metadata.serialNumber)
      
      // Build clean modules object with proper ordering: inventory, system, hardware, management, then alphabetical
      const modules: Record<string, unknown> = {}
      const moduleOrder = ['inventory', 'system', 'hardware', 'management']
      
      // Add priority modules first
      moduleOrder.forEach(moduleName => {
        if (data[moduleName] && moduleName !== 'metadata') {
          modules[moduleName] = data[moduleName]
        }
      })
      
      // Add remaining modules alphabetically
      const remainingKeys = Object.keys(data)
        .filter(key => key !== 'metadata' && !moduleOrder.includes(key))
        .sort()
      
      remainingKeys.forEach(key => {
        modules[key] = data[key]
      })
      
      // Return CLEAN structure - modules are the ONLY source of truth
      const responseData = {
        success: true,
        device: {
          // Only essential identifiers and status - NO duplicate data
          deviceId: metadata.deviceId,           // Internal UUID (unique)
          serialNumber: metadata.serialNumber,   // Human-readable ID (unique)
          status: 'active', // Default status since we have recent data
          lastSeen: metadata.collectedAt,
          clientVersion: metadata.clientVersion,
          
          // ALL data comes from modules - frontend must use device.modules.{moduleName} for everything
          modules: modules
        }
      }
      
      // Debug installs module specifically
      console.log('[DEVICE API] 🔍 Installs module debug:', {
        hasInstallsModule: !!modules.installs,
        installsKeys: modules.installs ? Object.keys(modules.installs) : [],
        hasCimian: !!(modules.installs as any)?.cimian,
        hasRecentInstalls: !!(modules.installs as any)?.recentInstalls,
        recentInstallsCount: (modules.installs as any)?.recentInstalls?.length || 0,
        sampleRecentInstall: (modules.installs as any)?.recentInstalls?.[0],
        first3Installs: (modules.installs as any)?.recentInstalls?.slice(0, 3).map((pkg: any) => ({
          name: pkg.name,
          displayName: pkg.displayName,
          version: pkg.version,
          status: pkg.status,
          lastAttemptStatus: pkg.lastAttemptStatus,
          installedVersion: pkg.installedVersion,
          allKeys: Object.keys(pkg),
          recentAttemptsLength: pkg.recentAttempts?.length || 0,
          firstAttempt: pkg.recentAttempts?.[0],
          firstAttemptKeys: pkg.recentAttempts?.[0] ? Object.keys(pkg.recentAttempts[0]) : [],
          firstAttemptDetails: pkg.recentAttempts?.[0] ? {
            version: pkg.recentAttempts[0].version,
            status: pkg.recentAttempts[0].status,
            result: pkg.recentAttempts[0].result,
            installedVersion: pkg.recentAttempts[0].installedVersion,
            timestamp: pkg.recentAttempts[0].timestamp,
            // DEEP DIVE - Look for ANY field that might contain version info
            allVersionFields: Object.keys(pkg.recentAttempts[0]).filter(key => 
              key.toLowerCase().includes('version')).reduce((acc: any, key: string) => {
              acc[key] = pkg.recentAttempts[0][key];
              return acc;
            }, {}),
            // Also check for fields that might contain status/state info
            allStatusFields: Object.keys(pkg.recentAttempts[0]).filter(key => 
              key.toLowerCase().includes('status') || key.toLowerCase().includes('state') || 
              key.toLowerCase().includes('result')).reduce((acc: any, key: string) => {
              acc[key] = pkg.recentAttempts[0][key];
              return acc;
            }, {}),
            // Show first few fields of the attempt to see structure
            sampleFields: Object.keys(pkg.recentAttempts[0]).slice(0, 10).reduce((acc: any, key: string) => {
              acc[key] = pkg.recentAttempts[0][key];
              return acc;
            }, {})
          } : null
        }))
      })
      
      console.log('[DEVICE API] Returning CLEAN modular structure with', Object.keys(modules).length, 'modules')
      return NextResponse.json(responseData, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }
    
    // If no metadata found, return error
    console.log('[DEVICE API] No metadata found in response')
    return NextResponse.json({
      error: 'Invalid device data structure',
      details: 'Expected unified data format with metadata'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('[DEVICE API] Error fetching device:', error)
    return NextResponse.json({
      error: 'Failed to fetch device',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}
