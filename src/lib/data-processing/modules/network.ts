/**
 * Network Info Module  
 * Handles all network data extraction in isolation
 */

export interface NetworkInfo {
  ipAddress?: string
  macAddress?: string
  hostname?: string
  domain?: string
  gateway?: string
  dns?: string[]
  interfaces?: NetworkInterface[]
}

export interface NetworkInterface {
  name: string
  ipAddress?: string
  macAddress?: string
  type?: string
  status?: string
  speed?: string
}

/**
 * Extract network information from device modules
 * MODULAR: Self-contained network data processing
 */
/**
 * Extract network information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean data
 */
export function extractNetwork(deviceModules: any): NetworkInfo {
  if (!deviceModules?.network) {
    console.log('[NETWORK MODULE] No network data found in modules')
    return {}
  }

  const network = deviceModules.network
  
  console.log('[NETWORK MODULE] Processing network data:', {
    hasPrimaryInterface: !!network.primaryInterface,
    hasInterfaces: !!network.interfaces,
    interfaceCount: network.interfaces?.length || 0
  })

  const networkInfo: NetworkInfo = {}

  // Primary interface (main IP/MAC)
  if (network.primaryInterface) {
    networkInfo.ipAddress = network.primaryInterface.ipAddress
    networkInfo.macAddress = network.primaryInterface.macAddress
  }

  // System network info
  if (network.hostname) networkInfo.hostname = network.hostname
  if (network.domain) networkInfo.domain = network.domain
  if (network.gateway) networkInfo.gateway = network.gateway
  if (network.dns) networkInfo.dns = network.dns

  // All interfaces
  if (network.interfaces && Array.isArray(network.interfaces)) {
    networkInfo.interfaces = network.interfaces.map((iface: any) => ({
      name: iface.name || 'Unknown',
      ipAddress: iface.ipAddress,
      macAddress: iface.macAddress,
      type: iface.type,
      status: iface.status,
      speed: iface.speed
    }))
  }

  console.log('[NETWORK MODULE] Network info extracted:', Object.keys(networkInfo))
  return networkInfo
}
