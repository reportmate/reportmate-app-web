import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to convert PowerShell object strings to JSON objects
function parsePowerShellObject(str: string): unknown {
  if (typeof str !== 'string' || !str.startsWith('@{') || !str.endsWith('}')) {
    return str
  }
  
  try {
    // Remove @{ and } wrapper
    const content = str.slice(2, -1).trim()
    
    if (!content) return {}
    
    // Split by semicolons and parse key-value pairs
    const pairs = content.split(';')
    const result: Record<string, unknown> = {}
    
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=')
      if (equalIndex === -1) continue
      
      const key = pair.slice(0, equalIndex).trim()
      const valueStr = pair.slice(equalIndex + 1).trim()
      
      if (!key) continue
      
      // Handle different value types
      if (valueStr === '') {
        result[key] = ''
      } else if (valueStr === 'True') {
        result[key] = true
      } else if (valueStr === 'False') {
        result[key] = false
      } else if (/^\d+$/.test(valueStr)) {
        result[key] = parseInt(valueStr, 10)
      } else if (/^\d+\.\d+$/.test(valueStr)) {
        result[key] = parseFloat(valueStr)
      } else if (valueStr.startsWith('@{') && valueStr.endsWith('}')) {
        // Nested PowerShell object
        result[key] = parsePowerShellObject(valueStr)
      } else if (valueStr.startsWith('System.Object[]')) {
        // PowerShell array - simplified to empty array for now
        result[key] = []
      } else {
        result[key] = valueStr
      }
    }
    
    return result
  } catch (e) {
    console.warn('Failed to parse PowerShell object:', str, e)
    return str
  }
}

// Recursively parse all PowerShell objects in the data
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

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    console.log(`[MANAGEMENT API] ${timestamp} - Fetching management data from Azure Functions`)
    
    // Use the same API configuration as the device API
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[MANAGEMENT API] API_BASE_URL environment variable not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured'
      }, { status: 500 })
    }
    
    const devicesUrl = `${apiBaseUrl}/api/devices`
    console.log('[MANAGEMENT API] Fetching devices from:', devicesUrl)
    
    const response = await fetch(devicesUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE!
      }
    })
    
    if (!response.ok) {
      throw new Error(`Azure Functions API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('[MANAGEMENT API] Azure Functions response structure:', {
      isArray: Array.isArray(data),
      hasSuccess: 'success' in data,
      hasDevices: 'devices' in data,
      dataType: typeof data,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
      hasModules: 'modules' in data,
      deviceId: data.deviceId
    })
    
    let devices = []
    
    // Handle different possible response formats
    if (Array.isArray(data)) {
      devices = data
      console.log('[MANAGEMENT API] Using direct array format')
    } else if (data.success && Array.isArray(data.devices)) {
      devices = data.devices
      console.log('[MANAGEMENT API] Using success.devices format')
    } else if (data.devices && Array.isArray(data.devices)) {
      devices = data.devices
      console.log('[MANAGEMENT API] Using devices array format')
    } else if (data && data.deviceId) {
      // Single device object from /api/devices endpoint - convert to array
      devices = [data]
      console.log('[MANAGEMENT API] Converting single device to array')
    } else if (data && typeof data === 'object') {
      // Single device object - convert to array
      devices = [data]
      console.log('[MANAGEMENT API] Converting single device to array')
    } else {
      console.log('[MANAGEMENT API] Unknown response format:', data)
      devices = []
    }
    
    console.log('[MANAGEMENT API] Processing', devices.length, 'devices for management data')
    
    const managementData = []
    
    for (const device of devices) {
      try {
        console.log('[MANAGEMENT API] Processing device:', {
          hasModules: !!device.modules,
          hasManagement: !!device.modules?.management,
          deviceId: device.deviceId || device.id,
          moduleKeys: device.modules ? Object.keys(device.modules) : null
        })
        
        let deviceData = null
        
        // The /api/devices endpoint might not include full module data
        // We may need to fetch individual device data for management info
        if (device.modules?.management) {
          // Already parsed modules format
          deviceData = device.modules.management
          console.log('[MANAGEMENT API] Using device.modules.management')
        } else if (device.deviceId) {
          // Fetch full device data including management modules
          console.log('[MANAGEMENT API] Fetching full device data for:', device.deviceId)
          const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${device.deviceId}`, {
            method: 'GET',
            headers: {
              'REPORTMATE_PASSPHRASE': process.env.REPORTMATE_PASSPHRASE || ''
            }
          })
          
          if (deviceResponse.ok) {
            const fullDeviceData = await deviceResponse.json()
            console.log('[MANAGEMENT API] Full device data structure:', {
              hasData: !!fullDeviceData.data,
              hasModules: !!fullDeviceData.modules,
              dataType: typeof fullDeviceData.data
            })
            
            if (fullDeviceData.data) {
              const unifiedData = typeof fullDeviceData.data === 'string' ? JSON.parse(fullDeviceData.data) : fullDeviceData.data
              if (unifiedData && unifiedData.management) {
                deviceData = unifiedData.management
                console.log('[MANAGEMENT API] Using full device unified data.management')
              }
            }
          } else {
            console.warn('[MANAGEMENT API] Failed to fetch full device data for:', device.deviceId)
          }
        }
        
        if (deviceData) {
          // Convert PowerShell objects to proper JSON
          const managementModule = convertPowerShellObjects(deviceData) as any
          console.log('[MANAGEMENT API] Converted management data for device:', {
            deviceId: device.deviceId,
            hasEnrollment: !!managementModule?.mdmEnrollment,
            provider: managementModule?.mdmEnrollment?.provider
          })
          
          // Extract management information similar to ManagementTab
          const provider = managementModule?.mdmEnrollment?.provider
          const isEnrolled = managementModule?.mdmEnrollment?.isEnrolled || false
          const enrollmentType = managementModule?.mdmEnrollment?.enrollmentType
          const enrollmentStatus = isEnrolled ? 'Enrolled' : 'Not Enrolled'
          const intuneId = managementModule?.deviceDetails?.intuneDeviceId
          const tenantName = managementModule?.tenantDetails?.tenantName
          
          // Only include devices that have meaningful management data
          if (provider || isEnrolled || enrollmentType || intuneId) {
            managementData.push({
              id: device.deviceId || device.id,
              deviceId: device.deviceId || device.id,
              deviceName: device.name || 'Unknown Device',
              serialNumber: device.serialNumber || 'Unknown',
              lastSeen: device.lastSeen,
              collectedAt: device.lastSeen,
              provider: provider || 'Unknown',
              enrollmentStatus: enrollmentStatus,
              enrollmentType: enrollmentType || '-',
              intuneId: intuneId || '-',
              tenantName: tenantName || '-',
              isEnrolled: isEnrolled,
              raw: managementModule
            })
          }
        } else {
          console.log('[MANAGEMENT API] No management data found for device:', device.deviceId || device.id)
        }
      } catch (error) {
        console.warn('[MANAGEMENT API] Error processing device:', device.deviceId || device.id, error)
        continue
      }
    }
    
    console.log('[MANAGEMENT API] Successfully processed', managementData.length, 'devices with management data')
    
    return NextResponse.json(managementData, {
      headers: { 
        'X-Fetched-At': timestamp, 
        'X-Data-Source': 'azure-functions',
        'X-Devices-Total': devices.length.toString(),
        'X-Management-Devices': managementData.length.toString()
      }
    })
    
  } catch (error) {
    console.error('[MANAGEMENT API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch management data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
