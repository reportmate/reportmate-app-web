import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to convert PowerShell object strings to JSON objects
function parsePowerShellObject(str: string): unknown {
  if (typeof str !== 'string' || !str.startsWith('@{') || !str.endsWith('}')) {
    return str
  }
  
  try {
    // Remove @{ and } wrapper
    const content = str.slice(2, -1)
    
    // Split by semicolons and parse key-value pairs
    const pairs = content.split(';')
    const result: Record<string, unknown> = {}
    
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=')
      if (key && valueParts.length > 0) {
        const cleanKey = key.trim()
        const valueStr = valueParts.join('=').trim()
        
        // Try to parse as number if it looks like one
        if (/^\d+$/.test(valueStr)) {
          result[cleanKey] = parseInt(valueStr, 10)
        } else if (/^\d+\.\d+$/.test(valueStr)) {
          result[cleanKey] = parseFloat(valueStr)
        } else {
          result[cleanKey] = valueStr
        }
      }
    }
    
    return result
  } catch (error) {
    console.warn('Failed to parse PowerShell object:', str, error)
    return str
  }
}

// Recursively process object to convert PowerShell object strings
function convertPowerShellObjects(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return parsePowerShellObject(obj)
  } else if (Array.isArray(obj)) {
    return obj.map(convertPowerShellObjects)
  } else if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertPowerShellObjects(value)
    }
    return result
  }
  return obj
}

// Type definitions
interface RecentAttempt {
  version?: string;
  status?: string;
  result?: string;
  installedVersion?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface InstallPackage {
  name: string;
  displayName?: string;
  version?: string;
  status?: string;
  lastAttemptStatus?: string;
  installedVersion?: string;
  recentAttempts?: RecentAttempt[];
  [key: string]: unknown;
}

interface InstallsModule {
  cimian?: unknown;
  recentInstalls?: InstallPackage[];
  [key: string]: unknown;
}

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
      
      // Try direct database fallback first (for development/troubleshooting)
      console.log('[DEVICE API] Trying direct database fallback...')
      
      try {
        const { pool } = await import('../../../../src/lib/db')
        
        // Query device basic info
        const deviceQuery = `
          SELECT 
            id, device_id, name, serial_number, os, status, last_seen, 
            model, manufacturer, created_at, updated_at
          FROM devices 
          WHERE id = $1 OR serial_number = $1
          LIMIT 1`
        
        const deviceResult = await pool.query(deviceQuery, [deviceId])
        
        if (deviceResult.rows.length > 0) {
          const deviceRow = deviceResult.rows[0]
          
          // Get module data for this device
          const validModules = [
            'applications', 'displays', 'hardware', 'installs', 'inventory',
            'management', 'network', 'printers', 'profiles', 'security', 'system'
          ]
          
          const modules: Record<string, unknown> = {}
          let latestCollectionTime = null
          
          // Query each module table for this device's data
          for (const moduleName of validModules) {
            try {
              const moduleQuery = `
                SELECT data, collected_at, created_at
                FROM ${moduleName} 
                WHERE device_id = $1
                ORDER BY created_at DESC
                LIMIT 1`
              
              const moduleResult = await pool.query(moduleQuery, [deviceRow.id])
              
              if (moduleResult.rows.length > 0 && moduleResult.rows[0].data) {
                let moduleData = moduleResult.rows[0].data
                
                // Convert PowerShell object strings to proper JSON objects
                moduleData = convertPowerShellObjects(moduleData)
                
                if (moduleResult.rows[0].collected_at) {
                  moduleData.collectedAt = moduleResult.rows[0].collected_at.toISOString()
                  
                  if (!latestCollectionTime || moduleResult.rows[0].collected_at > latestCollectionTime) {
                    latestCollectionTime = moduleResult.rows[0].collected_at
                  }
                }
                
                modules[moduleName] = moduleData
                console.log(`[DEVICE API] ✅ Retrieved and processed ${moduleName} data from database`)
              }
            } catch (moduleError) {
              console.warn(`[DEVICE API] ❌ Failed to query ${moduleName} table:`, moduleError)
              continue
            }
          }
          
          // Build metadata
          const metadata = {
            deviceId: deviceRow.device_id,
            serialNumber: deviceRow.serial_number,
            collectedAt: latestCollectionTime ? latestCollectionTime.toISOString() : deviceRow.last_seen?.toISOString(),
            clientVersion: '1.0.0'
          }
          
          // Return device data in expected format
          const responseData = {
            success: true,
            device: {
              deviceId: metadata.deviceId,
              serialNumber: metadata.serialNumber,
              status: 'active',
              lastSeen: metadata.collectedAt,
              clientVersion: metadata.clientVersion,
              modules: modules
            },
            source: 'direct-database'
          }
          
          console.log(`[DEVICE API] ✅ Successfully retrieved device data from database with ${Object.keys(modules).length} modules`)
          
          return NextResponse.json(responseData, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        } else {
          console.log('[DEVICE API] Device not found in direct database query')
        }
        
      } catch (dbError) {
        console.error('[DEVICE API] Direct database fallback failed:', dbError)
      }
      
      // If database fallback failed, try sample data
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
        hasCimian: !!(modules.installs as InstallsModule)?.cimian,
        hasRecentInstalls: !!(modules.installs as InstallsModule)?.recentInstalls,
        recentInstallsCount: (modules.installs as InstallsModule)?.recentInstalls?.length || 0,
        sampleRecentInstall: (modules.installs as InstallsModule)?.recentInstalls?.[0],
        first3Installs: (modules.installs as InstallsModule)?.recentInstalls?.slice(0, 3).map((pkg: InstallPackage) => ({
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
              key.toLowerCase().includes('version')).reduce((acc: Record<string, unknown>, key: string) => {
              const firstAttempt = pkg.recentAttempts?.[0];
              if (firstAttempt) {
                acc[key] = firstAttempt[key];
              }
              return acc;
            }, {}),
            // Also check for fields that might contain status/state info
            allStatusFields: Object.keys(pkg.recentAttempts[0]).filter(key => 
              key.toLowerCase().includes('status') || key.toLowerCase().includes('state') || 
              key.toLowerCase().includes('result')).reduce((acc: Record<string, unknown>, key: string) => {
              const firstAttempt = pkg.recentAttempts?.[0];
              if (firstAttempt) {
                acc[key] = firstAttempt[key];
              }
              return acc;
            }, {}),
            // Show first few fields of the attempt to see structure
            sampleFields: Object.keys(pkg.recentAttempts[0]).slice(0, 10).reduce((acc: Record<string, unknown>, key: string) => {
              const firstAttempt = pkg.recentAttempts?.[0];
              if (firstAttempt) {
                acc[key] = firstAttempt[key];
              }
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
