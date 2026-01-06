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

  // Extract active connection information - support both snake_case (new) and camelCase (legacy)
  const activeConnection = network.active_connection || network.activeConnection
  if (activeConnection) {
    const active = activeConnection
    networkInfo.ipAddress = active.ip_address || active.ipAddress
    networkInfo.macAddress = active.mac_address || active.macAddress
    networkInfo.gateway = active.gateway
    networkInfo.connectionType = active.connection_type || active.connectionType
    networkInfo.interfaceName = active.interface_name || active.interfaceName || active.interface || active.friendly_name || active.friendlyName
    networkInfo.ssid = active.active_wifi_ssid || active.activeWifiSsid
    networkInfo.signalStrength = active.wifi_signal_strength || active.wifiSignalStrength
    networkInfo.vpnName = active.vpn_name || active.vpnName
    networkInfo.vpnActive = active.is_vpn_active || active.isVpnActive
    
    // For Mac: If no MAC address in activeConnection, find it from interfaces by matching interface name
    if (!networkInfo.macAddr - support both Windows (network.dns) and Mac (network.dnsConfiguration)
  const dnsData = network.dns || network.dnsConfiguration
  if (dnsData) {
    networkInfo.dns = dnsData
    
    // Extract DNS servers for active connection (prefer IPv4, limit to 2-3 for display)
    // Windows: dns.servers, Mac: dnsConfiguration.nameservers
    const dnsServers = dnsData.servers || dnsData.nameservers || []
    if (Array.isArray(dnsServers) && dnsServers.length > 0) {
      const servers = dnsServers
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
      
      console.log('[NETWORK MODULE] DNS servers extracted:', {
        source: dnsData.servers ? 'dns.servers' : 'dnsConfiguration.nameservers',
        total: dnsServers.length,
        ipv4Count: ipv4Servers.length,
        ipv6Count: ipv6Servers.length,
        displayServers: networkInfo.activeDnsServers
      })
    } else {
      console.log('[NETWORK MODULE] No DNS servers found in data:', {
        hasDnsServers: !!dnsData.servers,
        hasNameservers: !!dnsData.nameservers,
        dnsData: dnsData
      })
    }
    
    // Extract domain for DNS address (Mac uses domainName, Windows uses domain)
    const domain = dnsData.domain || dnsData.domainName
    if (domain && domain.trim() !== '') {
      networkInfo.domain = domain
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
    console.log('[NETWORK MODULE] Processing NetBIOS data:', {
      localNamesCount: network.netbios.localNames.length,
      activeInterface: networkInfo.interfaceName,
      localNames: network.netbios.localNames.map((n: any) => ({ name: n.name, type: n.type, interface: n.interface }))
    })

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
        console.log('[NETWORK MODULE] Checking NetBIOS entry:', {
          name: entry.name,
          type: entry.type,
          interface: entry.interface,
          interfaceMatch,
          isFileServer,
          matches: interfaceMatch && isFileServer
        })
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
      console.log('[NETWORK MODULE] Selected NetBIOS entry:', {
        name: anyNetbiosEntry.name,
        type: anyNetbiosEntry.type,
        interface: anyNetbiosEntry.interface,
        source: activeNetbiosEntry ? 'interface-match' : fallbackEntry ? 'fallback-fileserver' : 'any-entry'
      })
    } else {
      console.log('[NETWORK MODULE] No suitable NetBIOS entry found')
    }
  } else {
    console.log('[NETWORK MODULE] No NetBIOS data available:', {
      hasNetbios: !!network.netbios,
      hasLocalNames: !!(network.netbios && network.netbios.localNames),
      isArray: network.netbios && network.netbios.localNames ? Array.isArray(network.netbios.localNames) : false
    })
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
    })Windows and Mac formats
  if (network.wifi_networks && Array.isArray(network.wifi_networks)) {
    networkInfo.wifiNetworks = network.wifi_networks
  } else if (network.wifiNetworks && Array.isArray(network.wifiNetworks)) {
    networkInfo.wifiNetworks = network.wifiNetworks
  } else if (network.wifiInfo) {
    // Mac format: wifiInfo.knownNetworks
    const knownNetworks = network.wifiInfo.knownNetworks || []
    if (Array.isArray(knownNetworks) && knownNetworks.length > 0) {
      networkInfo.wifiNetworks = knownNetworks.map((net: any) => ({
        ssid: net.ssid || net.network_name,
        security: net.security || net.securityType || 'Unknown',
        isConnected: net.isConnected || false,
        channel: net.channel
      }))
    }
  }
  
  // Extract current WiFi network for Mac (currentWiFiNetwork has SSID info)
  if (network.currentWiFiNetwork && network.currentWiFiNetwork.output) {
    try {
      // Parse the JSON output from currentWiFiNetwork
      const wifiOutput = JSON.parse(network.currentWiFiNetwork.output)
      if (wifiOutput.ssid && !wifiOutput.ssid.includes('Location Services')) {
        networkInfo.ssid = wifiOutput.ssid || wifiOutput.network_name
      }
      // Update connection type if we have WiFi mode info
      if (wifiOutput.mode && !networkInfo.connectionType) {
        networkInfo.connectionType = `WiFi (${wifiOutput.mode})`
      }
      console.log('[NETWORK MODULE] Parsed Mac WiFi info:', {
        ssid: networkInfo.ssid,
        mode: wifiOutput.mode,
        channel: wifiOutput.channel
      })
    } catch (e) {
      console.log('[NETWORK MODULE] Failed to parse currentWiFiNetwork:', e)
    }
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      
      // Among active interfaces, prefer wireless
      if (a.isActive && b.isActive) {
        if (a.type === 'Wireless' && b.type !== 'Wireless') return -1;
        if (a.type !== 'Wireless' && b.type === 'Wireless') return 1;
    // Try to get domain from various sources
    const domain = networkInfo.domain || 
                   network.domain || 
                   network.dns?.domain || 
                   network.dns?.dhcpDomain ||
                   network.dnsConfiguration?.domainName ||
                   network.dnsConfiguration?.searchDomains?.[0]
    
    if (domain && domain.trim() !== '' && domain !== networkInfo.hostname) {
      networkInfo.dnsAddress = `${networkInfo.hostname}.${domain}`
    } else {
      networkInfo.dnsAddress = networkInfo.hostname
    }
    
    console.log('[NETWORK MODULE] DNS Address built:', {
      hostname: networkInfo.hostname,
      domain: domain,
      dnsAddress: networkInfo.dnsAddress
    })
    networkInfo.interfaces = physicalInterfaces
    
    // FALLBACK: If no activeConnection data, use first active interface
    if (!network.activeConnection && physicalInterfaces.length > 0) {
      const activeInterface = physicalInterfaces.find((iface: NetworkInterface) => iface.isActive)
      if (activeInterface) {
        console.log('[NETWORK MODULE] Using first active interface as fallback for active connection:', activeInterface.name)
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

  // Extract WiFi networks - support both snake_case (new API) and camelCase (legacy)
  if (network.wifi_networks && Array.isArray(network.wifi_networks)) {
    networkInfo.wifiNetworks = network.wifi_networks
  } else if (network.wifiNetworks && Array.isArray(network.wifiNetworks)) {
    networkInfo.wifiNetworks = network.wifiNetworks
  }

  // Extract VPN connections - support both snake_case (new API) and camelCase (legacy)
  if (network.vpn_connections && Array.isArray(network.vpn_connections)) {
    networkInfo.vpnConnections = network.vpn_connections
  } else if (network.vpnConnections && Array.isArray(network.vpnConnections)) {
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
