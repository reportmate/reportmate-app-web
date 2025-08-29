/**
 * Peripherals Module - Reader Only
 * Frontend reads pre-processed peripheral/device data from device collection
 * NO heavy processing - device should provide clean, standardized peripheral inventory
 */

export interface PeripheralInfo {
  connectedDevices: ConnectedDevice[]
  usbDevices: UsbDevice[]
  bluetoothDevices: BluetoothDevice[]
  networkAdapters: NetworkAdapter[]
  storageDevices: StorageDevice[]
  displayDevices: DisplayDevice[]
  audioDevices: AudioDevice[]
  inputDevices: InputDevice[]
  printers: PrinterDevice[]
  totalCount: number
  summary: PeripheralSummary
}

export interface ConnectedDevice {
  id: string
  name: string
  type: 'usb' | 'bluetooth' | 'network' | 'display' | 'audio' | 'storage' | 'input' | 'printer' | 'other'
  status: 'connected' | 'disconnected' | 'error' | 'unknown'
  manufacturer?: string
  model?: string
  driver?: string
  driverVersion?: string
  lastConnected?: string
  connectionType?: string
}

export interface UsbDevice {
  deviceId: string
  name: string
  vendorId?: string
  productId?: string
  manufacturer?: string
  description?: string
  status: 'active' | 'inactive' | 'error'
  port?: string
  speed?: string
  power?: string
}

export interface BluetoothDevice {
  address: string
  name: string
  deviceClass?: string
  manufacturer?: string
  status: 'connected' | 'paired' | 'available' | 'disconnected'
  lastSeen?: string
  rssi?: number
  services?: string[]
}

export interface NetworkAdapter {
  name: string
  type: 'ethernet' | 'wifi' | 'bluetooth' | 'virtual' | 'other'
  status: 'connected' | 'disconnected' | 'disabled'
  macAddress?: string
  ipAddress?: string
  speed?: string
  manufacturer?: string
  driver?: string
  driverVersion?: string
}

export interface StorageDevice {
  name: string
  type: 'hdd' | 'ssd' | 'usb' | 'optical' | 'network' | 'virtual'
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  capacity?: number  // in bytes
  freeSpace?: number
  usedSpace?: number
  filesystem?: string
  mountPoint?: string
  temperature?: number
  manufacturer?: string
  model?: string
  serialNumber?: string
}

export interface DisplayDevice {
  name: string
  type: 'monitor' | 'projector' | 'tv' | 'integrated'
  status: 'active' | 'inactive' | 'extended' | 'mirrored'
  resolution?: string
  refreshRate?: number
  colorDepth?: number
  manufacturer?: string
  model?: string
  connectionType?: string
  primary?: boolean
}

export interface AudioDevice {
  name: string
  type: 'speaker' | 'headphone' | 'microphone' | 'headset' | 'integrated'
  status: 'active' | 'inactive' | 'default' | 'disabled'
  manufacturer?: string
  driver?: string
  sampleRate?: number
  bitDepth?: number
  channels?: number
}

export interface InputDevice {
  name: string
  type: 'keyboard' | 'mouse' | 'touchpad' | 'joystick' | 'tablet' | 'touchscreen'
  status: 'active' | 'inactive' | 'error'
  manufacturer?: string
  model?: string
  connectionType?: string
  wireless?: boolean
  batteryLevel?: number
}

export interface PrinterDevice {
  name: string
  type: 'inkjet' | 'laser' | 'thermal' | 'dot_matrix' | 'other'
  status: 'ready' | 'printing' | 'error' | 'offline' | 'paper_jam' | 'low_ink'
  manufacturer?: string
  model?: string
  driver?: string
  connectionType?: string
  ipAddress?: string
  location?: string
  shared?: boolean
}

export interface PeripheralSummary {
  totalDevices: number
  connectedDevices: number
  activeDevices: number
  devicesByType: Record<string, number>
  devicesWithErrors: number
  bluetoothEnabled: boolean
  usbPortsUsed: number
  displayCount: number
  storageDevicesHealthy: number
}

