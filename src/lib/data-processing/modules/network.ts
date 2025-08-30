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
  dns?: any
  interfaces?: NetworkInterface[]
  wifiNetworks?: any[]
  vpnConnections?: any[]
  routes?: any[]
  connectionType?: string
  ssid?: string
  signalStrength?: number | string
  interfaceName?: string
  vpnName?: string
  vpnActive?: boolean
}

export interface NetworkInterface {
  name: string
  ipAddress?: string
  ipAddresses?: string[]
  macAddress?: string
  type?: string
  status?: string
  speed?: string
  friendlyName?: string
  isActive?: boolean
  mtu?: number
  bytesSent?: number
  bytesReceived?: number
  linkSpeed?: string
}

/**
 * Extract network information from device modules
 * MODULAR: Self-contained network data processing
 */
/**
 * Extract network information from device modules
 * MODULAR: Self-contained network data processing
 */
export function extractNetwork(deviceModules: any): NetworkInfo {
  console.log('[NETWORK MODULE] Processing network data')
  
  // Initialize with defaults
  const networkInfo: NetworkInfo = {}

  if (!deviceModules?.modules) {
    console.log('[NETWORK MODULE] No modules data found')
    return networkInfo
  }

  const modules = deviceModules.modules

  // Check for network data in modules.network
  const network = modules?.network
  if (!network) {
    console.log('[NETWORK MODULE] No network module found')
    return networkInfo
  }

  console.log('[NETWORK MODULE] Found network module with keys:', Object.keys(network))

  // Extract active connection information
  if (network.activeConnection) {
    const active = network.activeConnection
    networkInfo.ipAddress = active.ipAddress
    networkInfo.macAddress = active.macAddress
    networkInfo.gateway = active.gateway
    networkInfo.connectionType = active.connectionType
    networkInfo.interfaceName = active.interfaceName || active.friendlyName
    networkInfo.ssid = active.activeWifiSsid
    networkInfo.signalStrength = active.wifiSignalStrength
    networkInfo.vpnName = active.vpnName
    networkInfo.vpnActive = active.isVpnActive
  }

  // Extract DNS information
  if (network.dns) {
    networkInfo.dns = network.dns
  }

  // Extract all network interfaces
  if (network.interfaces && Array.isArray(network.interfaces)) {
    const allInterfaces = network.interfaces.map((iface: any) => {
      // Find best IP address to display
      let displayAddress = ''
      if (iface.ipAddresses && Array.isArray(iface.ipAddresses)) {
        // For active interfaces, prioritize IPv4
        if (iface.status === 'Up' || iface.isActive) {
          // Look for IPv4 address first (format: x.x.x.x)
          const ipv4 = iface.ipAddresses.find((ip: string) => 
            /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
          )
          displayAddress = ipv4 || iface.ipAddresses[0] || ''
        } else {
          // For disconnected interfaces, show the current IP address (likely IPv6 link-local)
          // Look for any actual IP address (prefer non-link-local if available)
          const nonLinkLocal = iface.ipAddresses.find((ip: string) => 
            !ip.startsWith('fe80::') && 
            !ip.startsWith('169.254.') && // APIPA
            !ip.startsWith('127.') // Loopback
          )
          displayAddress = nonLinkLocal || iface.ipAddresses[0] || ''
        }
      }

      // Normalize status - map "Up" to active status
      const isUp = iface.status === 'Up' || iface.status === 'Active' || iface.status === 'Connected'
      const isActive = iface.isActive === true || isUp
      const normalizedStatus = isUp ? (iface.isActive ? 'Active' : 'Connected') : 'Disconnected'

      return {
        name: iface.name || iface.friendlyName || 'Unknown',
        friendlyName: iface.friendlyName,
        ipAddress: displayAddress,
        ipAddresses: iface.ipAddresses,
        macAddress: iface.macAddress,
        type: iface.type,
        status: normalizedStatus,
        isActive: isActive,
        mtu: iface.mtu,
        bytesSent: iface.bytesSent,
        bytesReceived: iface.bytesReceived,
        linkSpeed: iface.linkSpeed
      }
    })

    // Filter out virtual/internal network adapters
    const physicalInterfaces = allInterfaces.filter((iface: NetworkInterface) => {
      // Filter out virtual adapters by MAC address patterns
      const isVirtualMac = iface.macAddress && (
        iface.macAddress.startsWith('00:15:5d') || // Hyper-V
        iface.macAddress.startsWith('00:50:56') || // VMware
        iface.macAddress.startsWith('08:00:27') || // VirtualBox
        iface.macAddress.startsWith('0a:00:27')    // VirtualBox
      );
      
      // Filter out by IP address patterns (common virtual network ranges)
      const hasVirtualIP = iface.ipAddresses?.some((ip: string) => 
        ip.startsWith('172.') || // Docker, WSL2, Hyper-V ranges
        ip.startsWith('10.0.75.') || // WSL2
        ip.startsWith('169.254.') // APIPA/link-local
      );
      
      // Keep interface if it's not clearly virtual
      return !isVirtualMac && !hasVirtualIP;
    })

    // Sort interfaces: active first, then by type (wireless preferred), then by name
    physicalInterfaces.sort((a: NetworkInterface, b: NetworkInterface) => {
      // Active interfaces first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      
      // Among active interfaces, prefer wireless
      if (a.isActive && b.isActive) {
        if (a.type === 'Wireless' && b.type !== 'Wireless') return -1;
        if (a.type !== 'Wireless' && b.type === 'Wireless') return 1;
      }
      
      // Sort by name as tiebreaker
      return a.name.localeCompare(b.name);
    })

    networkInfo.interfaces = physicalInterfaces
  }

  // Extract WiFi networks
  if (network.wifiNetworks && Array.isArray(network.wifiNetworks)) {
    networkInfo.wifiNetworks = network.wifiNetworks
  }

  // Extract VPN connections
  if (network.vpnConnections && Array.isArray(network.vpnConnections)) {
    networkInfo.vpnConnections = network.vpnConnections
  }

  // Extract routes
  if (network.routes && Array.isArray(network.routes)) {
    networkInfo.routes = network.routes
  }

  // Extract hostname (try multiple sources, but don't use fallback)
  if (network.hostname) {
    networkInfo.hostname = network.hostname
  } else if (deviceModules.hostname) {
    networkInfo.hostname = deviceModules.hostname
  } else if (deviceModules.computerName) {
    networkInfo.hostname = deviceModules.computerName
  } else if (deviceModules.deviceName) {
    networkInfo.hostname = deviceModules.deviceName
  } else {
    // Try to extract from system module environment variables
    const systemModule = modules?.system
    if (systemModule?.environment && Array.isArray(systemModule.environment)) {
      const computerNameVar = systemModule.environment.find((env: any) => 
        env.name === 'COMPUTERNAME' || env.name === 'HOSTNAME'
      )
      if (computerNameVar?.value) {
        networkInfo.hostname = computerNameVar.value
      }
    }
    
    // If still no hostname, leave it undefined (will show as N/A in UI)
  }

  console.log('[NETWORK MODULE] Network info extracted:', {
    hasActiveConnection: !!network.activeConnection,
    interfacesCount: networkInfo.interfaces?.length || 0,
    wifiNetworksCount: networkInfo.wifiNetworks?.length || 0,
    vpnConnectionsCount: networkInfo.vpnConnections?.length || 0,
    routesCount: networkInfo.routes?.length || 0,
    connectionType: networkInfo.connectionType,
    ssid: networkInfo.ssid
  })

  return networkInfo
}
