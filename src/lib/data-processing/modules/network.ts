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
    
  // Initialize with defaults
  const networkInfo: NetworkInfo = {}

  if (!deviceModules?.modules) {
        return networkInfo
  }

  const modules = deviceModules.modules

  // Check for network data in modules.network
  const network = modules?.network
  if (!network) {
        return networkInfo
  }

  
  // Extract active connection information - support both snake_case (new) and camelCase (legacy)
  const activeConnection = network.active_connection || network.activeConnection
  if (activeConnection) {
    const active = activeConnection
    networkInfo.ipAddress = active.ip_address || active.ipAddress
    networkInfo.macAddress = active.mac_address || active.macAddress
    networkInfo.gateway = active.gateway
    networkInfo.connectionType = active.connection_type || active.connectionType
    networkInfo.interfaceName = active.interface_name || active.interfaceName || active.friendly_name || active.friendlyName
    networkInfo.ssid = active.active_wifi_ssid || active.activeWifiSsid
    networkInfo.signalStrength = active.wifi_signal_strength || active.wifiSignalStrength
    networkInfo.vpnName = active.vpn_name || active.vpnName
    networkInfo.vpnActive = active.is_vpn_active || active.isVpnActive
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
        const isFileServer = entry.type === 'File Server Service'
                return interfaceMatch && isFileServer
      }
      return false
    })
    
    // Fallback to first File Server Service entry if no interface match
    const fallbackEntry = activeNetbiosEntry || network.netbios.localNames.find((entry: any) => 
      entry.type === 'File Server Service'
    )
    
    // Additional fallback: any NetBIOS entry (Workstation Service is also useful)
    const anyNetbiosEntry = fallbackEntry || network.netbios.localNames[0]
    
    if (anyNetbiosEntry) {
      networkInfo.activeNetbiosName = anyNetbiosEntry.name
      networkInfo.activeNetbiosType = anyNetbiosEntry.type
          } else {
          }
  } else {
      }

  // Extract all network interfaces
  if (network.interfaces && Array.isArray(network.interfaces)) {
    const allInterfaces = network.interfaces.map((iface: any) => {
      // Find best IP address to display
      let displayAddress = ''
      
      // Handle both Windows (ipAddresses array) and Mac (addresses array with family/address objects)
      const ipAddresses: string[] = []
      if (iface.ipAddresses && Array.isArray(iface.ipAddresses)) {
        ipAddresses.push(...iface.ipAddresses)
      }
      // Mac format: addresses: [{ address: "192.168.1.100", family: "IPv4", netmask: "..." }]
      if (iface.addresses && Array.isArray(iface.addresses)) {
        iface.addresses.forEach((addr: any) => {
          if (addr.address) {
            ipAddresses.push(addr.address)
          }
        })
      }
      
      // Determine if interface is up/active
      // Mac uses isUp: 1/0, Windows uses status: "Up"
      const isUp = iface.status === 'Up' || iface.status === 'Active' || iface.status === 'Connected' || 
                   iface.isUp === 1 || iface.isUp === true
      
      if (ipAddresses.length > 0) {
        // For active interfaces, prioritize IPv4
        if (isUp || iface.isActive) {
          // Look for IPv4 address first (format: x.x.x.x)
          const ipv4 = ipAddresses.find((ip: string) => 
            /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
          )
          displayAddress = ipv4 || ipAddresses[0] || ''
        } else {
          // For disconnected interfaces, show the current IP address (likely IPv6 link-local)
          // Look for any actual IP address (prefer non-link-local if available)
          const nonLinkLocal = ipAddresses.find((ip: string) => 
            !ip.startsWith('fe80::') && 
            !ip.startsWith('169.254.') && // APIPA
            !ip.startsWith('127.') // Loopback
          )
          displayAddress = nonLinkLocal || ipAddresses[0] || ''
        }
      }

      // Normalize status - map "Up" to active status
      const isActive = iface.isActive === true || iface.is_active === true || isUp
      const normalizedStatus = isUp ? (isActive ? 'Active' : 'Connected') : 'Disconnected'

      // Support both snake_case (new osquery) and camelCase (legacy) field names
      return {
        name: iface.name || iface.friendly_name || iface.friendlyName || 'Unknown',
        friendlyName: iface.friendly_name || iface.friendlyName,
        ipAddress: displayAddress,
        ipAddresses: ipAddresses,
        macAddress: iface.mac_address || iface.macAddress,
        type: iface.type,
        status: normalizedStatus,
        isActive: isActive,
        mtu: iface.mtu,
        bytesSent: iface.bytes_sent || iface.bytesSent,
        bytesReceived: iface.bytes_received || iface.bytesReceived,
        linkSpeed: iface.link_speed || iface.linkSpeed,
        wirelessProtocol: iface.wireless_protocol || iface.wirelessProtocol,
        wirelessBand: iface.wireless_band || iface.wirelessBand
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
    
    // FALLBACK: If no activeConnection data, use first active interface
    if (!network.activeConnection && physicalInterfaces.length > 0) {
      const activeInterface = physicalInterfaces.find((iface: NetworkInterface) => iface.isActive)
      if (activeInterface) {
                networkInfo.ipAddress = networkInfo.ipAddress || activeInterface.ipAddress
        networkInfo.macAddress = networkInfo.macAddress || activeInterface.macAddress
        networkInfo.interfaceName = networkInfo.interfaceName || activeInterface.friendlyName || activeInterface.name
        networkInfo.connectionType = networkInfo.connectionType || activeInterface.type
        // Extract wireless protocol for display (e.g., "WiFi 6")
        if (activeInterface.wirelessProtocol) {
          networkInfo.connectionType = activeInterface.wirelessProtocol
        }
      }
    }
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
  
  // FALLBACK: If no dnsAddress and we have DNS servers, use the first DNS server
  if (!networkInfo.dnsAddress && networkInfo.activeDnsServers && networkInfo.activeDnsServers.length > 0) {
    networkInfo.dnsAddress = networkInfo.activeDnsServers[0]
  }

  
  return networkInfo
}
