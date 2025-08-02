/**
 * Device Resolution Service
 * 
 * This service provides functionality to resolve device identifiers (UUID, Asset Tag, or Serial Number)
 * to the canonical serial number-based URL for ReportMate device pages.
 */

interface DeviceIdentifiers {
  deviceId: string      // UUID
  serialNumber: string  // Serial Number (canonical identifier)
  assetTag?: string    // Asset Tag
}

interface DeviceResolutionResult {
  found: boolean
  serialNumber?: string
  originalIdentifier: string
  identifierType: 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName'
}

/**
 * Determines the type of device identifier based on its format
 */
export function identifyDeviceIdentifierType(identifier: string): 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName' {
  // UUID pattern: 8-4-4-4-12 hexadecimal characters
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (uuidPattern.test(identifier)) {
    return 'uuid'
  }
  
  // Asset Tag pattern: typically starts with letters and contains numbers
  // Common patterns: A004733, AT123456, etc. - must contain at least one digit
  const assetTagPattern = /^[A-Z][0-9A-Z]*[0-9][0-9A-Z]*$/i
  
  if (assetTagPattern.test(identifier)) {
    return 'assetTag'
  }
  
  // Device Name pattern: contains letters, may have spaces or special characters
  const deviceNamePattern = /^[A-Za-z][A-Za-z0-9\s\-_.]*$/
  
  if (deviceNamePattern.test(identifier) && !identifier.match(/^[0-9A-F]{10,}$/i)) {
    return 'deviceName'
  }
  
  // Assume everything else is a serial number
  return 'serialNumber'
}

/**
 * Resolves a device identifier to its canonical serial number
 */
