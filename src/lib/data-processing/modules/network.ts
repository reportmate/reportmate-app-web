/**
 * Network Info Module  
 * Handles all network data extraction in isolation
 * 
 * SNAKE_CASE: All interfaces match API response format directly
 */

export interface NetworkInfo {
  ip_address?: string
  mac_address?: string
  hostname?: string
  domain?: string
  gateway?: string
  dns?: any
  interfaces?: NetworkInterface[]
  wifi_networks?: any[]
  vpn_connections?: any[]
  routes?: any[]
  connection_type?: string
  ssid?: string
  signal_strength?: number | string
  interface_name?: string
  vpn_name?: string
  vpn_active?: boolean
  // Enhanced DNS and NETBIOS for active connection
  active_dns_servers?: string[]
  active_netbios_name?: string
  active_netbios_type?: string
  // Computer's DNS address/FQDN
  dns_address?: string
}

export interface NetworkInterface {
  name: string
  ip_address?: string
  ip_addresses?: string[]
  mac_address?: string
  type?: string
  status?: string
  speed?: string
  friendly_name?: string
  is_active?: boolean
  mtu?: number
  bytes_sent?: number
  bytes_received?: number
  link_speed?: string
  wireless_protocol?: string
  wireless_band?: string
}

/**
 * Extract network information from device modules
 * MODULAR: Self-contained network data processing
 * SNAKE_CASE: All fields match API response format directly
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

  // Extract active connection information (snake_case from API)
  if (network.active_connection) {
    const active = network.active_connection
    networkInfo.ip_address = active.ip_address
    networkInfo.mac_address = active.mac_address
    networkInfo.gateway = active.gateway
    networkInfo.connection_type = active.connection_type
    networkInfo.interface_name = active.interface_name || active.friendly_name
    networkInfo.ssid = active.active_wifi_ssid
    networkInfo.signal_strength = active.wifi_signal_strength
    networkInfo.vpn_name = active.vpn_name
    networkInfo.vpn_active = active.is_vpn_active
  }

  // Extract DNS information (snake_case from API)
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
      networkInfo.active_dns_servers = displayServers.slice(0, 3)
    }
  }

  // Extract NETBIOS information for active connection (snake_case from API)
  if (network.netbios && network.netbios.local_names && Array.isArray(network.netbios.local_names)) {
    console.log('[NETWORK MODULE] Processing NetBIOS data:', {
      localNamesCount: network.netbios.local_names.length,
      activeInterface: networkInfo.interface_name,
      localNames: network.netbios.local_names.map((n: any) => ({ name: n.name, type: n.type, interface: n.interface }))
    })

    const activeInterface = networkInfo.interface_name
    
    // Find NETBIOS name for the active interface, prefer "File Server Service" type
    const activeNetbiosEntry = network.netbios.local_names.find((entry: any) => {
      // Match by interface name or use first entry if no interface match
      if (activeInterface && entry.interface) {
        // Handle case where interface_name might be just a number but interface is full name
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
    const fallbackEntry = activeNetbiosEntry || network.netbios.local_names.find((entry: any) => 
      entry.type === 'File Server Service'
    )
    
    // Additional fallback: any NetBIOS entry (Workstation Service is also useful)
    const anyNetbiosEntry = fallbackEntry || network.netbios.local_names[0]
    
    if (anyNetbiosEntry) {
      networkInfo.active_netbios_name = anyNetbiosEntry.name
      networkInfo.active_netbios_type = anyNetbiosEntry.type
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
      hasLocalNames: !!(network.netbios && network.netbios.local_names),
      isArray: network.netbios && network.netbios.local_names ? Array.isArray(network.netbios.local_names) : false
    })
  }

  // Extract all network interfaces (snake_case from API)
  if (network.interfaces && Array.isArray(network.interfaces)) {
    const allInterfaces = network.interfaces.map((iface: any) => {
      // Find best IP address to display
      let displayAddress = ''
      
      // Handle both Windows (ip_addresses array) and Mac (addresses array with family/address objects)
      const ipAddresses: string[] = []
      if (iface.ip_addresses && Array.isArray(iface.ip_addresses)) {
        ipAddresses.push(...iface.ip_addresses)
      }
      // Mac format: addresses: [{ address: "192.168.1.100", family: "IPv4", netmask: "..." }]
      if (iface.addresses && Array.isArray(iface.addresses)) {
        iface.addresses.forEach((addr: any) => {
          if (addr.address) {
            ipAddresses.push(addr.address)
          }
        })
      }
      
      // Determine if interface is up/active (snake_case from API)
      // Mac uses is_up: 1/0, Windows uses status: "Up"
      const isUp = iface.status === 'Up' || iface.status === 'Active' || iface.status === 'Connected' || 
                   iface.is_up === 1 || iface.is_up === true
      
      if (ipAddresses.length > 0) {
        // For active interfaces, prioritize IPv4
        if (isUp || iface.is_active) {
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
      const isActive = iface.is_active === true || isUp
      const normalizedStatus = isUp ? (iface.is_active ? 'Active' : 'Connected') : 'Disconnected'

      return {
        name: iface.name || iface.friendly_name || 'Unknown',
        friendly_name: iface.friendly_name,
        ip_address: displayAddress,
        ip_addresses: ipAddresses,
        mac_address: iface.mac_address,
        type: iface.type,
        status: normalizedStatus,
        is_active: isActive,
        mtu: iface.mtu,
        bytes_sent: iface.bytes_sent,
        bytes_received: iface.bytes_received,
        link_speed: iface.link_speed,
        wireless_protocol: iface.wireless_protocol,
        wireless_band: iface.wireless_band
      }
    })

    // Filter out virtual/internal network adapters
    const physicalInterfaces = allInterfaces.filter((iface: NetworkInterface) => {
      // Filter out virtual adapters by MAC address patterns
      const isVirtualMac = iface.mac_address && (
        iface.mac_address.startsWith('00:15:5d') || // Hyper-V
        iface.mac_address.startsWith('00:50:56') || // VMware
        iface.mac_address.startsWith('08:00:27') || // VirtualBox
        iface.mac_address.startsWith('0a:00:27')    // VirtualBox
      );
      
      // Filter out by IP address patterns (common virtual network ranges)
      const hasVirtualIP = iface.ip_addresses?.some((ip: string) => 
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
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      
      // Among active interfaces, prefer wireless
      if (a.is_active && b.is_active) {
        if (a.type === 'Wireless' && b.type !== 'Wireless') return -1;
        if (a.type !== 'Wireless' && b.type === 'Wireless') return 1;
      }
      
      // Sort by name as tiebreaker
      return a.name.localeCompare(b.name);
    })

    networkInfo.interfaces = physicalInterfaces
    
    // FALLBACK: If no active_connection data, use first active interface
    if (!network.active_connection && physicalInterfaces.length > 0) {
      const activeInterface = physicalInterfaces.find((iface: NetworkInterface) => iface.is_active)
      if (activeInterface) {
        console.log('[NETWORK MODULE] Using first active interface as fallback for active connection:', activeInterface.name)
        networkInfo.ip_address = networkInfo.ip_address || activeInterface.ip_address
        networkInfo.mac_address = networkInfo.mac_address || activeInterface.mac_address
        networkInfo.interface_name = networkInfo.interface_name || activeInterface.friendly_name || activeInterface.name
        networkInfo.connection_type = networkInfo.connection_type || activeInterface.type
        // Extract wireless protocol for display (e.g., "WiFi 6")
        if (activeInterface.wireless_protocol) {
          networkInfo.connection_type = activeInterface.wireless_protocol
        }
      }
    }
  }

  // Extract WiFi networks (snake_case from API)
  if (network.wifi_networks && Array.isArray(network.wifi_networks)) {
    networkInfo.wifi_networks = network.wifi_networks
  }

  // Extract VPN connections (snake_case from API)
  if (network.vpn_connections && Array.isArray(network.vpn_connections)) {
    networkInfo.vpn_connections = network.vpn_connections
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
  } else if (deviceModules.computer_name) {
    networkInfo.hostname = deviceModules.computer_name
  } else if (deviceModules.device_name) {
    networkInfo.hostname = deviceModules.device_name
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

  // Build computer's DNS address/FQDN (snake_case from API)
  if (networkInfo.hostname) {
    const domain = network.domain || network.dns?.domain || network.dns?.dhcp_domain
    if (domain && domain.trim() !== '') {
      networkInfo.dns_address = `${networkInfo.hostname}.${domain}`
    } else {
      networkInfo.dns_address = networkInfo.hostname
    }
  }
  
  // FALLBACK: If no dns_address and we have DNS servers, use the first DNS server
  if (!networkInfo.dns_address && networkInfo.active_dns_servers && networkInfo.active_dns_servers.length > 0) {
    networkInfo.dns_address = networkInfo.active_dns_servers[0]
  }

  console.log('[NETWORK MODULE] Network info extracted:', {
    hasActiveConnection: !!network.active_connection,
    interfacesCount: networkInfo.interfaces?.length || 0,
    wifiNetworksCount: networkInfo.wifi_networks?.length || 0,
    vpnConnectionsCount: networkInfo.vpn_connections?.length || 0,
    routesCount: networkInfo.routes?.length || 0,
    connectionType: networkInfo.connection_type,
    ssid: networkInfo.ssid
  })

  return networkInfo
}
