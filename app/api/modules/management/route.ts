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
  } catch (error) {
    console.warn('Failed to parse PowerShell object:', str, error)
    return str
  }
}

// Recursively convert PowerShell objects in data structures
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
    console.log('[MANAGEMENT API] Starting API call')
    
    const apiBaseUrl = process.env.API_BASE_URL || process.env.AZURE_FUNCTIONS_BASE_URL
    if (!apiBaseUrl) {
      console.error('[MANAGEMENT API] No API base URL configured')
      throw new Error('API_BASE_URL or AZURE_FUNCTIONS_BASE_URL not configured')
    }
    
    console.log('[MANAGEMENT API] Fetching devices from:', `${apiBaseUrl}/api/devices`)
    
    // First get the list of all devices
    const devicesResponse = await fetch(`${apiBaseUrl}/api/devices`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ReportMate/1.0.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!devicesResponse.ok) {
      throw new Error(`Azure Functions API error: ${devicesResponse.status} ${devicesResponse.statusText}`)
    }
    
    const devices = await devicesResponse.json()
    console.log('[MANAGEMENT API] Found', devices.length, 'devices')
    
    const managementData = []
    
    // Get management data for each device
    for (const device of devices) {
      try {
        const deviceResponse = await fetch(`${apiBaseUrl}/api/device/${device.serialNumber}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'ReportMate/1.0.0',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        
        if (!deviceResponse.ok) {
          console.warn('[MANAGEMENT API] Failed to fetch device:', device.serialNumber)
          continue
        }
        
        const deviceData = await deviceResponse.json()
        const managementModule = deviceData.device?.modules?.management
        
        if (managementModule) {
          // Convert PowerShell objects to proper JSON
          const processedManagement = convertPowerShellObjects(managementModule) as any
          
          // Extract management information
          const provider = processedManagement?.mdmEnrollment?.provider
          const isEnrolled = processedManagement?.mdmEnrollment?.isEnrolled || false
          const enrollmentType = processedManagement?.mdmEnrollment?.enrollmentType
          const enrollmentStatus = isEnrolled ? 'Enrolled' : 'Not Enrolled'
          const intuneId = processedManagement?.deviceDetails?.intuneDeviceId
          const tenantName = processedManagement?.tenantDetails?.tenantName
          
          // Only include devices with management data
          if (provider || isEnrolled || enrollmentType || intuneId) {
            managementData.push({
              id: device.deviceId,
              deviceId: device.deviceId,
              deviceName: device.name || device.serialNumber,
              serialNumber: device.serialNumber,
              lastSeen: device.lastSeen,
              collectedAt: device.lastSeen,
              provider: provider || 'Unknown',
              enrollmentStatus: enrollmentStatus,
              enrollmentType: enrollmentType || '-',
              intuneId: intuneId || '-',
              tenantName: tenantName || '-',
              isEnrolled: isEnrolled,
              raw: processedManagement
            })
          }
        }
      } catch (error) {
        console.warn('[MANAGEMENT API] Error processing device:', device.serialNumber, error)
        continue
      }
    }
    
    console.log('[MANAGEMENT API] Returning management data for', managementData.length, 'devices')
    
    return NextResponse.json(managementData, {
      headers: {
        'x-devices-total': devices.length.toString(),
        'x-management-devices': managementData.length.toString(),
        'x-data-source': 'azure-functions'
      }
    })
  } catch (error) {
    console.error('[MANAGEMENT API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch management data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
