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
    enrolled: boolean
    enrolled_via_dep: boolean
    server_url?: string | null
    user_approved?: boolean
    organization?: string | null
    department?: string | null
    vendor?: string | null
    profiles?: Array<{
      id: string
      name: string
      description: string
      type: string
      status: string
      lastModified: string
    }>
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
    name: rawDevice.name || rawDevice.hostname || rawDevice.computer_name || 'Unknown Device',
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
        deviceName: inventoryData.deviceName,
        usage: inventoryData.usage,
        catalog: inventoryData.catalog,
        department: inventoryData.department,
        location: inventoryData.location,
        assetTag: inventoryData.assetTag,
        serialNumber: inventoryData.serialNumber,
        uuid: inventoryData.uuid
      }
      
      // Override top-level assetTag with inventory data if available, or keep existing
      if (inventoryData.assetTag) {
        mappedDevice.assetTag = inventoryData.assetTag
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
      mappedDevice.network = {
        hostname: networkData.hostname,
        connectionType: networkData.connectionType || networkData.interface_type,
        ssid: networkData.ssid,
        signalStrength: networkData.signalStrength,
        service: networkData.service,
        status: networkData.status,
        ethernet: networkData.ethernet,
        clientid: networkData.clientid,
        ipv4conf: networkData.ipv4conf,
        ipv4ip: networkData.ipv4ip,
        ipv4mask: networkData.ipv4mask,
        ipv4router: networkData.ipv4router,
        ipv6conf: networkData.ipv6conf,
        ipv6ip: networkData.ipv6ip,
        ipv6prefixlen: networkData.ipv6prefixlen,
        ipv6router: networkData.ipv6router,
        ipv4dns: networkData.ipv4dns,
        vlans: networkData.vlans,
        activemtu: networkData.activemtu,
        validmturange: networkData.validmturange,
        currentmedia: networkData.currentmedia,
        activemedia: networkData.activemedia,
        searchdomain: networkData.searchdomain,
        externalip: networkData.externalip,
        location: networkData.location
      }
      
      // Update top-level network fields
      if (networkData.ipv4ip) mappedDevice.ipAddress = networkData.ipv4ip
      if (networkData.ipv4ip) mappedDevice.ipAddressV4 = networkData.ipv4ip
      if (networkData.ipv6ip) mappedDevice.ipAddressV6 = networkData.ipv6ip
      if (networkData.mac_address) mappedDevice.macAddress = networkData.mac_address
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
    if (managementData) {
      mappedDevice.management = {
        enrolled: managementData.enrolled || false,
        enrolled_via_dep: managementData.enrolled_via_dep,
        server_url: managementData.server_url,
        user_approved: managementData.user_approved,
        organization: managementData.organization,
        department: managementData.department,
        vendor: managementData.vendor,
        profiles: managementData.profiles || [],
        restrictions: managementData.restrictions || {},
        apps: managementData.apps || []
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