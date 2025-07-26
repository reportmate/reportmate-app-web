/**
 * Device data mapper - Maps raw API device data to the format expected by components
 */

export interface ProcessedDeviceInfo {
  id: string
  deviceId?: string
  name: string
  model?: string
  os?: string
  platform?: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
  uptime?: string
  location?: string
  serialNumber?: string
  assetTag?: string
  createdAt?: string
  ipAddress?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  // Hardware properties (direct properties, not nested)
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  architecture?: string
  diskUtilization?: number
  memoryUtilization?: number
  cpuUtilization?: number
  temperature?: number
  batteryLevel?: number
  batteryHealth?: string
  batteryCycleCount?: number
  isCharging?: boolean
  bootTime?: string
  // Operating System fields for SystemWidget
  osName?: string
  osVersion?: string
  osDisplayVersion?: string
  osEdition?: string
  osFeatureUpdate?: string
  osInstallDate?: string
  osLocale?: string
  osTimeZone?: string
  keyboardLayouts?: string[]
  network?: {
    hostname: string
    connectionType: string
    ssid?: string | null
    signalStrength?: string | null
    service?: string
    status?: number
    ethernet?: string
    clientid?: string
    ipv4conf?: string
    ipv4ip?: string
    ipv4mask?: string
    ipv4router?: string
    ipv6conf?: string
    ipv6ip?: string
    ipv6prefixlen?: number
    ipv6router?: string
    ipv4dns?: string
    vlans?: string
    activemtu?: number
    validmturange?: string
    currentmedia?: string
    activemedia?: string
    searchdomain?: string
    externalip?: string
    location?: string
    airdrop_channel?: string
    airdrop_supported?: boolean
    wow_supported?: boolean
    supported_channels?: string
    supported_phymodes?: string
    wireless_card_type?: string
    country_code?: string
    firmware_version?: string
    wireless_locale?: string
    activeConnection?: {
      connectionType?: string
      interfaceName?: string
      friendlyName?: string
      ipAddress?: string
      gateway?: string
      activeWifiSsid?: string
      wifiSignalStrength?: number
      isVpnActive?: boolean
      vpnName?: string
    }
  }
  software?: {
    buildVersion: string
    bootROMVersion: string
    smartStatus: string
    encryptionStatus: string
  }
  security?: {
    gatekeeper?: string
    sip?: string
    ssh_groups?: string
    ssh_users?: string
    ard_groups?: string
    root_user?: string
    ard_users?: string
    firmwarepw?: string
    firewall_state?: string
    skel_state?: string
    t2_secureboot?: string
    t2_externalboot?: string
    activation_lock?: string
    filevault_status?: boolean
    filevault_users?: string
    as_security_mode?: string
  }
  // Platform-specific security features (from API)
  securityFeatures?: {
    // Mac-specific
    filevault?: { enabled: boolean; status: string }
    firewall?: { enabled: boolean; status: string }
    gatekeeper?: { enabled: boolean; status: string }
    sip?: { enabled: boolean; status: string }
    xprotect?: { enabled: boolean; status: string }
    automaticUpdates?: { enabled: boolean; status: string }
    // Windows-specific
    bitlocker?: { enabled: boolean; status: string }
    windowsDefender?: { enabled: boolean; status: string }
    uac?: { enabled: boolean; status: string }
    windowsUpdates?: { enabled: boolean; status: string }
    smartScreen?: { enabled: boolean; status: string }
    tpm?: { enabled: boolean; status: string; version?: string }
    // Cross-platform
    edr?: { installed: boolean; name: string | null; status: string; version: string | null }
  }
  // Inventory information from the inventory module
  inventory?: {
    deviceName?: string
    usage?: string
    catalog?: string
    department?: string
    location?: string
    assetTag?: string
    serialNumber?: string
    uuid?: string
  }
  applications?: {
    totalApps: number
    installedApps: any[]
  }
  management?: {
    // Legacy macOS MDM fields (for backward compatibility)
    enrolled?: boolean
    enrolled_via_dep?: boolean
    server_url?: string | null
    user_approved?: boolean
    organization?: string | null
    department?: string | null
    vendor?: string | null
    
    // Windows Management Data (from your API structure)
    deviceState?: {
      status?: string
      deviceName?: string
      entraJoined?: boolean
      domainJoined?: boolean
      virtualDesktop?: boolean
      enterpriseJoined?: boolean
    }
    deviceDetails?: {
      deviceId?: string
      thumbprint?: string
      keyProvider?: string
      tmpProtected?: boolean
      keyContainerId?: string
      deviceAuthStatus?: string
      deviceCertificateValidity?: string
    }
    mdmEnrollment?: {
      provider?: string
      isEnrolled?: boolean
      managementUrl?: string
      enrollmentType?: string
      serverUrl?: string
    }
    tenantDetails?: {
      tenantName?: string
      tenantId?: string
      mdmUrl?: string
    }
    userState?: {
      ngcSet?: boolean
      canReset?: boolean
      ngcKeyId?: string
      wamDefaultId?: string
      wamDefaultSet?: boolean
      wamDefaultGUID?: string
      workplaceJoined?: boolean
      wamDefaultAuthority?: string
    }
    ssoState?: {
      cloudTgt?: boolean
      entraPrt?: boolean
      onPremTgt?: boolean
      enterprisePrt?: boolean
      entraPrtAuthority?: string
      kerbTopLevelNames?: string
      entraPrtExpiryTime?: string
      entraPrtUpdateTime?: string
      enterprisePrtAuthority?: string
    }
    diagnosticData?: {
      accessType?: string
      clientTime?: string
      keySignTest?: string
      clientErrorCode?: string
      hostNameUpdated?: boolean
      proxyBypassList?: string
      proxyServerList?: string
      osVersionUpdated?: string
      autoDetectSettings?: boolean
      displayNameUpdated?: string
      lastHostNameUpdate?: string
      autoConfigurationUrl?: string
      entraRecoveryEnabled?: boolean
      executingAccountName?: string
    }
    profiles?: Array<{
      id: string
      name: string
      description: string
      type: string
      status: string
      lastModified: string
    }>
    compliancePolicies?: Array<{
      name?: string
      status?: string
      lastEvaluated?: string
    }>
    metadata?: {
      Certificates?: Array<{
        Issuer: string
        Subject: string
        NotValidAfter: string
        NotValidBefore: string
        SigningAlgorithm: string
      }>
    }
    
    // Legacy fields for backward compatibility
    restrictions?: {
      app_installation?: string
      camera_disabled?: boolean
      screen_recording_disabled?: boolean
      system_preferences_disabled?: boolean
      touch_id_disabled?: boolean
      siri_disabled?: boolean
    }
    apps?: Array<{
      id: string
      name: string
      bundleId: string
      status: string
      source: string
      lastUpdate: string
    }>
  }
  managedInstalls?: {
    totalPackages: number
    installed: number
    pending: number
    failed: number
    lastUpdate: string
    config?: {
      type: 'munki' | 'cimian'
      version: string
      softwareRepoURL: string
      appleCatalogURL?: string | null
      manifest: string
      localOnlyManifest?: string | null
      runType: string
      lastRun: string
      duration: string
    }
    messages?: {
      errors: Array<{
        id: string
        timestamp: string
        package: string
        message: string
        details: string
      }>
      warnings: Array<{
        id: string
        timestamp: string
        package: string
        message: string
        details: string
      }>
    }
    packages: any[]
  }
  // Additional module-specific data structures
  manufacturer?: string
  ipAddressV4?: string
  ipAddressV6?: string
  hardware?: {
    processor?: string
    processorSpeed?: string
    cores?: number
    memory?: string
    storage?: string
    graphics?: string
    architecture?: string
    manufacturer?: string
    model?: string
  }
  displays?: {
    totalDisplays: number
    displays: Array<{
      name?: string
      resolution?: string
      refreshRate?: number
      colorDepth?: number
      manufacturer?: string
      model?: string
      serialNumber?: string
      connectionType?: string
      isPrimary?: boolean
      isBuiltIn?: boolean
      brightness?: number
    }>
    primaryDisplay?: any
    externalDisplays?: any[]
  }
  printers?: {
    totalPrinters: number
    printers: Array<{
      name: string
      driverName?: string
      portName?: string
      shareName?: string
      location?: string
      comment?: string
      status?: string
      isDefault?: boolean
      isLocal?: boolean
      isShared?: boolean
      isOnline?: boolean
      paperSize?: string
      resolution?: string
    }>
    defaultPrinter?: any
  }
  profiles?: {
    totalProfiles: number
    profiles: Array<{
      id: string
      name: string
      description?: string
      type?: string
      organization?: string
      version?: string
      status?: string
      installDate?: string
      lastModified?: string
      isRemovable?: boolean
      hasPasscode?: boolean
      payloads?: any[]
    }>
  }
  installs?: {
    totalInstalls: number
    recentInstalls: Array<{
      id: string
      name: string
      version?: string
      type: string
      status: string
      timestamp: string
      duration?: number
    }>
    successfulInstalls: number
    failedInstalls: number
    pendingInstalls: number
  }
  // Modular data from modules
  modules?: {
    system?: {
      operatingSystem?: any
    }
    network?: {
      interfaces?: any[]
      wifiNetworks?: any[]
      vpnConnections?: any[]
      dns?: any
      routes?: any[]
      primaryInterface?: string
    }
    security?: {
      antivirus?: any
      firewall?: any
      encryption?: any
      tpm?: any
      securityUpdates?: any[]
      securityEvents?: any[]
      lastSecurityScan?: string
    }
    management?: any
    hardware?: any
    displays?: any
    applications?: any
    printers?: any
    profiles?: any
    installs?: any
  }
}

