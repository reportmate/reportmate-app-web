/**
 * Peripherals Tab Component
 * Comprehensive peripheral device information with horizontal category navigation
 * 
 * Categories (ordered):
 * 1. Input Devices (keyboards, mice, trackpads, graphics tablets)
 * 2. Audio (speakers, output devices)
 * 3. Microphones (input audio devices)
 * 4. Printers (CUPS, network, direct-connect) - HIGH PRIORITY
 * 5. Scanners
 * 6. External Storage (USB drives, SD cards)
 * 7. USB & Thunderbolt (combined - hubs, docks, displays, storage)
 * 8. Bluetooth (actual BT peripherals only, no WiFi devices)
 * 
 * NOTE: Displays are part of the Hardware module, not Peripherals
 */

'use client'

import React, { useState, useMemo } from 'react'
import { 
  Usb, Keyboard, Volume2, Bluetooth, Zap, Printer, 
  ScanLine, HardDrive, Wifi, WifiOff,
  Mouse, Tablet, Speaker, Mic, Hand, Monitor, LucideIcon,
  Copy, Check
} from 'lucide-react'
import { DebugAccordion } from '../DebugAccordion'

// Type definitions
interface USBDevice {
  name: string
  vendor?: string
  vendorId?: string
  productId?: string
  serialNumber?: string
  speed?: string
  linkSpeed?: string
  locationId?: string
  powerAllocated?: string
  usbVersion?: string
  isRemovable?: boolean
  deviceType?: string
  connectionType?: string
}

interface InputDevice {
  name: string
  vendor?: string
  vendorId?: string
  isBuiltIn?: boolean
  connectionType?: string
  deviceType?: string
  supportsForcTouch?: boolean
  tabletType?: string
}

interface InputDevices {
  keyboards?: InputDevice[]
  mice?: InputDevice[]
  trackpads?: InputDevice[]
  tablets?: InputDevice[]
}

interface AudioDevice {
  name: string
  manufacturer?: string
  type?: string
  isDefault?: boolean
  isInput?: boolean
  isOutput?: boolean
  isBuiltIn?: boolean
  connectionType?: string
  deviceType?: string
}

interface BluetoothDevice {
  name: string
  address?: string
  isConnected?: boolean
  isPaired?: boolean
  deviceType?: string
  deviceCategory?: string
  isAppleDevice?: boolean
  batteryLevel?: number
  connectionType?: string
}

interface ThunderboltDevice {
  name: string
  vendor?: string
  deviceId?: string
  uid?: string
  deviceType?: string
  connectionType?: string
}

interface CupsFilter {
  name: string
  path: string
  version?: string
  permissions?: string
}

interface PrinterDevice {
  name: string
  uri?: string
  connectionType?: string
  status?: string
  state?: string
  stateMessage?: string
  stateReasons?: string[]
  isDefault?: boolean
  isShared?: boolean
  isAcceptingJobs?: boolean
  pendingJobs?: number
  printerType?: string
  deviceType?: string
  manufacturer?: string
  model?: string
  identifier?: string
  make?: string
  makeAndModel?: string
  driverName?: string
  driverVersion?: string
  postScriptVersion?: string
  ppd?: string
  ppdVersion?: string
  ppdFileVersion?: string
  cupsVersion?: string
  authInfoRequired?: string
  printerCommands?: string | string[]
  printerUriSupported?: string
  scanningSupport?: string
  dateAdded?: string
  cupsFilters?: CupsFilter[]
  faxSupport?: string
  pdes?: string
  colorCapable?: boolean
  duplexCapable?: boolean
}

interface ScannerDevice {
  name: string
  manufacturer?: string
  connectionType?: string
  status?: string
  scannerType?: string
  deviceType?: string
}

interface ExternalStorageDevice {
  name: string
  devicePath?: string
  mountPoint?: string
  fileSystem?: string
  totalSize?: string
  protocol?: string
  storageType?: string
  deviceType?: string
}

interface SerialPort {
  name: string
  device?: string
  portType?: string
  connectionType?: string
  deviceType?: string
}

interface PeripheralsData {
  collectedAt?: string
  usbDevices?: USBDevice[]
  inputDevices?: InputDevices
  audioDevices?: AudioDevice[]
  bluetoothDevices?: BluetoothDevice[]
  cameras?: never[] // Removed - not needed
  thunderboltDevices?: ThunderboltDevice[]
  printers?: PrinterDevice[]
  scanners?: ScannerDevice[]
  externalStorage?: ExternalStorageDevice[]
  serialPorts?: SerialPort[]
}