/**
 * Extract peripheral information from device modules
 * READER ONLY: Expects device to provide pre-processed peripheral inventory
 */
export function extractPeripherals(deviceModules: any): PeripheralInfo {
  if (!deviceModules?.peripherals) {
    console.log('[PERIPHERALS MODULE] No peripheral data found in modules')
    return createEmptyPeripheralInfo()
  }

  const peripherals = deviceModules.peripherals
  
  console.log('[PERIPHERALS MODULE] Reading pre-processed peripheral data:', {
    hasConnectedDevices: !!peripherals.connectedDevices,
    hasUsbDevices: !!peripherals.usbDevices,
    hasBluetoothDevices: !!peripherals.bluetoothDevices,
    hasNetworkAdapters: !!peripherals.networkAdapters,
    hasStorageDevices: !!peripherals.storageDevices,
    hasDisplayDevices: !!peripherals.displayDevices,
    hasAudioDevices: !!peripherals.audioDevices,
    hasInputDevices: !!peripherals.inputDevices,
    hasPrinters: !!peripherals.printers
  })

  const peripheralInfo: PeripheralInfo = {
    // Read all device categories (device should categorize and process)
    connectedDevices: peripherals.connectedDevices ? peripherals.connectedDevices.map(mapConnectedDevice) : [],
    usbDevices: peripherals.usbDevices ? peripherals.usbDevices.map(mapUsbDevice) : [],
    bluetoothDevices: peripherals.bluetoothDevices ? peripherals.bluetoothDevices.map(mapBluetoothDevice) : [],
    networkAdapters: peripherals.networkAdapters ? peripherals.networkAdapters.map(mapNetworkAdapter) : [],
    storageDevices: peripherals.storageDevices ? peripherals.storageDevices.map(mapStorageDevice) : [],
    displayDevices: peripherals.displayDevices ? peripherals.displayDevices.map(mapDisplayDevice) : [],
    audioDevices: peripherals.audioDevices ? peripherals.audioDevices.map(mapAudioDevice) : [],
    inputDevices: peripherals.inputDevices ? peripherals.inputDevices.map(mapInputDevice) : [],
    printers: peripherals.printers ? peripherals.printers.map(mapPrinterDevice) : [],
    
    // Use device-calculated total (don't recalculate in frontend)
    totalCount: peripherals.totalCount || 0,
    
    // Use device-generated summary
    summary: peripherals.summary || createEmptySummary()
  }

  console.log('[PERIPHERALS MODULE] Peripheral info read:', {
    totalCount: peripheralInfo.totalCount,
    connectedDevices: peripheralInfo.connectedDevices.length,
    usbDevices: peripheralInfo.usbDevices.length,
    bluetoothDevices: peripheralInfo.bluetoothDevices.length,
    networkAdapters: peripheralInfo.networkAdapters.length,
    storageDevices: peripheralInfo.storageDevices.length,
    displayDevices: peripheralInfo.displayDevices.length,
    audioDevices: peripheralInfo.audioDevices.length,
    inputDevices: peripheralInfo.inputDevices.length,
    printers: peripheralInfo.printers.length
  })

  return peripheralInfo
}

// Helper functions for mapping device data (minimal processing)
function mapConnectedDevice(device: any): ConnectedDevice {
  return {
    id: device.id || device.deviceId || '',
    name: device.name || '',
    type: device.type || 'other',
    status: device.status || 'unknown',
    manufacturer: device.manufacturer,
    model: device.model,
    driver: device.driver,
    driverVersion: device.driverVersion || device.driver_version,
    lastConnected: device.lastConnected || device.last_connected,
    connectionType: device.connectionType || device.connection_type
  }
}

function mapUsbDevice(device: any): UsbDevice {
  return {
    deviceId: device.deviceId || device.device_id || '',
    name: device.name || '',
    vendorId: device.vendorId || device.vendor_id,
    productId: device.productId || device.product_id,
    manufacturer: device.manufacturer,
    description: device.description,
    status: device.status || 'active',
    port: device.port,
    speed: device.speed,
    power: device.power
  }
}