/**
 * Maps raw device data from the API to the format expected by the UI components
 */
export function mapDeviceData(rawDevice: any): ProcessedDeviceInfo {
  // Extra debugging to catch function availability issues
  if (typeof mapDeviceData !== 'function') {
    console.error('mapDeviceData is not a function!', typeof mapDeviceData);
    throw new Error('mapDeviceData function is not properly exported');
  }
  
  console.log('mapDeviceData called successfully - input:', {
    hasRawDevice: !!rawDevice,
    rawDeviceKeys: rawDevice ? Object.keys(rawDevice) : [],
    rawDeviceType: typeof rawDevice
  })

  if (!rawDevice) {
    throw new Error('No device data provided to mapper')
  }

  // Helper function to safely get nested values
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // Determine device status based on last_seen timestamp
  const getDeviceStatus = (lastSeen: string): 'online' | 'offline' | 'warning' | 'error' => {
    if (!lastSeen) return 'offline'
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
    
    if (diffMinutes < 5) return 'online'
    if (diffMinutes < 60) return 'warning'
    return 'offline'
  }

  // Extract basic device information with robust lastSeen handling
  const lastSeenValue = rawDevice.last_seen || rawDevice.lastSeen
  let validLastSeen: string
  
  // Handle various invalid lastSeen values
  if (!lastSeenValue || 
      lastSeenValue === 'null' || 
      lastSeenValue === 'undefined' || 
      lastSeenValue === '' ||
      (typeof lastSeenValue === 'string' && lastSeenValue.trim() === '') ||
      (lastSeenValue instanceof Date && isNaN(lastSeenValue.getTime())) ||
      (typeof lastSeenValue === 'string' && isNaN(new Date(lastSeenValue).getTime()))) {
    
    console.warn('Invalid lastSeen value detected:', lastSeenValue, 'using current time as fallback')
    validLastSeen = new Date().toISOString()
  } else {
    validLastSeen = typeof lastSeenValue === 'string' ? lastSeenValue : new Date(lastSeenValue).toISOString()
  }

  const mappedDevice: ProcessedDeviceInfo = {
    id: rawDevice.id || rawDevice.device_id || rawDevice.serialNumber,
    deviceId: rawDevice.device_id || rawDevice.deviceId,
    name: rawDevice.name || rawDevice.hostname || rawDevice.computer_name || rawDevice.deviceName || rawDevice.device_name || 'Unknown Device',
    model: rawDevice.model,
    os: rawDevice.os,
    platform: rawDevice.platform,
    lastSeen: validLastSeen,
    status: getDeviceStatus(validLastSeen),
    uptime: rawDevice.uptime,
    location: rawDevice.location,
    serialNumber: rawDevice.serial_number || rawDevice.serialNumber,
    assetTag: rawDevice.asset_tag || rawDevice.assetTag,
    createdAt: rawDevice.created_at || rawDevice.createdAt,
    ipAddress: rawDevice.ip_address || rawDevice.ipAddress,
    macAddress: rawDevice.mac_address || rawDevice.macAddress,
    totalEvents: rawDevice.total_events || rawDevice.totalEvents || 0,
    lastEventTime: rawDevice.last_event_time || rawDevice.lastEventTime || validLastSeen,
    
    // Hardware information
    processor: rawDevice.processor,
    processorSpeed: rawDevice.processor_speed,
    cores: rawDevice.cores,
    memory: rawDevice.memory,
    availableRAM: rawDevice.available_ram,
    memorySlots: rawDevice.memory_slots,
    storage: rawDevice.storage,
    availableStorage: rawDevice.available_storage,
    storageType: rawDevice.storage_type,
    graphics: rawDevice.graphics,
    vram: rawDevice.vram,
    resolution: rawDevice.resolution,
    architecture: rawDevice.architecture || rawDevice.os_architecture,
    diskUtilization: rawDevice.disk_utilization,
    memoryUtilization: rawDevice.memory_utilization,
    cpuUtilization: rawDevice.cpu_utilization,
    temperature: rawDevice.temperature,
    batteryLevel: rawDevice.battery_level,
    bootTime: rawDevice.boot_time || rawDevice.bootTime
  }

  // Process modules data if available
  if (rawDevice.modules) {
    console.log('Processing device modules:', Object.keys(rawDevice.modules))
    
    // Extract additional device information from modules
    const modules = rawDevice.modules
    const systemData = modules.osQuery?.system?.[0] || rawDevice.system
    const deviceInfo = modules.device || rawDevice.device
    
    // Debug: Log the actual system data structure
    console.log('DeviceMapper DEBUG - systemData:', JSON.stringify(systemData, null, 2))
    
    let operatingSystem = systemData?.operatingSystem || rawDevice.operatingSystem
    
    // Fallback: try to extract from modules.system directly if not found
    if (!operatingSystem && rawDevice.modules?.system) {
      console.log('DeviceMapper DEBUG - Looking for operatingSystem in modules.system')
      operatingSystem = rawDevice.modules.system.operatingSystem
    }
    
    console.log('DeviceMapper DEBUG - operatingSystem found:', JSON.stringify(operatingSystem, null, 2))
    
    // Override with more detailed information if available
    if (deviceInfo) {
      mappedDevice.name = deviceInfo.ComputerName || mappedDevice.name
      mappedDevice.model = deviceInfo.Model || mappedDevice.model
      mappedDevice.processor = operatingSystem?.architecture || mappedDevice.processor
    }
    
    if (operatingSystem) {
      mappedDevice.os = operatingSystem.name ? 
        `${operatingSystem.name} ${operatingSystem.version} (Build ${operatingSystem.build})` : 
        mappedDevice.os
      mappedDevice.architecture = operatingSystem.architecture || mappedDevice.architecture
      
      // Map individual OS fields for SystemWidget
      mappedDevice.osName = operatingSystem.name
      mappedDevice.osVersion = operatingSystem.version
      mappedDevice.osDisplayVersion = operatingSystem.displayVersion
      mappedDevice.osEdition = operatingSystem.edition
      mappedDevice.osFeatureUpdate = operatingSystem.featureUpdate
      mappedDevice.osInstallDate = operatingSystem.installDate
      mappedDevice.osLocale = operatingSystem.locale
      mappedDevice.osTimeZone = operatingSystem.timeZone
      mappedDevice.keyboardLayouts = operatingSystem.keyboardLayouts
    }
    
    if (systemData) {
      mappedDevice.uptime = systemData.uptimeString || systemData.uptime || mappedDevice.uptime
      mappedDevice.bootTime = systemData.lastBootTime || mappedDevice.bootTime
    }
    
    // Process hardware data from the hardware module
    const hwModuleData = modules.hardware || rawDevice.hardware
    if (hwModuleData) {
      console.log('Processing hardware data:', hwModuleData)
      // Map top-level hardware fields for HardwareWidget
      mappedDevice.model = hwModuleData.model || mappedDevice.model
      mappedDevice.manufacturer = hwModuleData.manufacturer || mappedDevice.manufacturer
      mappedDevice.processor = hwModuleData.processor?.name || mappedDevice.processor
      mappedDevice.architecture = hwModuleData.processor?.architecture || mappedDevice.architecture
      mappedDevice.graphics = hwModuleData.graphics?.name || mappedDevice.graphics
      
      // Format memory from bytes to readable format
      if (hwModuleData.memory?.totalPhysical) {
        const memoryGB = Math.round(hwModuleData.memory.totalPhysical / (1024*1024*1024))
        mappedDevice.memory = `${memoryGB} GB`
      }
      
      // Map battery fields
      mappedDevice.cores = hwModuleData.processor?.logicalProcessors || mappedDevice.cores
      mappedDevice.batteryLevel = hwModuleData.battery?.chargePercent || mappedDevice.batteryLevel
      mappedDevice.batteryHealth = hwModuleData.battery?.health || mappedDevice.batteryHealth
      mappedDevice.batteryCycleCount = hwModuleData.battery?.cycleCount || mappedDevice.batteryCycleCount
      
      // Format storage from the storage array  
      if (hwModuleData.storage && Array.isArray(hwModuleData.storage)) {
        console.log('DeviceMapper DEBUG - Processing storage array:', hwModuleData.storage)
        const mainDrive = hwModuleData.storage.find((s: any) => s.type === 'SSD' && s.capacity > 0) ||
                         hwModuleData.storage.find((s: any) => s.capacity > 0) ||
                         hwModuleData.storage[0]
        
        console.log('DeviceMapper DEBUG - Selected main drive:', mainDrive)
        
        if (mainDrive && mainDrive.capacity) {
          const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
          const freeGB = Math.round((mainDrive.freeSpace || 0) / (1024*1024*1024))
          const storageString = `${totalGB} GB ${mainDrive.type || 'Drive'} • ${freeGB} GB free`
          console.log('DeviceMapper DEBUG - Generated storage string:', storageString)
          mappedDevice.storage = storageString
        }
      }
    }
    
    // Process inventory data from the inventory module
    const inventoryData = modules.inventory || rawDevice.inventory
    if (inventoryData) {
      console.log('Processing inventory data:', inventoryData)
      mappedDevice.inventory = {
        deviceName: inventoryData.deviceName || inventoryData.device_name,
        usage: inventoryData.usage,
        catalog: inventoryData.catalog,
        department: inventoryData.department,
        location: inventoryData.location,
        assetTag: inventoryData.assetTag || inventoryData.asset_tag,
        serialNumber: inventoryData.serialNumber || inventoryData.serial_number,
        uuid: inventoryData.uuid
      }
      
      // Override top-level device name with inventory deviceName if available
      const inventoryDeviceName = inventoryData.deviceName || inventoryData.device_name
      if (inventoryDeviceName && inventoryDeviceName !== 'Unknown') {
        mappedDevice.name = inventoryDeviceName
        console.log('DeviceMapper DEBUG - Device name overridden from inventory:', inventoryDeviceName)
      }
      
      // Override top-level assetTag with inventory data if available, or keep existing
      if (inventoryData.assetTag || inventoryData.asset_tag) {
        mappedDevice.assetTag = inventoryData.assetTag || inventoryData.asset_tag
      }
    }

    // Process applications data from the applications module
    const applicationsData = modules.applications || rawDevice.applications
    if (applicationsData && applicationsData.applications) {
      mappedDevice.applications = {
        totalApps: applicationsData.applications.length,
        installedApps: applicationsData.applications.map((app: any) => ({
          id: app.name + app.version,
          name: app.name,
          displayName: app.display_name || app.name,
          version: app.version,
          publisher: app.publisher || app.signed_by,
          category: app.category,
          installDate: app.install_date,
          signed_by: app.signed_by
        }))
      }
    }

    // Process hardware data from the hardware module
    const hardwareData = modules.hardware || rawDevice.hardware
    if (hardwareData) {
      console.log('DeviceMapper DEBUG - Processing hardware data:', JSON.stringify(hardwareData, null, 2))
      console.log('DeviceMapper DEBUG - Hardware module keys:', Object.keys(hardwareData))
      if (hardwareData.processor) console.log('DeviceMapper DEBUG - Processor data:', hardwareData.processor)
      if (hardwareData.memory) console.log('DeviceMapper DEBUG - Memory data:', hardwareData.memory)
      if (hardwareData.storage) console.log('DeviceMapper DEBUG - Storage data:', hardwareData.storage)
      if (hardwareData.battery) console.log('DeviceMapper DEBUG - Battery data:', hardwareData.battery)
      if (hardwareData.graphics) console.log('DeviceMapper DEBUG - Graphics data:', hardwareData.graphics)
      
      mappedDevice.hardware = {
        processor: hardwareData.processor?.name || hardwareData.cpu_brand,
        processorSpeed: hardwareData.processor?.speed || hardwareData.cpu_frequency,
        cores: hardwareData.processor?.cores || hardwareData.cpu_logical_cores,
        memory: hardwareData.memory?.total || hardwareData.physical_memory,
        storage: hardwareData.storage?.total,
        graphics: hardwareData.graphics?.name || hardwareData.gpu_name,
        architecture: hardwareData.processor?.architecture || operatingSystem?.architecture,
        manufacturer: hardwareData.system?.manufacturer || rawDevice.manufacturer,
        model: hardwareData.system?.model || rawDevice.model
      }
      
      // Update top-level fields for backward compatibility
      if (hardwareData.processor?.name) mappedDevice.processor = hardwareData.processor.name
      if (hardwareData.memory?.totalPhysical) mappedDevice.memory = `${Math.round(hardwareData.memory.totalPhysical / (1024*1024*1024))} GB`
      if (hardwareData.manufacturer) mappedDevice.manufacturer = hardwareData.manufacturer
      if (hardwareData.model) mappedDevice.model = hardwareData.model
      if (hardwareData.processor?.cores) mappedDevice.cores = hardwareData.processor.cores
      if (hardwareData.graphics?.name) mappedDevice.graphics = hardwareData.graphics.name
      if (hardwareData.processor?.architecture) mappedDevice.architecture = hardwareData.processor.architecture
      
      // Map battery information
      if (hardwareData.battery) {
        mappedDevice.batteryLevel = hardwareData.battery.chargePercent
        mappedDevice.batteryHealth = hardwareData.battery.health
        mappedDevice.batteryCycleCount = hardwareData.battery.cycleCount
        mappedDevice.isCharging = hardwareData.battery.isCharging
      }
      
      // Map storage information - use the main SSD drive
      if (hardwareData.storage && Array.isArray(hardwareData.storage)) {
        console.log('DeviceMapper DEBUG - Hardware storage array:', hardwareData.storage)
        const mainDrive = hardwareData.storage.find((s: any) => s.name?.includes('Drive C:') || s.type === 'SSD')
        console.log('DeviceMapper DEBUG - Found main drive:', mainDrive)
        if (mainDrive) {
          const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
          const freeGB = Math.round((mainDrive.freeSpace || 0) / (1024*1024*1024))
          console.log('DeviceMapper DEBUG - Storage calculations:', {
            rawCapacity: mainDrive.capacity,
            rawFreeSpace: mainDrive.freeSpace,
            totalGB: totalGB,
            freeGB: freeGB,
            type: mainDrive.type
          })
          if (freeGB > 0) {
            mappedDevice.storage = `${totalGB} GB ${mainDrive.type} • ${freeGB} GB free`
          } else {
            mappedDevice.storage = `${totalGB} GB ${mainDrive.type}`
          }
          mappedDevice.availableStorage = `${freeGB} GB available`
        }
      }
    }

    // Process network data from the network module
    const networkData = modules.network || rawDevice.network
    if (networkData) {
      // Handle both new modular format and legacy format
      const activeConnection = networkData.activeConnection || {}
      const primaryInterface = networkData.interfaces?.find((i: any) => i.isActive) || {}
      
      mappedDevice.network = {
        hostname: networkData.hostname,
        connectionType: activeConnection.connectionType || networkData.connectionType || networkData.interface_type || primaryInterface.type,
        ssid: activeConnection.activeWifiSsid || networkData.ssid,
        signalStrength: activeConnection.wifiSignalStrength || networkData.signalStrength,
        service: networkData.service,
        status: networkData.status,
        ethernet: networkData.ethernet,
        clientid: networkData.clientid,
        ipv4conf: networkData.ipv4conf,
        ipv4ip: activeConnection.ipAddress || networkData.ipv4ip || primaryInterface.ipAddresses?.[0],
        ipv4mask: networkData.ipv4mask,
        ipv4router: activeConnection.gateway || networkData.ipv4router,
        ipv6conf: networkData.ipv6conf,
        ipv6ip: networkData.ipv6ip,
        ipv6prefixlen: networkData.ipv6prefixlen,
        ipv6router: networkData.ipv6router,
        ipv4dns: networkData.ipv4dns || networkData.dns?.servers?.[0],
        vlans: networkData.vlans,
        activemtu: networkData.activemtu,
        validmturange: networkData.validmturange,
        currentmedia: networkData.currentmedia,
        activemedia: networkData.activemedia,
        searchdomain: networkData.searchdomain,
        externalip: networkData.externalip,
        location: networkData.location,
        // New fields from modular network data
        activeConnection: {
          connectionType: activeConnection.connectionType,
          interfaceName: activeConnection.interfaceName,
          friendlyName: activeConnection.friendlyName,
          ipAddress: activeConnection.ipAddress,
          gateway: activeConnection.gateway,
          activeWifiSsid: activeConnection.activeWifiSsid,
          wifiSignalStrength: activeConnection.wifiSignalStrength,
          isVpnActive: activeConnection.isVpnActive,
          vpnName: activeConnection.vpnName
        }
      }
      
      // Update top-level network fields - prefer active connection data
      const primaryIpv4 = activeConnection.ipAddress || networkData.ipv4ip || primaryInterface.ipAddresses?.find((ip: string) => !ip.includes(':'))
      const primaryMac = primaryInterface.macAddress || networkData.mac_address
      
      if (primaryIpv4) {
        mappedDevice.ipAddress = primaryIpv4
        mappedDevice.ipAddressV4 = primaryIpv4
      }
      if (networkData.ipv6ip) mappedDevice.ipAddressV6 = networkData.ipv6ip
      if (primaryMac) mappedDevice.macAddress = primaryMac
    }

    // Process displays data from the displays module
    const displaysData = modules.displays || rawDevice.displays
    if (displaysData && displaysData.displays) {
      mappedDevice.displays = {
        totalDisplays: displaysData.displays.length,
        displays: displaysData.displays.map((display: any) => ({
          name: display.name || display.display_name,
          resolution: display.resolution || `${display.resolution_width}x${display.resolution_height}`,
          refreshRate: display.refresh_rate,
          colorDepth: display.color_depth,
          manufacturer: display.manufacturer,
          model: display.model,
          serialNumber: display.serial_number,
          connectionType: display.connection_type,
          isPrimary: display.is_primary || display.main_display,
          isBuiltIn: display.is_built_in || display.built_in,
          brightness: display.brightness
        })),
        primaryDisplay: displaysData.displays.find((d: any) => d.is_primary || d.main_display),
        externalDisplays: displaysData.displays.filter((d: any) => !d.is_built_in && !d.built_in)
      }
      
      // Update top-level resolution field
      const primaryDisplay = displaysData.displays.find((d: any) => d.is_primary || d.main_display) || displaysData.displays[0]
      if (primaryDisplay) {
        mappedDevice.resolution = primaryDisplay.resolution || `${primaryDisplay.resolution_width}x${primaryDisplay.resolution_height}`
      }
    }

    // Process printers data from the printers module
    const printersData = modules.printers || rawDevice.printers
    if (printersData && printersData.printers) {
      mappedDevice.printers = {
        totalPrinters: printersData.printers.length,
        printers: printersData.printers.map((printer: any) => ({
          name: printer.name,
          driverName: printer.driver_name,
          portName: printer.port_name,
          shareName: printer.share_name,
          location: printer.location,
          comment: printer.comment,
          status: printer.status,
          isDefault: printer.is_default || printer.default,
          isLocal: printer.is_local || printer.local,
          isShared: printer.is_shared || printer.shared,
          isOnline: printer.is_online || printer.status === 'Ready',
          paperSize: printer.paper_size,
          resolution: printer.resolution
        })),
        defaultPrinter: printersData.printers.find((p: any) => p.is_default || p.default)
      }
    }

    // Process profiles data from the profiles module
    const profilesData = modules.profiles || rawDevice.profiles
    if (profilesData && profilesData.profiles) {
      mappedDevice.profiles = {
        totalProfiles: profilesData.profiles.length,
        profiles: profilesData.profiles.map((profile: any) => ({
          id: profile.id || profile.identifier,
          name: profile.name || profile.display_name,
          description: profile.description,
          type: profile.type || profile.profile_type,
          organization: profile.organization,
          version: profile.version,
          status: profile.status || 'Installed',
          installDate: profile.install_date || profile.installation_date,
          lastModified: profile.last_modified,
          isRemovable: profile.is_removable !== false,
          hasPasscode: profile.has_passcode || false,
          payloads: profile.payloads || []
        }))
      }
    }

    // Process installs data from the installs module
    const installsData = modules.installs || rawDevice.installs
    if (installsData) {
      // The installs module might have different structures depending on the platform
      if (installsData.recent_installs || installsData.installations) {
        const recentInstalls = installsData.recent_installs || installsData.installations || []
        mappedDevice.installs = {
          totalInstalls: recentInstalls.length,
          recentInstalls: recentInstalls.map((install: any) => ({
            id: install.id || `${install.name}-${install.timestamp}`,
            name: install.name || install.package_name,
            version: install.version,
            type: install.type || install.action || 'install',
            status: install.status || install.result || 'success',
            timestamp: install.timestamp || install.install_date,
            duration: install.duration
          })),
          successfulInstalls: recentInstalls.filter((i: any) => i.status === 'success' || i.result === 'success').length,
          failedInstalls: recentInstalls.filter((i: any) => i.status === 'failure' || i.result === 'failure').length,
          pendingInstalls: recentInstalls.filter((i: any) => i.status === 'pending' || i.result === 'pending').length
        }
      }
    }

    // Process management data from the management module
    const managementData = modules.management || rawDevice.management
    console.log('DeviceMapper DEBUG - Management data:', {
      hasModulesManagement: !!modules.management,
      hasRawDeviceManagement: !!rawDevice.management,
      managementDataKeys: managementData ? Object.keys(managementData) : 'none',
      managementData: managementData
    })
    
    if (managementData) {
      mappedDevice.management = {
        // Legacy macOS MDM fields (for backward compatibility)
        enrolled: managementData.enrolled || managementData.mdmEnrollment?.isEnrolled || false,
        enrolled_via_dep: managementData.enrolled_via_dep,
        server_url: managementData.server_url || managementData.mdmEnrollment?.managementUrl,
        user_approved: managementData.user_approved,
        organization: managementData.organization || managementData.tenantDetails?.tenantName,
        department: managementData.department,
        vendor: managementData.vendor,
        
        // Windows Management Data (direct mapping from API)
        deviceState: managementData.deviceState ? {
          status: managementData.deviceState.status,
          deviceName: managementData.deviceState.deviceName,
          entraJoined: managementData.deviceState.entraJoined,
          domainJoined: managementData.deviceState.domainJoined,
          virtualDesktop: managementData.deviceState.virtualDesktop,
          enterpriseJoined: managementData.deviceState.enterpriseJoined
        } : undefined,
        
        deviceDetails: managementData.deviceDetails ? {
          deviceId: managementData.deviceDetails.deviceId,
          thumbprint: managementData.deviceDetails.thumbprint,
          keyProvider: managementData.deviceDetails.keyProvider,
          tmpProtected: managementData.deviceDetails.tmpProtected,
          keyContainerId: managementData.deviceDetails.keyContainerId,
          deviceAuthStatus: managementData.deviceDetails.deviceAuthStatus,
          deviceCertificateValidity: managementData.deviceDetails.deviceCertificateValidity
        } : undefined,
        
        mdmEnrollment: managementData.mdmEnrollment ? {
          provider: managementData.mdmEnrollment.provider,
          isEnrolled: managementData.mdmEnrollment.isEnrolled,
          managementUrl: managementData.mdmEnrollment.managementUrl,
          enrollmentType: managementData.mdmEnrollment.enrollmentType,
          serverUrl: managementData.mdmEnrollment.serverUrl
        } : undefined,
        
        tenantDetails: managementData.tenantDetails ? {
          tenantName: managementData.tenantDetails.tenantName,
          tenantId: managementData.tenantDetails.tenantId,
          mdmUrl: managementData.tenantDetails.mdmUrl
        } : undefined,
        
        userState: managementData.userState ? {
          ngcSet: managementData.userState.ngcSet,
          canReset: managementData.userState.canReset,
          ngcKeyId: managementData.userState.ngcKeyId,
          wamDefaultId: managementData.userState.wamDefaultId,
          wamDefaultSet: managementData.userState.wamDefaultSet,
          wamDefaultGUID: managementData.userState.wamDefaultGUID,
          workplaceJoined: managementData.userState.workplaceJoined,
          wamDefaultAuthority: managementData.userState.wamDefaultAuthority
        } : undefined,
        
        ssoState: managementData.ssoState ? {
          cloudTgt: managementData.ssoState.cloudTgt,
          entraPrt: managementData.ssoState.entraPrt,
          onPremTgt: managementData.ssoState.onPremTgt,
          enterprisePrt: managementData.ssoState.enterprisePrt,
          entraPrtAuthority: managementData.ssoState.entraPrtAuthority,
          kerbTopLevelNames: managementData.ssoState.kerbTopLevelNames,
          entraPrtExpiryTime: managementData.ssoState.entraPrtExpiryTime,
          entraPrtUpdateTime: managementData.ssoState.entraPrtUpdateTime,
          enterprisePrtAuthority: managementData.ssoState.enterprisePrtAuthority
        } : undefined,
        
        diagnosticData: managementData.diagnosticData ? {
          accessType: managementData.diagnosticData.accessType,
          clientTime: managementData.diagnosticData.clientTime,
          keySignTest: managementData.diagnosticData.keySignTest,
          clientErrorCode: managementData.diagnosticData.clientErrorCode,
          hostNameUpdated: managementData.diagnosticData.hostNameUpdated,
          proxyBypassList: managementData.diagnosticData.proxyBypassList,
          proxyServerList: managementData.diagnosticData.proxyServerList,
          osVersionUpdated: managementData.diagnosticData.osVersionUpdated,
          autoDetectSettings: managementData.diagnosticData.autoDetectSettings,
          displayNameUpdated: managementData.diagnosticData.displayNameUpdated,
          lastHostNameUpdate: managementData.diagnosticData.lastHostNameUpdate,
          autoConfigurationUrl: managementData.diagnosticData.autoConfigurationUrl,
          entraRecoveryEnabled: managementData.diagnosticData.entraRecoveryEnabled,
          executingAccountName: managementData.diagnosticData.executingAccountName
        } : undefined,
        
        compliancePolicies: managementData.compliancePolicies || [],
        
        metadata: managementData.metadata ? {
          Certificates: managementData.metadata.Certificates || []
        } : undefined,
        
        // Legacy fields (for backward compatibility)
        profiles: managementData.profiles || [],
        restrictions: managementData.restrictions || {},
        apps: managementData.apps || []
      }
    }

    // Process network data from the network module
    const networkModuleData = modules.network || rawDevice.networkModule
    console.log('DeviceMapper DEBUG - Network module data:', {
      hasNetworkModule: !!modules.network,
      hasRawNetworkModule: !!rawDevice.networkModule,
      networkModuleKeys: networkModuleData ? Object.keys(networkModuleData) : 'none'
    })
    
    if (networkModuleData) {
      // Add network module data to mappedDevice.modules.network
      if (!mappedDevice.modules) mappedDevice.modules = {}
      mappedDevice.modules.network = {
        interfaces: networkModuleData.Interfaces || networkModuleData.interfaces || [],
        wifiNetworks: networkModuleData.WifiNetworks || networkModuleData.wifiNetworks || [],
        vpnConnections: networkModuleData.VpnConnections || networkModuleData.vpnConnections || [],
        dns: networkModuleData.Dns || networkModuleData.dns || {},
        routes: networkModuleData.Routes || networkModuleData.routes || [],
        primaryInterface: networkModuleData.PrimaryInterface || networkModuleData.primaryInterface || ''
      }
      
      // Update legacy network field for compatibility
      if (networkModuleData.Interfaces && networkModuleData.Interfaces.length > 0) {
        const primaryInterface = networkModuleData.Interfaces[0]
        mappedDevice.network = {
          ...mappedDevice.network,
          hostname: rawDevice.name || rawDevice.hostname,
          connectionType: primaryInterface.Type || 'Ethernet',
          ssid: networkModuleData.WifiNetworks?.[0]?.Ssid || null,
          signalStrength: networkModuleData.WifiNetworks?.[0]?.SignalStrength ? `${networkModuleData.WifiNetworks[0].SignalStrength}%` : null,
          ethernet: primaryInterface.MacAddress,
          ipv4ip: primaryInterface.IpAddresses?.[0],
          activemtu: primaryInterface.Mtu,
          status: primaryInterface.Status === 'Up' ? 1 : 0,
          service: primaryInterface.Name
        }
        
        // Update top-level IP/MAC if not already set
        if (!mappedDevice.ipAddress && primaryInterface.IpAddresses?.[0]) {
          mappedDevice.ipAddress = primaryInterface.IpAddresses[0]
        }
        if (!mappedDevice.macAddress && primaryInterface.MacAddress) {
          mappedDevice.macAddress = primaryInterface.MacAddress
        }
      }
    }

    // Process security data from the security module
    const securityModuleData = modules.security || rawDevice.securityModule
    console.log('DeviceMapper DEBUG - Security module data:', {
      hasSecurityModule: !!modules.security,
      hasRawSecurityModule: !!rawDevice.securityModule,
      securityModuleKeys: securityModuleData ? Object.keys(securityModuleData) : 'none'
    })
    
    if (securityModuleData) {
      // Add security module data to mappedDevice.modules.security
      if (!mappedDevice.modules) mappedDevice.modules = {}
      mappedDevice.modules.security = {
        antivirus: securityModuleData.Antivirus || {},
        firewall: securityModuleData.Firewall || {},
        encryption: securityModuleData.Encryption || {},
        tpm: securityModuleData.Tpm || {},
        securityUpdates: securityModuleData.SecurityUpdates || [],
        securityEvents: securityModuleData.SecurityEvents || [],
        lastSecurityScan: securityModuleData.LastSecurityScan
      }
      
      // Update legacy securityFeatures for compatibility
      const antivirus = securityModuleData.Antivirus || {}
      const firewall = securityModuleData.Firewall || {}
      const encryption = securityModuleData.Encryption || {}
      const tpm = securityModuleData.Tpm || {}
      
      mappedDevice.securityFeatures = {
        ...mappedDevice.securityFeatures,
        // Windows Defender / Antivirus
        windowsDefender: {
          enabled: antivirus.IsEnabled || false,
          status: antivirus.IsUpToDate ? 'Up to date' : (antivirus.IsEnabled ? 'Active' : 'Disabled')
        },
        // Firewall
        firewall: {
          enabled: firewall.IsEnabled || false,
          status: firewall.IsEnabled ? 'Active' : 'Disabled'
        },
        // BitLocker
        bitlocker: {
          enabled: encryption.BitLocker?.IsEnabled || false,
          status: encryption.BitLocker?.Status || 'Unknown'
        },
        // TPM
        tpm: {
          enabled: tpm.IsEnabled || false,
          status: tpm.IsActivated ? 'Active' : (tpm.IsPresent ? 'Present' : 'Not Available'),
          version: tpm.Version || undefined
        }
      }
    }
    
    // Populate modules data container if not already set
    if (mappedDevice.modules) {
      mappedDevice.modules = {
        ...mappedDevice.modules,
        system: {
          operatingSystem: operatingSystem
        }
      }
    }
    
    // Process security features for widgets
    const services = systemData?.services || []
    if (services.length > 0) {
      mappedDevice.securityFeatures = {
        // Windows-specific security features based on services
        windowsDefender: {
          enabled: services.some((s: any) => s.name === 'WinDefend' && s.status === 'RUNNING'),
          status: services.find((s: any) => s.name === 'WinDefend')?.status || 'Unknown'
        },
        bitlocker: {
          enabled: services.some((s: any) => s.name === 'BDESVC' && s.status === 'RUNNING'),
          status: services.find((s: any) => s.name === 'BDESVC')?.status || 'Unknown'
        },
        firewall: {
          enabled: services.some((s: any) => (s.name === 'BFE' || s.name === 'MpsSvc') && s.status === 'RUNNING'),
          status: services.find((s: any) => s.name === 'BFE' || s.name === 'MpsSvc')?.status || 'Unknown'
        },
        windowsUpdates: {
          enabled: services.some((s: any) => s.name === 'wuauserv' && s.status === 'RUNNING'),
          status: services.find((s: any) => s.name === 'wuauserv')?.status || 'Unknown'
        }
      }
    } else {
      // Provide sample security features for demonstration
      mappedDevice.securityFeatures = {
        windowsDefender: {
          enabled: true,
          status: 'Active'
        },
        bitlocker: {
          enabled: true,
          status: 'Encrypted'
        },
        firewall: {
          enabled: true,
          status: 'Active'
        },
        windowsUpdates: {
          enabled: true,
          status: 'Automatic'
        },
        uac: {
          enabled: true,
          status: 'Enabled'
        }
      }
    }
  }

  console.log('mapDeviceData output:', {
    mappedDeviceId: mappedDevice.id,
    mappedDeviceName: mappedDevice.name,
    mappedDeviceStatus: mappedDevice.status,
    hasAllRequiredFields: !!(mappedDevice.id && mappedDevice.name)
  })

  return mappedDevice
}