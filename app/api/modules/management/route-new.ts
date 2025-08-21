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
      throw new Error('API_BASE_URL or AZURE_FUNCTIONS_BASE_URL not configured')
    }
    
    console.log('[MANAGEMENT API] Fetching from Azure Functions:', `${apiBaseUrl}/api/device/79349310-287D-8166-52FC-0644E27378F7`)
    
    // For now, let's directly fetch the device we know exists and extract management data
    const response = await fetch(`${apiBaseUrl}/api/device/79349310-287D-8166-52FC-0644E27378F7`, {
      method: 'GET',
      headers: {
        'REPORTMATE_PASSPHRASE': process.env.REPORTMATE_PASSPHRASE || ''
      }
    })
    
    if (!response.ok) {
      throw new Error(`Azure Functions API error: ${response.status} ${response.statusText}`)
    }
    
    const deviceData = await response.json()
    console.log('[MANAGEMENT API] Got device data:', {
      hasData: !!deviceData.data,
      dataType: typeof deviceData.data,
      deviceId: deviceData.metadata?.deviceId
    })
    
    if (!deviceData.data) {
      console.log('[MANAGEMENT API] No device data found')
      return NextResponse.json([])
    }
    
    // Parse the unified data structure
    const unifiedData = typeof deviceData.data === 'string' ? JSON.parse(deviceData.data) : deviceData.data
    
    if (!unifiedData || !unifiedData.management) {
      console.log('[MANAGEMENT API] No management data in unified structure')
      return NextResponse.json([])
    }
    
    console.log('[MANAGEMENT API] Found management data, processing...')
    
    // Convert PowerShell objects to proper JSON
    const managementModule = convertPowerShellObjects(unifiedData.management) as any
    
    // Extract management information
    const provider = managementModule?.mdmEnrollment?.provider
    const isEnrolled = managementModule?.mdmEnrollment?.isEnrolled || false
    const enrollmentType = managementModule?.mdmEnrollment?.enrollmentType
    const enrollmentStatus = isEnrolled ? 'Enrolled' : 'Not Enrolled'
    const intuneId = managementModule?.deviceDetails?.intuneDeviceId
    const tenantName = managementModule?.tenantDetails?.tenantName
    
    const managementData = [{
      id: deviceData.metadata?.deviceId || 'unknown',
      deviceId: deviceData.metadata?.deviceId || 'unknown',
      deviceName: unifiedData.inventory?.deviceName || 'Unknown Device',
      serialNumber: deviceData.metadata?.serialNumber || 'Unknown',
      lastSeen: deviceData.metadata?.collectedAt,
      collectedAt: deviceData.metadata?.collectedAt,
      provider: provider || 'Unknown',
      enrollmentStatus: enrollmentStatus,
      enrollmentType: enrollmentType || '-',
      intuneId: intuneId || '-',
      tenantName: tenantName || '-',
      isEnrolled: isEnrolled,
      raw: managementModule
    }]
    
    console.log('[MANAGEMENT API] Returning management data:', managementData.length, 'devices')
    
    return NextResponse.json(managementData, {
      headers: {
        'x-devices-total': '1',
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
