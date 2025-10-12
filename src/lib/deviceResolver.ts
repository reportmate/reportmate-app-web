/**
 * Device Resolution Service
 * 
 * Simplified approach: Try direct lookup first, then search all fields.
 * No more brittle regex patterns that can crash pages.
 */

interface DeviceResolutionResult {
  found: boolean
  serialNumber?: string
  originalIdentifier: string
  identifierType: 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName'
}

/**
 * Simple identifier type detection - only used for logging, not routing
 */
export function identifyDeviceIdentifierType(identifier: string): 'uuid' | 'assetTag' | 'serialNumber' | 'deviceName' {
  // UUID pattern: 8-4-4-4-12 hexadecimal characters
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (uuidPattern.test(identifier)) {
    return 'uuid'
  }
  
  // If it contains spaces, it's probably a device name
  if (identifier.includes(' ')) {
    return 'deviceName'
  }
  
  // For everything else, just call it a serialNumber
  // The backend will try all fields anyway
  return 'serialNumber'
}

/**
 * Resolves a device identifier to its canonical serial number
 */
export async function resolveDeviceIdentifier(identifier: string): Promise<DeviceResolutionResult> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  console.log(`[DEVICE RESOLVER] Resolving ${identifierType}: ${identifier}`)
  
  // Always validate through the API - don't assume identifiers are valid
  
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
export async function resolveDeviceIdentifierServer(identifier: string): Promise<DeviceResolutionResult> {
  const identifierType = identifyDeviceIdentifierType(identifier)
  console.log(`[DEVICE RESOLVER SERVER] Resolving ${identifierType}: ${identifier}`)
  
  try {
    // Always use the local Next.js API which has proper fallback logic
    const baseUrl = process.env.NODE_ENV === 'production'   
      ? `https://${process.env.VERCEL_URL || 'localhost'}`
      : 'http://localhost:3000'  // Use the actual dev server port
    
    // Always query the devices API to search for the identifier - don't assume it's already a serial number
    const response = await fetch(`${baseUrl}/api/devices?limit=1000`, {
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
    
    console.log(`[DEVICE RESOLVER SERVER] Searching ${data.length} devices for identifier: ${identifier}`)
    
    // First, try exact match on serial number (most common case)
    let device = data.find((d: any) => d.serialNumber === identifier)
    if (device) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Found exact serial number match: ${identifier}`)
      return {
        found: true,
        serialNumber: identifier,
        originalIdentifier: identifier,
        identifierType: 'serialNumber'
      }
    }
    
    // Then try UUID matches
    device = data.find((d: any) => d.deviceId === identifier || d.id === identifier)
    if (device && device.serialNumber) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Resolved UUID ${identifier} → serial number: ${device.serialNumber}`)
      return {
        found: true,
        serialNumber: device.serialNumber,
        originalIdentifier: identifier,
        identifierType: 'uuid'
      }
    }
    
    // Then try asset tag at top level
    device = data.find((d: any) => d.assetTag === identifier)
    if (device && device.serialNumber) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Resolved Asset Tag ${identifier} → serial number: ${device.serialNumber}`)
      return {
        found: true,
        serialNumber: device.serialNumber,
        originalIdentifier: identifier,
        identifierType: 'assetTag'
      }
    }
    
    // Check for asset tag in modules.inventory
    device = data.find((d: any) => d.modules?.inventory?.assetTag === identifier)
    if (device && device.serialNumber) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Resolved Asset Tag (inventory) ${identifier} → serial number: ${device.serialNumber}`)
      return {
        found: true,
        serialNumber: device.serialNumber,
        originalIdentifier: identifier,
        identifierType: 'assetTag'
      }
    }
    
    // Check device names
    device = data.find((d: any) => 
      d.name === identifier || 
      d.modules?.inventory?.deviceName === identifier ||
      d.modules?.inventory?.device_name === identifier ||
      d.modules?.inventory?.computerName === identifier ||
      d.modules?.inventory?.computer_name === identifier
    )
    if (device && device.serialNumber) {
      console.log(`[DEVICE RESOLVER SERVER] ✅ Resolved Device Name ${identifier} → serial number: ${device.serialNumber}`)
      return {
        found: true,
        serialNumber: device.serialNumber,
        originalIdentifier: identifier,
        identifierType: 'deviceName'
      }
    }
    
    console.log(`[DEVICE RESOLVER SERVER] ❌ No device found for identifier: ${identifier}`)
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
