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
    
    // Mac: If active interface is a VPN tunnel (utun*), find the physical connection instead
    // VPN should enhance, not replace, the primary physical connection display
    let primaryInterface = active.interface_name || active.interfaceName || active.interface || active.friendly_name || active.friendlyName
    let primaryIP = active.ip_address || active.ipAddress
    let primaryConnectionType = active.connection_type || active.connectionType
    
    // Check if the active connection is a VPN tunnel
    const isVpnTunnel = primaryInterface?.startsWith('utun') || primaryInterface?.startsWith('ppp')
    
    if (isVpnTunnel && network.interfaces && Array.isArray(network.interfaces)) {
      // Find the primary physical interface (en0 for Mac, or first active ethernet/wifi)
      const physicalInterface = network.interfaces.find((iface: any) => {
        const name = iface.name || iface.interface
        const hasIP = iface.addresses?.some((addr: any) => 
          addr.family === 'IPv4' && addr.address && !addr.address.startsWith('127.')
        ) || (iface.address && !iface.address.startsWith('127.'))
        const isPhysical = name === 'en0' || 
          (iface.type === 'Ethernet' || iface.type === 'WiFi' || iface.type === 'Wireless')
        return hasIP && isPhysical
      })
      
      if (physicalInterface) {
        primaryInterface = physicalInterface.displayName || physicalInterface.name || physicalInterface.interface
        // Get the IPv4 address
        if (physicalInterface.addresses && Array.isArray(physicalInterface.addresses)) {
          const ipv4Addr = physicalInterface.addresses.find((addr: any) => addr.family === 'IPv4')
          if (ipv4Addr) primaryIP = ipv4Addr.address
        } else if (physicalInterface.address) {
          primaryIP = physicalInterface.address
        }
        primaryConnectionType = physicalInterface.type || 'Ethernet'
      }
    }
    
    networkInfo.ipAddress = primaryIP
    networkInfo.macAddress = active.mac_address || active.macAddress
    networkInfo.gateway = active.gateway
    networkInfo.connectionType = primaryConnectionType
    networkInfo.interfaceName = primaryInterface
    networkInfo.ssid = active.active_wifi_ssid || active.activeWifiSsid
    networkInfo.signalStrength = active.wifi_signal_strength || active.wifiSignalStrength
    networkInfo.vpnName = active.vpn_name || active.vpnName
    networkInfo.vpnActive = active.is_vpn_active || active.isVpnActive || isVpnTunnel
    
    // Mac: If activeConnection doesn't have MAC address, look it up from interfaces
    if (!networkInfo.macAddress && network.interfaces) {
      // First try to find MAC from the active interface
      let activeIface = network.interfaces.find((iface: any) => 
        iface.name === networkInfo.interfaceName || 
        iface.interface === networkInfo.interfaceName
      )
      
      // If active interface is a VPN tunnel (utun*), get MAC from the primary physical interface (en0)
      if (!activeIface?.macAddress && !activeIface?.mac_address && !activeIface?.mac) {
        // VPN tunnels don't have MAC addresses - look for en0 (primary ethernet/wifi on Mac)
        activeIface = network.interfaces.find((iface: any) => 
          iface.name === 'en0' || iface.interface === 'en0'
        )
      }
      
      if (activeIface?.macAddress || activeIface?.mac_address || activeIface?.mac) {
        networkInfo.macAddress = activeIface.macAddress || activeIface.mac_address || activeIface.mac
      }
    }
  }
  
  // Mac: Check for connected VPN and update connection info
  const vpnConnections = network.vpn_connections || network.vpnConnections
  if (vpnConnections && Array.isArray(vpnConnections)) {
    // Filter out "Unknown VPN" entries
    const filteredVpnConnections = vpnConnections.filter((vpn: any) => 
      vpn.name && vpn.name !== 'Unknown VPN' && vpn.name.trim() !== ''
    )
    
    const connectedVpn = filteredVpnConnections.find((vpn: any) => 
      vpn.status === 'Connected' || vpn.status === 'connected'
    )
    if (connectedVpn) {
      networkInfo.vpnActive = true
      networkInfo.vpnName = connectedVpn.name
      // If we're on VPN, the connection type should reflect that
      if (activeConnection?.interface?.startsWith('utun')) {
        networkInfo.connectionType = `VPN (${connectedVpn.type || 'IPSec'})`
      }
    }
    networkInfo.vpnConnections = filteredVpnConnections
  }

  // Extract DNS information - support both Windows (dns) and Mac (dnsConfiguration) formats
  const dnsConfig = network.dns || network.dnsConfiguration || network.dns_configuration
  if (dnsConfig) {
    networkInfo.dns = dnsConfig
    
    // Extract DNS servers for active connection (prefer IPv4, limit to 2-3 for display)
    const dnsServers = dnsConfig.servers || dnsConfig.nameservers || []
    if (dnsServers && Array.isArray(dnsServers) && dnsServers.length > 0) {
      // Prioritize IPv4 servers for active connection display
      const ipv4Servers = dnsServers.filter((server: string) => 
        /^(\d{1,3}\.){3}\d{1,3}$/.test(server)
      )
      const ipv6Servers = dnsServers.filter((server: string) => 
        /^[0-9a-fA-F:]+$/.test(server) && server.includes(':')
      )
      
      // Take 1-2 IPv4 servers and 1 IPv6 server for widget display
      const displayServers = [
        ...ipv4Servers.slice(0, 2),
        ...ipv6Servers.slice(0, 1)
      ]
      networkInfo.activeDnsServers = displayServers.slice(0, 3)
    }
    
    // Mac: Use domainName from dnsConfiguration as the DNS address/hostname
    if (dnsConfig.domainName && !networkInfo.hostname) {
      networkInfo.hostname = dnsConfig.domainName
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
      // Mac uses isUp: 1/0 (integer or boolean), Windows uses status: "Up"
      // Mac also has isPrimary in activeConnection
      const isUp = iface.status === 'Up' || iface.status === 'Active' || iface.status === 'Connected' || 
                   iface.status === 'active' ||
                   iface.isUp === 1 || iface.isUp === true ||
                   // Check if this interface has an IP address (strong indicator of being active)
                   ipAddresses.some((ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && !ip.startsWith('127.'))
      
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

      // Normalize status - check multiple indicators
      // Interface is considered active if:
      // 1. isUp flag is true/1
      // 2. It has a valid non-localhost IPv4 address
      // 3. isActive flag is true
      const hasValidIP = ipAddresses.some((ip: string) => 
        /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && !ip.startsWith('127.') && !ip.startsWith('169.254.')
      )
      const isActive = iface.isActive === true || iface.is_active === true || isUp || hasValidIP
      const normalizedStatus = isActive ? 'Active' : 'Disconnected'

      // Support both snake_case (new osquery) and camelCase (legacy) field names
      return {
        name: iface.name || iface.interface || iface.friendly_name || iface.friendlyName || 'Unknown',
        friendlyName: iface.friendly_name || iface.friendlyName || iface.displayName,
        ipAddress: displayAddress,
        ipAddresses: ipAddresses,
        macAddress: iface.mac_address || iface.macAddress || iface.mac,
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

  // Extract WiFi networks - try multiple sources
  // Windows: wifiNetworks array
  // Mac: wifiInfo.knownNetworks or wifiInfo.availableNetworks
  if (network.wifiNetworks && Array.isArray(network.wifiNetworks) && network.wifiNetworks.length > 0) {
    networkInfo.wifiNetworks = network.wifiNetworks
  } else if (network.wifiInfo) {
    // Mac format - try knownNetworks first, then availableNetworks
    const wifiInfo = network.wifiInfo
    if (wifiInfo.knownNetworks && Array.isArray(wifiInfo.knownNetworks) && wifiInfo.knownNetworks.length > 0) {
      networkInfo.wifiNetworks = wifiInfo.knownNetworks.map((net: any) => ({
        ssid: net.ssid || net.name || net.networkName,
        security: net.security || net.securityType || 'Unknown',
        isConnected: net.isConnected || net.connected || false,
        isSaved: net.isSaved || true,
        channel: net.channel
      }))
    } else if (wifiInfo.availableNetworks && Array.isArray(wifiInfo.availableNetworks) && wifiInfo.availableNetworks.length > 0) {
      networkInfo.wifiNetworks = wifiInfo.availableNetworks.map((net: any) => ({
        ssid: net.ssid || net.name || net.networkName,
        security: net.security || net.securityType || 'Unknown',
        isConnected: net.isConnected || net.connected || false,
        channel: net.channel,
        signalStrength: net.rssi || net.signalStrength
      }))
    }
    
    // Also extract current WiFi network info if connected
    if (wifiInfo.currentNetwork) {
      const current = wifiInfo.currentNetwork
      if (!networkInfo.ssid) {
        networkInfo.ssid = current.ssid || current.networkName
      }
      if (!networkInfo.signalStrength && current.rssi) {
        networkInfo.signalStrength = `${current.rssi} dBm`
      }
    }
    
    // Extract WiFi protocol, band, and link speed from Mac wifiInfo (for connection type display)
    if (wifiInfo.wifiProtocol || wifiInfo.phyMode) {
      // Store WiFi protocol info for display (e.g., "WiFi 6" or "802.11ax")
      const protocol = wifiInfo.wifiProtocol || 
        (wifiInfo.phyMode?.includes('ax') ? 'WiFi 6' : 
         wifiInfo.phyMode?.includes('ac') ? 'WiFi 5' :
         wifiInfo.phyMode?.includes('n') ? 'WiFi 4' : undefined)
      
      // If connection type is WiFi, enhance it with the protocol
      if (networkInfo.connectionType === 'WiFi' && protocol) {
        networkInfo.connectionType = protocol
      }
    }
  }

  // Extract VPN connections (may already be set from activeConnection check above)
  if (!networkInfo.vpnConnections && network.vpnConnections && Array.isArray(network.vpnConnections)) {
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