export async function resolveDeviceIdentifier(identifier: string): Promise<DeviceResolutionResult> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  console.log(`[DEVICE RESOLVER] Resolving ${identifierType}: ${identifier}`)
  
  // If it's already a serial number, return it directly
  if (identifierType === 'serialNumber') {
    return {
      found: true,
      serialNumber: identifier,
      originalIdentifier: identifier,
      identifierType: 'serialNumber'
    }
  }
  
  try {
    // Use the dedicated resolution API
    const response = await fetch(`/api/device/resolve/${encodeURIComponent(identifier)}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('[DEVICE RESOLVER] Failed to resolve identifier:', response.status)
      return {
        found: false,
        originalIdentifier: identifier,
        identifierType
      }
    }
    
    const data = await response.json()
    
    if (data.success && data.resolved && data.serialNumber) {
      return {
        found: true,
        serialNumber: data.serialNumber,
        originalIdentifier: identifier,
        identifierType
      }
    } else {
      return {
        found: false,
        originalIdentifier: identifier,
        identifierType
      }
    }
    
  } catch (error) {
    console.error('[DEVICE RESOLVER] Error resolving device identifier:', error)
    return {
      found: false,
      originalIdentifier: identifier,
      identifierType
    }
  }
}

/**
 * Server-side version of the resolver for use in API routes
 */
export async function resolveDeviceIdentifierServer(identifier: string, apiBaseUrl: string): Promise<DeviceResolutionResult> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  console.log(`[DEVICE RESOLVER SERVER] Resolving ${identifierType}: ${identifier}`)
  
  // If it's already a serial number, return it directly
  if (identifierType === 'serialNumber') {
    return {
      found: true,
      serialNumber: identifier,
      originalIdentifier: identifier,
      identifierType: 'serialNumber'
    }
  }
  
  try {
    // Always use the local Next.js API which has proper fallback logic
    const baseUrl = process.env.NODE_ENV === 'production'   
      ? `https://${process.env.VERCEL_URL || 'localhost'}`
      : 'http://localhost:3003'  // Use the actual dev server port
    
    // For UUID or Asset Tag, we need to query the local devices API (which handles fallbacks)
    const response = await fetch(`${baseUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      console.error('[DEVICE RESOLVER SERVER] Failed to fetch devices from local API:', response.status)
      return {
        found: false,
        originalIdentifier: identifier,
        identifierType
      }
    }
    
    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.error('[DEVICE RESOLVER SERVER] Invalid devices response format')
      return {
        found: false,
        originalIdentifier: identifier,
        identifierType
      }
    }
    
    // Search for the device by the appropriate identifier
    const device = data.find((d: any) => {
      if (identifierType === 'uuid') {
        // Check if the UUID matches the deviceId field
        return d.deviceId === identifier || d.id === identifier
      } else if (identifierType === 'assetTag') {
        // Check if asset tag matches at the top level first
        return d.assetTag === identifier
      }
      return false
    })
    
    if (device && device.serialNumber) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Resolved ${identifierType} ${identifier} → serial number: ${device.serialNumber}`)
      return {
        found: true,
        serialNumber: device.serialNumber,
        originalIdentifier: identifier,
        identifierType
      }
    }
    
    // If not found by simple lookup, we need to check individual device records for asset tags and device names
    if (identifierType === 'assetTag' || identifierType === 'uuid' || identifierType === 'deviceName') {
      console.log(`[DEVICE RESOLVER SERVER] Performing detailed search for ${identifierType}: ${identifier}`)
      
      // Check each device's detailed data for matching identifiers
      for (const device of data) {
        if (!device.serialNumber) continue
        
        try {
          const deviceResponse = await fetch(`${baseUrl}/api/device/${device.serialNumber}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          if (deviceResponse.ok) {
            const deviceData = await deviceResponse.json()
            
            if (identifierType === 'uuid') {
              // Check various UUID fields in the response
              if (deviceData.metadata?.deviceId === identifier ||
                  deviceData.inventory?.uuid === identifier ||
                  deviceData.inventory?.deviceId === identifier ||
                  deviceData.deviceId === identifier) {
                console.log(`[DEVICE RESOLVER SERVER] ✅ Found UUID ${identifier} in device ${device.serialNumber}`)
                return {
                  found: true,
                  serialNumber: device.serialNumber,
                  originalIdentifier: identifier,
                  identifierType
                }
              }
            } else if (identifierType === 'assetTag') {
              // Check asset tag in various locations
              if (deviceData.inventory?.assetTag === identifier ||
                  deviceData.assetTag === identifier) {
                console.log(`[DEVICE RESOLVER SERVER] ✅ Found Asset Tag ${identifier} in device ${device.serialNumber}`)
                return {
                  found: true,
                  serialNumber: device.serialNumber,
                  originalIdentifier: identifier,
                  identifierType
                }
              }
            } else if (identifierType === 'deviceName') {
              // Check multiple possible device name fields
              const deviceName = deviceData.inventory?.deviceName || deviceData.inventory?.device_name || deviceData.name
              const computerName = deviceData.inventory?.computerName || deviceData.inventory?.computer_name
              
              if (deviceName === identifier || computerName === identifier ||
                  deviceName?.toLowerCase() === identifier.toLowerCase() ||
                  computerName?.toLowerCase() === identifier.toLowerCase()) {
                console.log(`[DEVICE RESOLVER SERVER] ✅ Found Device Name ${identifier} in device ${device.serialNumber}`)
                return {
                  found: true,
                  serialNumber: device.serialNumber,
                  originalIdentifier: identifier,
                  identifierType
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[DEVICE RESOLVER SERVER] Failed to check device ${device.serialNumber}:`, error)
          continue
        }
      }
    }
    
    console.log(`[DEVICE RESOLVER SERVER] ❌ No device found for ${identifierType}: ${identifier}`)
    return {
      found: false,
      originalIdentifier: identifier,
      identifierType
    }
    
  } catch (error) {
    console.error('[DEVICE RESOLVER SERVER] Error resolving device identifier:', error)
    return {
      found: false,
      originalIdentifier: identifier,
      identifierType
    }
  }
}
