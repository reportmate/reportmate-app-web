import { NextRequest, NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper function to convert PowerShell object strings to JSON objects
function parsePowerShellObject(str: string, parentKey?: string, originalObj?: unknown): unknown {
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
        result[key] = parsePowerShellObject(valueStr, key, originalObj)
      } else if (valueStr.startsWith('System.Object[]')) {
        result[key] = { _powershellArray: true, _rawValue: valueStr }
      } else {
        result[key] = valueStr
      }
    }
    
    return result
  } catch (error) {
    console.warn('Failed to parse PowerShell object:', str.substring(0, 100), error)
    return str
  }
}

// Recursively process object to convert PowerShell object strings
function convertPowerShellObjects(obj: unknown, parentKey?: string, originalObj?: unknown): unknown {
  if (typeof obj === 'string') {
    return parsePowerShellObject(obj, parentKey, originalObj)
  } else if (Array.isArray(obj)) {
    return obj.map((item, index) => convertPowerShellObjects(item, `${parentKey}[${index}]`, obj))
  } else if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (['events', 'items', 'sessions'].includes(key) && Array.isArray(value)) {
        result[key] = value 
      } else {
        result[key] = convertPowerShellObjects(value, key, obj)
      }
    }
    return result
  }
  return obj
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  
  try {
    const apiBaseUrl = process.env.API_BASE_URL
    
    if (!apiBaseUrl) {
      console.error('[DEVICES API] API_BASE_URL not configured')
      return NextResponse.json({
        error: 'API configuration error',
        details: 'API_BASE_URL environment variable not configured',
        timestamp
      }, { status: 500 })
    }

    
    const incomingParams = new URLSearchParams(request.nextUrl.searchParams)
    const queryString = incomingParams.toString()
    const devicesUrl = `${apiBaseUrl}/api/devices${queryString ? `?${queryString}` : ''}`
        
    // Use shared authentication headers
    const headers = getInternalApiHeaders()
    
    const response = await fetch(devicesUrl, {
      cache: 'no-store',
      headers
    })

    if (!response.ok) {
      console.error('[DEVICES API] FastAPI error:', response.status, response.statusText)
      return NextResponse.json({
        error: 'Failed to fetch devices from FastAPI',
        status: response.status,
        timestamp
      }, { status: 500 })
    }

    const fastApiData = await response.json()
    
    // Process the data to handle PowerShell objects
    let processedData = fastApiData
    if (fastApiData.devices && Array.isArray(fastApiData.devices)) {
                processedData = {
            ...fastApiData,
            devices: fastApiData.devices.map((device: any) => convertPowerShellObjects(device))
        }
            }

    return NextResponse.json(processedData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
  } catch (error) {
    console.error('[DEVICES API] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }, { status: 500 })
  }
}
