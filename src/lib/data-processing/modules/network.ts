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
  wirelessState?: string
  wirelessSecurity?: string
  securityType?: string
  networkName?: string
  localHostname?: string
  // Enhanced DNS and NETBIOS for active connection
  activeDnsServers?: string[]
  activeNetbiosName?: string
  activeNetbiosType?: string
  // Computer's DNS address/FQDN
  dnsAddress?: string
  // WiFi-specific info (separate from active connection)
  wifiInterface?: {
    ssid?: string
    protocol?: string // WiFi 6, WiFi 5, etc.
    channel?: number | string
    band?: string // 2.4GHz, 5GHz, 6GHz
    signalStrength?: number | string
  }
  // Network quality test results (macOS)
  networkQuality?: {
    uplinkCapacity?: string
    downlinkCapacity?: string
    uplinkResponsiveness?: string
    downlinkResponsiveness?: string
    idleLatency?: string
    raw?: string
  }
  // Current active WiFi SSID (for marking in saved list)
  activeWifiSsid?: string
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
  // Enhanced fields from WiFi info
  ssid?: string
  channel?: string | number
  dnsServers?: string[]
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
      // DO NOT override connectionType - keep the physical interface type (Ethernet/WiFi)
      // VPN status is shown separately via vpnActive and vpnName
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
    // First, deduplicate interfaces by name and merge their addresses
    // Mac sends multiple entries per interface (one per address)
    const interfaceMap = new Map<string, any>()
    
    for (const iface of network.interfaces) {
      const name = iface.name || iface.interface || 'Unknown'
      
      if (!interfaceMap.has(name)) {
        // First time seeing this interface - create entry
        interfaceMap.set(name, {
          ...iface,
          addresses: [],
          isUp: iface.isUp === 1 || iface.isUp === true,
          hasIPv4: false
        })
      }
      
      const existing = interfaceMap.get(name)!
      
      // Merge addresses
      if (iface.addresses && Array.isArray(iface.addresses)) {
        existing.addresses.push(...iface.addresses)
      }
      
      // If ANY entry for this interface has isUp=1, mark it as up
      if (iface.isUp === 1 || iface.isUp === true) {
        existing.isUp = true
      }
      
      // Check if this entry has an IPv4 address
      if (iface.addresses?.some((addr: any) => 
        addr.family === 'IPv4' && addr.address && !addr.address.startsWith('127.')
      )) {
        existing.hasIPv4 = true
      }
    }
    
    // Now process the deduplicated interfaces
    const allInterfaces = Array.from(interfaceMap.values()).map((iface: any) => {
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
      // 1. isUp flag is true/1 (from ANY entry for this interface)
      // 2. It has a valid non-localhost IPv4 address
      // 3. isActive flag is true
      // 4. hasIPv4 flag set during deduplication
      const hasValidIP = ipAddresses.some((ip: string) => 
        /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && !ip.startsWith('127.') && !ip.startsWith('169.254.')
      )
      const isActive = iface.isActive === true || iface.is_active === true || iface.isUp === true || iface.hasIPv4 || hasValidIP
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
        wirelessBand: iface.wireless_band || iface.wirelessBand,
        ssid: iface.ssid,
        channel: iface.channel
      }
    })

    // Filter out virtual/internal network adapters
    const physicalInterfaces = allInterfaces.filter((iface: NetworkInterface) => {
      // On Mac: Only show en* interfaces (en0, en1, en2, etc.) - excludes bridge100, utun*, etc.
      if (iface.name.match(/^en\d+$/)) {
        return true; // Keep all en* interfaces on Mac
      }
      
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
    
    // Enhance WiFi interfaces with data from currentWiFiNetwork
    // Mac uses currentWiFiNetwork for band, channel, protocol info
    if (network.currentWiFiNetwork) {
      const currentWifiData = network.currentWiFiNetwork
      
      // Parse output if it's a string (bash collection)
      let wifiDetails: any = null
      if (currentWifiData.output) {
        try {
          wifiDetails = JSON.parse(currentWifiData.output)
        } catch { /* ignore */ }
      } else if (typeof currentWifiData === 'object') {
        wifiDetails = currentWifiData
      }
      
      if (wifiDetails) {
        // Find the WiFi interface (en0 on Mac, or type=Wireless)
        const wifiInterface = physicalInterfaces.find((iface: NetworkInterface) => 
          iface.name === 'en0' || 
          iface.type === 'Wireless' || 
          iface.type === 'WiFi' ||
          iface.type?.toLowerCase().includes('wifi') ||
          iface.type?.toLowerCase().includes('wireless')
        )
        
        if (wifiInterface) {
          // Add band from channel_band
          if (wifiDetails.channel_band && !wifiInterface.wirelessBand) {
            wifiInterface.wirelessBand = wifiDetails.channel_band
          }
          // Add channel
          if (wifiDetails.channel && !wifiInterface.channel) {
            wifiInterface.channel = wifiDetails.channel
          }
          // Add protocol from mode field
          if (wifiDetails.mode && !wifiInterface.wirelessProtocol) {
            const mode = wifiDetails.mode
            if (mode.includes('ax') || mode === '802.11ax') wifiInterface.wirelessProtocol = 'WiFi 6'
            else if (mode.includes('ac') || mode === '802.11ac') wifiInterface.wirelessProtocol = 'WiFi 5'
            else if (mode.includes('n') || mode === '802.11n') wifiInterface.wirelessProtocol = 'WiFi 4'
            else wifiInterface.wirelessProtocol = mode
          }
          // Add wifi_version if available
          if (wifiDetails.wifi_version && !wifiInterface.wirelessProtocol) {
            wifiInterface.wirelessProtocol = wifiDetails.wifi_version
          }
          // Add SSID to the interface
          // If location services are disabled, use first known network as current SSID
          if (wifiDetails.ssid && wifiDetails.ssid !== '[Location Services Required]') {
            wifiInterface.ssid = wifiDetails.ssid
          } else if (wifiDetails.ssid === '[Location Services Required]' && network.wifiInfo?.knownNetworks?.[0]?.ssid) {
            // Use first known network as it's likely the currently connected one
            wifiInterface.ssid = network.wifiInfo.knownNetworks[0].ssid
          }
        }
      }
    }
    
    // Add DNS servers to active interfaces
    if (networkInfo.activeDnsServers && networkInfo.activeDnsServers.length > 0) {
      physicalInterfaces.forEach((iface: NetworkInterface) => {
        if (iface.isActive) {
          iface.dnsServers = networkInfo.activeDnsServers
        }
      })
    }

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
      // Get active SSID from currentWiFiNetwork if available
      let activeSSID: string | undefined
      if (network.currentWiFiNetwork?.output) {
        try {
          const wifiData = JSON.parse(network.currentWiFiNetwork.output)
          if (wifiData.ssid && wifiData.ssid !== '[Location Services Required]') {
            activeSSID = wifiData.ssid
          }
        } catch { /* ignore */ }
      }
      // Also check wifiInfo.currentNetwork
      if (!activeSSID && wifiInfo.currentNetwork?.ssid) {
        activeSSID = wifiInfo.currentNetwork.ssid
      }
      
      networkInfo.activeWifiSsid = activeSSID
      
      networkInfo.wifiNetworks = wifiInfo.knownNetworks.map((net: any) => ({
        ssid: net.ssid || net.name || net.networkName,
        security: net.security || net.securityType || 'Unknown',
        isConnected: activeSSID ? (net.ssid === activeSSID) : (net.isConnected || net.connected || false),
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
    
    // Extract WiFi interface details even if Ethernet is primary
    // Check currentWiFiNetwork for Mac data with Location Services enabled
    if (network.currentWiFiNetwork?.output) {
      try {
        const wifiData = JSON.parse(network.currentWiFiNetwork.output)
        networkInfo.wifiInterface = {
          ssid: wifiData.ssid !== '[Location Services Required]' ? wifiData.ssid : undefined,
          protocol: wifiData.mode === '802.11ax' ? 'WiFi 6' : 
                   wifiData.mode === '802.11ac' ? 'WiFi 5' :
                   wifiData.mode === '802.11n' ? 'WiFi 4' : wifiData.mode,
          channel: wifiData.channel,
          band: wifiData.channel_band
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Fallback to wifiInfo.currentNetwork if available
    if (!networkInfo.wifiInterface && wifiInfo.currentNetwork) {
      const current = wifiInfo.currentNetwork
      networkInfo.wifiInterface = {
        ssid: current.ssid || current.networkName,
        channel: current.channel,
        signalStrength: current.rssi ? `${current.rssi} dBm` : undefined
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

  // Extract networkQuality data (macOS)
  // Support both old format (raw output string) and new format (structured data)
  if (network.networkQuality) {
    const nq = network.networkQuality
    
    if (nq.output) {
      // Old format: parse raw output string
      const output = nq.output
      networkInfo.networkQuality = {
        raw: output
      }
      
      // Parse and clean up the output string
      // Format: "==== SUMMARY ====\nUplink capacity: 871.206 Mbps\nDownlink capacity: 864.179 Mbps\n..."
      const uplinkCapacityMatch = output.match(/Uplink capacity:\s*([\d.]+)\s*Mbps/i)
      const downlinkCapacityMatch = output.match(/Downlink capacity:\s*([\d.]+)\s*Mbps/i)
      const uplinkResponsivenessMatch = output.match(/Uplink Responsiveness:\s*(\w+)/i)
      const downlinkResponsivenessMatch = output.match(/Downlink Responsiveness:\s*(\w+)/i)
      const idleLatencyMatch = output.match(/Idle Latency:\s*([\d.]+)\s*milliseconds/i)
      
      if (uplinkCapacityMatch) networkInfo.networkQuality.uplinkCapacity = `${Math.round(parseFloat(uplinkCapacityMatch[1]))} Mbps`
      if (downlinkCapacityMatch) networkInfo.networkQuality.downlinkCapacity = `${Math.round(parseFloat(downlinkCapacityMatch[1]))} Mbps`
      if (uplinkResponsivenessMatch) networkInfo.networkQuality.uplinkResponsiveness = uplinkResponsivenessMatch[1]
      if (downlinkResponsivenessMatch) networkInfo.networkQuality.downlinkResponsiveness = downlinkResponsivenessMatch[1]
      if (idleLatencyMatch) networkInfo.networkQuality.idleLatency = `${Math.round(parseFloat(idleLatencyMatch[1]))} ms`
    } else if (nq.dlThroughput || nq.dl_throughput || nq.ulThroughput || nq.ul_throughput || nq.rating) {
      // New format: structured data from Swift client
      // Support both camelCase (after normalizeKeys) and snake_case (raw)
      networkInfo.networkQuality = {}
      
      const dlThroughput = nq.dlThroughput || nq.dl_throughput
      const ulThroughput = nq.ulThroughput || nq.ul_throughput
      const dlRating = nq.dlRating || nq.dl_rating
      const ulRating = nq.ulRating || nq.ul_rating
      const idleLatency = nq.idleLatency || nq.idle_latency
      
      if (dlThroughput) {
        networkInfo.networkQuality.downlinkCapacity = `${Math.round(parseFloat(dlThroughput))} Mbps`
      }
      if (ulThroughput) {
        networkInfo.networkQuality.uplinkCapacity = `${Math.round(parseFloat(ulThroughput))} Mbps`
      }
      // dl_rating/ul_rating are High/Medium/Low
      if (dlRating) {
        networkInfo.networkQuality.downlinkResponsiveness = dlRating
      }
      if (ulRating) {
        networkInfo.networkQuality.uplinkResponsiveness = ulRating
      }
      // Use idle_latency if available
      if (idleLatency) {
        networkInfo.networkQuality.idleLatency = `${Math.round(parseFloat(idleLatency))} ms`
      }
    }
  }

  // If no activeConnection but we have interfaces with IPs, create one from the first active interface
  if (!networkInfo.ipAddress && networkInfo.interfaces && networkInfo.interfaces.length > 0) {
    // Find the first interface with a valid IPv4 address
    const activeIface = networkInfo.interfaces.find((iface: NetworkInterface) => 
      iface.isActive && iface.ipAddress && /^(\d{1,3}\.){3}\d{1,3}$/.test(iface.ipAddress)
    )
    if (activeIface) {
      networkInfo.ipAddress = activeIface.ipAddress
      networkInfo.macAddress = activeIface.macAddress
      networkInfo.interfaceName = activeIface.name
      // Determine connection type from interface name
      if (activeIface.name.match(/^en0$/i)) {
        networkInfo.connectionType = 'WiFi'  // en0 is typically WiFi on Mac
      } else if (activeIface.name.match(/^en\d+$/i)) {
        networkInfo.connectionType = 'Ethernet'  // Other en* are typically Ethernet
      }
    }
  }

  
  return networkInfo
}