interface Device {
  id: string
  name?: string
  modules?: {
    peripherals?: PeripheralsData
    [key: string]: unknown
  }
  peripherals?: PeripheralsData
}

interface PeripheralsTabProps {
  device: Device
  data?: PeripheralsData | any
}

// Sidebar category definition
interface Category {
  id: string
  name: string
  icon: LucideIcon
  count: number
  color: string
}

// Helper component for device cards
const DeviceCard = ({ 
  children, 
  title, 
  icon: Icon, 
  badge,
  fullWidth = false
}: { 
  children: React.ReactNode
  title?: string
  icon?: LucideIcon
  badge?: string | React.ReactNode
  fullWidth?: boolean
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${fullWidth ? 'col-span-full' : ''}`}>
    {title && (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h4>
        </div>
        {badge && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{badge}</span>
        )}
      </div>
    )}
    <div className="p-4">
      {children}
    </div>
  </div>
)

// Status indicator
const StatusBadge = ({ connected, label }: { connected?: boolean; label?: string }) => {
  if (label) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
        {label}
      </span>
    )
  }
  return connected ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
      <Wifi className="w-3 h-3" /> Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
      <WifiOff className="w-3 h-3" /> Paired
    </span>
  )
}

export const PeripheralsTab: React.FC<PeripheralsTabProps> = ({ device, data }) => {
  // null = show all, string = show only that category
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  
  const toggleCategory = (categoryId: string) => {
    setActiveFilter(prev => {
      // If clicking the same filter, clear it (show all)
      if (prev === categoryId) {
        return null
      }
      // Otherwise, filter to only this category
      return categoryId
    })
  }
  
  // Show category if no filter active OR if this category is the active filter
  const isVisible = (categoryId: string) => activeFilter === null || activeFilter === categoryId
  
  // Extract peripherals data from device
  const peripherals: PeripheralsData = useMemo(() => {
    return data || device.peripherals || device.modules?.peripherals || {}
  }, [device, data])
  
  // Split audio devices into outputs and microphones
  const audioOutputs = useMemo(() => 
    (peripherals.audioDevices || []).filter(d => d.isOutput || d.type === 'Output'),
    [peripherals.audioDevices]
  )
  
  const microphones = useMemo(() => 
    (peripherals.audioDevices || []).filter(d => d.isInput || d.type === 'Input'),
    [peripherals.audioDevices]
  )
  
  // Filter Bluetooth devices - only actual BT peripherals, not WiFi devices like HomePods or Apple Watch
  const filteredBluetoothDevices = useMemo(() => {
    const btDevices = peripherals.bluetoothDevices || []
    return btDevices.filter(d => {
      const name = (d.name || '').toLowerCase()
      const category = (d.deviceCategory || '').toLowerCase()
      // Exclude HomePods (WiFi), Apple Watch, and other non-peripheral devices
      if (name.includes('homepod')) return false
      if (name.includes('apple watch')) return false
      if (name.includes('iphone')) return false
      if (name.includes('ipad')) return false
      if (name.includes('macbook')) return false
      if (name.includes('imac')) return false
      if (name.includes('mac mini')) return false
      if (name.includes('mac pro')) return false
      if (name.includes('mac studio')) return false
      if (category === 'computer') return false
      if (category === 'phone') return false
      if (category === 'tablet') return false
      if (category === 'watch') return false
      if (category === 'speaker' && name.includes('homepod')) return false
      return true
    })
  }, [peripherals.bluetoothDevices])
  
  // Combined USB + Thunderbolt count
  const usbThunderboltCount = (peripherals.usbDevices?.length || 0) + (peripherals.thunderboltDevices?.length || 0)
  
  // Calculate counts for each category - Grid order: Row 1: Storage, USB, Audio, Input | Row 2: Printers, Scanners, Microphones, Bluetooth
  const categories: Category[] = useMemo(() => [
    { 
      id: 'storage', 
      name: 'External Storage', 
      icon: HardDrive, 
      count: peripherals.externalStorage?.length || 0,
      color: 'text-red-500'
    },
    { 
      id: 'usb-thunderbolt', 
      name: 'USB & Thunderbolt', 
      icon: Usb, 
      count: usbThunderboltCount,
      color: 'text-blue-500'
    },
    { 
      id: 'audio', 
      name: 'Audio', 
      icon: Volume2, 
      count: audioOutputs.length,
      color: 'text-green-500'
    },
    { 
      id: 'input', 
      name: 'Input Devices', 
      icon: Keyboard, 
      count: (peripherals.inputDevices?.keyboards?.length || 0) + 
             (peripherals.inputDevices?.mice?.length || 0) + 
             (peripherals.inputDevices?.trackpads?.length || 0) +
             (peripherals.inputDevices?.tablets?.length || 0),
      color: 'text-purple-500'
    },
    { 
      id: 'printers', 
      name: 'Printers', 
      icon: Printer, 
      count: peripherals.printers?.length || 0,
      color: 'text-orange-500'
    },
    { 
      id: 'scanners', 
      name: 'Scanners', 
      icon: ScanLine, 
      count: peripherals.scanners?.length || 0,
      color: 'text-indigo-500'
    },
    { 
      id: 'microphones', 
      name: 'Microphones', 
      icon: Mic, 
      count: microphones.length,
      color: 'text-rose-500'
    },
    { 
      id: 'bluetooth', 
      name: 'Bluetooth', 
      icon: Bluetooth, 
      count: filteredBluetoothDevices.length,
      color: 'text-cyan-500'
    },
  ], [peripherals, audioOutputs.length, microphones.length, usbThunderboltCount, filteredBluetoothDevices.length])
  
  // Check if we have any data
  if (!peripherals || Object.keys(peripherals).length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <Monitor className="h-8 w-8 text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          No Peripheral Data
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Peripheral device information is not available for this device. This could be because the device has not reported recently or the peripherals module is not enabled.
        </p>
      </div>
    )
  }
  
  // Render selected categories (only if they have data)
  const renderAllContent = () => {
    return (
      <div className="space-y-8">
        {isVisible('storage') && peripherals.externalStorage && peripherals.externalStorage.length > 0 && (
          <ExternalStorageContent devices={peripherals.externalStorage} />
        )}
        {isVisible('printers') && peripherals.printers && peripherals.printers.length > 0 && (
          <PrintersContent devices={peripherals.printers} />
        )}
        {isVisible('audio') && audioOutputs.length > 0 && (
          <AudioDevicesContent devices={audioOutputs} />
        )}
        {isVisible('scanners') && peripherals.scanners && peripherals.scanners.length > 0 && (
          <ScannersContent devices={peripherals.scanners} />
        )}
        {isVisible('microphones') && microphones.length > 0 && (
          <MicrophonesContent devices={microphones} />
        )}
        {isVisible('usb-thunderbolt') && ((peripherals.usbDevices?.length || 0) > 0 || (peripherals.thunderboltDevices?.length || 0) > 0) && (
          <USBThunderboltContent 
            usbDevices={peripherals.usbDevices || []} 
            thunderboltDevices={peripherals.thunderboltDevices || []} 
          />
        )}
        {isVisible('bluetooth') && filteredBluetoothDevices.length > 0 && (
          <BluetoothDevicesContent devices={filteredBluetoothDevices} />
        )}
        {isVisible('input') && peripherals.inputDevices && (
          ((peripherals.inputDevices.keyboards?.length || 0) > 0 || 
           (peripherals.inputDevices.mice?.length || 0) > 0 || 
           (peripherals.inputDevices.trackpads?.length || 0) > 0 ||
           (peripherals.inputDevices.tablets?.length || 0) > 0) && (
            <InputDevicesContent 
              devices={peripherals.inputDevices} 
              bluetoothDevices={peripherals.bluetoothDevices}
            />
          )
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Horizontal Category Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="grid grid-cols-4 gap-2">
          {categories.map((category) => {
            const isActive = activeFilter === category.id
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all justify-between ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : category.color}`} />
                  <span>{category.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  {category.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="overflow-auto">
        {renderAllContent()}
      </div>

      <DebugAccordion
        data={device?.modules?.peripherals}
        label="device.modules.peripherals"
        moduleVersion={device?.modules?.peripherals?.moduleVersion as string | undefined}
      />
    </div>
  )
}

// Combined USB & Thunderbolt Content
const USBThunderboltContent = ({ 
  usbDevices, 
  thunderboltDevices 
}: { 
  usbDevices: USBDevice[]
  thunderboltDevices: ThunderboltDevice[] 
}) => {
  const _total = usbDevices.length + thunderboltDevices.length
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Usb className="w-5 h-5 text-blue-500" />
        USB & Thunderbolt
      </h3>
      
      {thunderboltDevices.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> Thunderbolt
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {thunderboltDevices.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Thunderbolt Device'} icon={Zap} badge={device.deviceType}>
                <div className="space-y-2 text-sm">
                  {device.vendor && <InfoRow label="Vendor" value={device.vendor} />}
                  {device.deviceId && <InfoRow label="Device ID" value={device.deviceId} />}
                  {device.uid && <InfoRow label="UID" value={device.uid} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {usbDevices.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Usb className="w-4 h-4 text-blue-500" /> USB Devices
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {usbDevices.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Unknown USB Device'} icon={Usb} badge={device.deviceType}>
                <div className="space-y-2 text-sm">
                  {device.vendor && <InfoRow label="Vendor" value={device.vendor} />}
                  {device.vendorId && <InfoRow label="Vendor ID" value={device.vendorId} />}
                  {device.productId && <InfoRow label="Product ID" value={device.productId} />}
                  {device.serialNumber && <InfoRow label="Serial" value={device.serialNumber} />}
                  {device.linkSpeed && <InfoRow label="Link Speed" value={device.linkSpeed} />}
                  {device.speed && !device.linkSpeed && <InfoRow label="Speed" value={device.speed} />}
                  {device.locationId && <InfoRow label="Location ID" value={device.locationId} />}
                  {device.powerAllocated && <InfoRow label="Power" value={device.powerAllocated} />}
                  {device.usbVersion && <InfoRow label="USB Version" value={device.usbVersion} />}
                  {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Input Devices Content
const InputDevicesContent = ({ 
  devices, 
  bluetoothDevices 
}: { 
  devices: InputDevices
  bluetoothDevices?: BluetoothDevice[]
}) => {
  // Consolidate keyboards from input devices AND Bluetooth
  const btKeyboards = (bluetoothDevices || [])
    .filter(d => d.deviceType === 'Keyboard' || d.deviceCategory === 'Keyboard')
    .map(d => ({
      name: d.name || 'Keyboard',
      vendor: '',
      isBuiltIn: false,
      connectionType: 'Bluetooth',
      deviceType: 'Keyboard'
    }))
  
  const keyboards = [...(devices.keyboards || []), ...btKeyboards]
  const mice = devices.mice || []
  const trackpads = devices.trackpads || []
  const tablets = devices.tablets || []
  
  const total = keyboards.length + mice.length + trackpads.length + tablets.length
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Keyboard className="w-5 h-5 text-purple-500" />
        Input Devices
      </h3>
      
      {total === 0 ? (
        <EmptyState icon={Keyboard} message="No input devices detected" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Keyboards
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {keyboards.map((kb, idx) => (
              <DeviceCard key={idx} title={kb.name || 'Keyboard'} icon={Keyboard} badge={kb.connectionType}>
                <div className="space-y-2 text-sm">
                  {kb.vendor && <InfoRow label="Vendor" value={kb.vendor} />}
                  {kb.isBuiltIn !== undefined && <InfoRow label="Type" value={kb.isBuiltIn ? 'Built-in' : 'External'} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {mice.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Mouse className="w-4 h-4" /> Mice
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mice.map((mouse, idx) => (
              <DeviceCard key={idx} title={mouse.name || 'Mouse'} icon={Mouse} badge={mouse.connectionType}>
                <div className="space-y-2 text-sm">
                  {mouse.vendor && <InfoRow label="Vendor" value={mouse.vendor} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {trackpads.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Hand className="w-4 h-4" /> Trackpads
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trackpads.map((tp, idx) => (
              <DeviceCard key={idx} title={tp.name || 'Trackpad'} badge={tp.connectionType}>
                <div className="space-y-2 text-sm">
                  {tp.isBuiltIn !== undefined && <InfoRow label="Type" value={tp.isBuiltIn ? 'Built-in' : 'External'} />}
                  {tp.supportsForcTouch !== undefined && <InfoRow label="Force Touch" value={tp.supportsForcTouch ? 'Yes' : 'No'} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {tablets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Tablet className="w-4 h-4" /> Graphics Tablets
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tablets.map((tablet, idx) => (
              <DeviceCard key={idx} title={tablet.name || 'Graphics Tablet'} icon={Tablet} badge={tablet.tabletType}>
                <div className="space-y-2 text-sm">
                  {tablet.vendor && <InfoRow label="Vendor" value={tablet.vendor} />}
                  {tablet.connectionType && <InfoRow label="Connection" value={tablet.connectionType} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Audio Devices Content (Output only)
const AudioDevicesContent = ({ devices }: { devices: AudioDevice[] }) => {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Volume2 className="w-5 h-5 text-green-500" />
        Audio Output
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'Audio Output'} icon={Speaker} badge={device.isDefault ? 'Default' : undefined}>
            <div className="space-y-2 text-sm">
              {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
              {device.isBuiltIn !== undefined && <InfoRow label="Type" value={device.isBuiltIn ? 'Built-in' : 'External'} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Microphones Content (NEW - Input audio devices)
const MicrophonesContent = ({ devices }: { devices: AudioDevice[] }) => {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Mic className="w-5 h-5 text-rose-500" />
        Microphones
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'Microphone'} icon={Mic} badge={device.isDefault ? 'Default' : undefined}>
            <div className="space-y-2 text-sm">
              {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
              {device.isBuiltIn !== undefined && <InfoRow label="Type" value={device.isBuiltIn ? 'Built-in' : 'External'} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Bluetooth Devices Content
const BluetoothDevicesContent = ({ devices }: { devices: BluetoothDevice[] }) => {

  const connected = devices.filter(d => d.isConnected)
  const paired = devices.filter(d => !d.isConnected)
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Bluetooth className="w-5 h-5 text-cyan-500" />
        Bluetooth Peripherals
      </h3>
      
      {connected.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" /> Connected
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {connected.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Bluetooth Device'} icon={Bluetooth} badge={<StatusBadge connected={true} />}>
                <div className="space-y-2 text-sm">
                  {device.deviceCategory && <InfoRow label="Category" value={device.deviceCategory} />}
                  {device.address && <InfoRow label="Address" value={device.address} />}
                  {device.batteryLevel !== undefined && <InfoRow label="Battery" value={`${device.batteryLevel}%`} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {paired.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Paired</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paired.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Bluetooth Device'} icon={Bluetooth} badge={<StatusBadge connected={false} />}>
                <div className="space-y-2 text-sm">
                  {device.deviceCategory && <InfoRow label="Category" value={device.deviceCategory} />}
                  {device.address && <InfoRow label="Address" value={device.address} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Printers Content - HIGH PRIORITY - Full width cards, default printer first
const PrintersContent = ({ devices }: { devices: PrinterDevice[] }) => {
  const [copiedUri, setCopiedUri] = useState<string | null>(null)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUri(text)
      setTimeout(() => setCopiedUri(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Sort to put default printer first
  const sortedPrinters = [...devices].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return 0
  })

  // Helper to get printer commands as string
  const _getCommandsString = (commands: string | string[] | undefined): string => {
    if (!commands) return ''
    if (typeof commands === 'string') return commands.trim()
    if (Array.isArray(commands)) return commands.filter(c => c).join(', ')
    return ''
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Printer className="w-5 h-5 text-orange-500" />
        Printers
      </h3>
      <div className="space-y-4">
        {sortedPrinters.map((device, idx) => (
          <DeviceCard 
            key={idx}
            badge={device.isDefault ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                Default
              </span>
            ) : undefined}
            fullWidth={true}
          >
            {/* Unified Printer Info */}
            <div className="space-y-3">
              {/* Printer Name - First field at top */}
              {device.name && (
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">{device.name}</span>
                </div>
              )}

              {/* Queue (Device URI) - code block with copy button */}
              {device.uri && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm block mb-1">Queue</span>
                  <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">{device.uri}</span>
                    <button
                      onClick={() => copyToClipboard(device.uri!)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Copy Queue"
                    >
                      {copiedUri === device.uri ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* PostScript Printer Description - code block with copy button */}
              {device.ppd && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm block mb-1">PostScript Printer Description</span>
                  <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">{device.ppd}</span>
                    <button
                      onClick={() => copyToClipboard(device.ppd!)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Copy PPD"
                    >
                      {copiedUri === device.ppd ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CUPS Filters - code blocks with copy buttons */}
              {device.cupsFilters && Array.isArray(device.cupsFilters) && device.cupsFilters.length > 0 && device.cupsFilters.some(f => f.name) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">CUPS Filters</h4>
                  <div className="space-y-2">
                    {device.cupsFilters.filter(f => f.name).map((filter, i) => (
                      <div key={i}>
                        <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{filter.name}</span>
                              {filter.version && <span className="text-gray-500 dark:text-gray-400 text-xs">v{filter.version}</span>}
                            </div>
                            {filter.path && (
                              <div className="text-gray-500 dark:text-gray-500 font-mono text-[10px] truncate max-w-xl" title={filter.path}>
                                {filter.path}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(filter.path || filter.name)}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title="Copy Filter Path"
                          >
                            {copiedUri === (filter.path || filter.name) ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two column grid - Manufacturer first */}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {/* Column A - Left */}
                <div className="space-y-2">
                  {(device.manufacturer || device.make) && (
                    <InfoRow label="Manufacturer" value={device.manufacturer || device.make || ''} />
                  )}
                  {device.model && <InfoRow label="Model" value={device.model} />}
                  {device.identifier && <InfoRow label="Identifier" value={device.identifier} />}
                  {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
                  {device.cupsVersion && <InfoRow label="CUPS Version" value={device.cupsVersion} />}
                </div>
                
                {/* Column B - Right */}
                <div className="space-y-2">
                  {device.status && <InfoRow label="Status" value={device.status} />}
                  {device.scanningSupport && <InfoRow label="Scanning" value={device.scanningSupport} />}
                  {device.faxSupport && <InfoRow label="Fax" value={device.faxSupport} />}
                </div>
              </div>

              {/* State Reasons (if any issues) */}
              {Array.isArray(device.stateReasons) && device.stateReasons.length > 0 && !device.stateReasons.includes('none') && device.stateReasons.filter(r => r && r !== 'none').length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">State Reasons</h4>
                  <div className="flex flex-wrap gap-2">
                    {device.stateReasons.filter(r => r && r !== 'none').map((reason, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Scanners Content
const ScannersContent = ({ devices }: { devices: ScannerDevice[] }) => {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <ScanLine className="w-5 h-5 text-indigo-500" />
        Scanners
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'Scanner'} icon={ScanLine} badge={device.scannerType}>
            <div className="space-y-2 text-sm">
              {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
              {device.status && <InfoRow label="Status" value={device.status} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// External Storage Content
const ExternalStorageContent = ({ devices }: { devices: ExternalStorageDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={HardDrive} message="No external storage detected" />
  }
  
  // Helper to get meaningful name from mount point
  const getStorageName = (device: ExternalStorageDevice) => {
    if (device.name && device.name !== 'External Storage') return device.name
    if (device.mountPoint) {
      if (device.mountPoint === '/') return 'System Drive'
      const parts = device.mountPoint.split('/')
      return parts[parts.length - 1] || 'External Storage'
    }
    return 'External Storage'
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-red-500" />
        External Storage
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={getStorageName(device)} icon={HardDrive} badge={device.storageType}>
            <div className="space-y-2 text-sm">
              {device.fileSystem && <InfoRow label="File System" value={device.fileSystem.toUpperCase()} />}
              {device.mountPoint && <InfoRow label="Mount Point" value={device.mountPoint} />}
              {device.devicePath && <InfoRow label="Device" value={device.devicePath} />}
              {device.totalSize && device.totalSize !== '' && <InfoRow label="Size" value={device.totalSize} />}
              {device.protocol && device.protocol !== '' && <InfoRow label="Protocol" value={device.protocol} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Helper Components
const InfoRow = ({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) => (
  <div className={`flex ${fullWidth ? 'flex-col gap-1' : 'items-center gap-4'}`}>
    <span className={`text-gray-500 dark:text-gray-400 ${fullWidth ? '' : 'w-28 flex-shrink-0'}`}>{label}</span>
    <span className={`text-gray-900 dark:text-gray-100 font-medium ${fullWidth ? 'break-all font-mono text-xs' : 'truncate'}`} title={value}>{value}</span>
  </div>
)

const EmptyState = ({ icon: Icon, message }: { icon: LucideIcon; message: string }) => (
  <div className="text-center py-12">
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
      <Icon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
)

export default PeripheralsTab