function mapBluetoothDevice(device: any): BluetoothDevice {
  return {
    address: device.address || '',
    name: device.name || '',
    deviceClass: device.deviceClass || device.device_class,
    manufacturer: device.manufacturer,
    status: device.status || 'disconnected',
    lastSeen: device.lastSeen || device.last_seen,
    rssi: device.rssi,
    services: device.services || []
  }
}

function mapNetworkAdapter(adapter: any): NetworkAdapter {
  return {
    name: adapter.name || '',
    type: adapter.type || 'other',
    status: adapter.status || 'disconnected',
    macAddress: adapter.macAddress || adapter.mac_address,
    ipAddress: adapter.ipAddress || adapter.ip_address,
    speed: adapter.speed,
    manufacturer: adapter.manufacturer,
    driver: adapter.driver,
    driverVersion: adapter.driverVersion || adapter.driver_version
  }
}

function mapStorageDevice(device: any): StorageDevice {
  return {
    name: device.name || '',
    type: device.type || 'hdd',
    status: device.status || 'healthy',
    capacity: device.capacity,
    freeSpace: device.freeSpace || device.free_space,
    usedSpace: device.usedSpace || device.used_space,
    filesystem: device.filesystem,
    mountPoint: device.mountPoint || device.mount_point,
    temperature: device.temperature,
    manufacturer: device.manufacturer,
    model: device.model,
    serialNumber: device.serialNumber || device.serial_number
  }
}

function mapDisplayDevice(device: any): DisplayDevice {
  return {
    name: device.name || '',
    type: device.type || 'monitor',
    status: device.status || 'inactive',
    resolution: device.resolution,
    refreshRate: device.refreshRate || device.refresh_rate,
    colorDepth: device.colorDepth || device.color_depth,
    manufacturer: device.manufacturer,
    model: device.model,
    connectionType: device.connectionType || device.connection_type,
    primary: device.primary || false
  }
}

function mapAudioDevice(device: any): AudioDevice {
  return {
    name: device.name || '',
    type: device.type || 'speaker',
    status: device.status || 'inactive',
    manufacturer: device.manufacturer,
    driver: device.driver,
    sampleRate: device.sampleRate || device.sample_rate,
    bitDepth: device.bitDepth || device.bit_depth,
    channels: device.channels
  }
}

function mapInputDevice(device: any): InputDevice {
  return {
    name: device.name || '',
    type: device.type || 'keyboard',
    status: device.status || 'inactive',
    manufacturer: device.manufacturer,
    model: device.model,
    connectionType: device.connectionType || device.connection_type,
    wireless: device.wireless || false,
    batteryLevel: device.batteryLevel || device.battery_level
  }
}

function mapPrinterDevice(device: any): PrinterDevice {
  return {
    name: device.name || '',
    type: device.type || 'other',
    status: device.status || 'offline',
    manufacturer: device.manufacturer,
    model: device.model,
    driver: device.driver,
    connectionType: device.connectionType || device.connection_type,
    ipAddress: device.ipAddress || device.ip_address,
    location: device.location,
    shared: device.shared || false
  }
}

// Empty data creators
function createEmptyPeripheralInfo(): PeripheralInfo {
  return {
    connectedDevices: [],
    usbDevices: [],
    bluetoothDevices: [],
    networkAdapters: [],
    storageDevices: [],
    displayDevices: [],
    audioDevices: [],
    inputDevices: [],
    printers: [],
    totalCount: 0,
    summary: createEmptySummary()
  }
}

function createEmptySummary(): PeripheralSummary {
  return {
    totalDevices: 0,
    connectedDevices: 0,
    activeDevices: 0,
    devicesByType: {},
    devicesWithErrors: 0,
    bluetoothEnabled: false,
    usbPortsUsed: 0,
    displayCount: 0,
    storageDevicesHealthy: 0
  }
}
