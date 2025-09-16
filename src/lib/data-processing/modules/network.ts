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
  // Enhanced DNS and NETBIOS for active connection
  activeDnsServers?: string[]
  activeNetbiosName?: string
  activeNetbiosType?: string
  // Computer's DNS address/FQDN
  dnsAddress?: string
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
  wirelessProtocol?: string
  wirelessBand?: string
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
    
    // Extract DNS servers for active connection (prefer IPv4, limit to 2-3 for display)
    if (network.dns.servers && Array.isArray(network.dns.servers)) {
      const servers = network.dns.servers
      // Prioritize IPv4 servers for active connection display
      const ipv4Servers = servers.filter((server: string) => 
        /^(\d{1,3}\.){3}\d{1,3}$/.test(server)
      )
      const ipv6Servers = servers.filter((server: string) => 
        /^[0-9a-fA-F:]+$/.test(server) && server.includes(':')
      )
      
      // Take 1-2 IPv4 servers and 1 IPv6 server for widget display
      const displayServers = [
        ...ipv4Servers.slice(0, 2),
        ...ipv6Servers.slice(0, 1)
      ]
      networkInfo.activeDnsServers = displayServers.slice(0, 3)
    }
  }

  // Extract NETBIOS information for active connection
  if (network.netbios && network.netbios.localNames && Array.isArray(network.netbios.localNames)) {
    const activeInterface = networkInfo.interfaceName
    
    // Find NETBIOS name for the active interface, prefer "File Server Service" type
    const activeNetbiosEntry = network.netbios.localNames.find((entry: any) => {
      // Match by interface name or use first entry if no interface match
      if (activeInterface && entry.interface) {
        // Handle case where interfaceName might be just a number but interface is full name
        const interfaceMatch = entry.interface.includes(activeInterface) || 
                               activeInterface.includes(entry.interface) ||
                               entry.interface === activeInterface
        return interfaceMatch && entry.type === 'File Server Service'
      }
      return false
    })
    
    // Fallback to first File Server Service entry if no interface match
    const fallbackEntry = activeNetbiosEntry || network.netbios.localNames.find((entry: any) => 
      entry.type === 'File Server Service'
    )
    
    if (fallbackEntry) {
      networkInfo.activeNetbiosName = fallbackEntry.name
      networkInfo.activeNetbiosType = fallbackEntry.type
    }
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
        linkSpeed: iface.linkSpeed,
        wirelessProtocol: iface.wirelessProtocol,
        wirelessBand: iface.wirelessBand
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

  // Build computer's DNS address/FQDN
  if (networkInfo.hostname) {
    const domain = network.domain || network.dns?.domain || network.dns?.dhcpDomain
    if (domain && domain.trim() !== '') {
      networkInfo.dnsAddress = `${networkInfo.hostname}.${domain}`
    } else {
      networkInfo.dnsAddress = networkInfo.hostname
    }
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
