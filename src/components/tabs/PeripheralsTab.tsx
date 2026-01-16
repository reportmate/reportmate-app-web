/**
 * Peripherals Tab Component
 * Comprehensive peripheral device information with sidebar navigation
 * 
 * Categories:
 * - USB Devices (hubs, storage, peripherals)
 * - Input Devices (keyboards, mice, trackpads, graphics tablets)
 * - Audio Devices (speakers, microphones, interfaces)
 * - Bluetooth Devices (paired and connected)
 * - Cameras (built-in and external)
 * - Thunderbolt Devices (docks, displays, storage)
 * - Printers (CUPS, network, direct-connect) - HIGH PRIORITY
 * - Scanners
 * - External Storage (USB drives, SD cards)
 * 
 * NOTE: Displays are part of the Hardware module, not Peripherals
 */

'use client'

import React, { useState, useMemo } from 'react'
import { 
  Usb, Keyboard, Volume2, Bluetooth, Camera, Zap, Printer, 
  ScanLine, HardDrive, Monitor, ChevronRight, Wifi, WifiOff,
  Mouse, Tablet, Speaker
} from 'lucide-react'

// Type definitions
interface USBDevice {
  name: string
  vendor?: string
  vendorId?: string
  productId?: string
  serialNumber?: string
  speed?: string
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
}

interface CameraDevice {
  name: string
  modelId?: string
  isBuiltIn?: boolean
  connectionType?: string
  deviceType?: string
}

interface ThunderboltDevice {
  name: string
  vendor?: string
  deviceId?: string
  uid?: string
  deviceType?: string
  connectionType?: string
}

interface PrinterDevice {
  name: string
  uri?: string
  connectionType?: string
  status?: string
  isDefault?: boolean
  pendingJobs?: number
  printerType?: string
  deviceType?: string
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
  cameras?: CameraDevice[]
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
}

// Sidebar category definition
interface Category {
  id: string
  name: string
  icon: React.ElementType
  count: number
  color: string
}

// Helper component for device cards
const DeviceCard = ({ 
  children, 
  title, 
  icon: Icon, 
  badge 
}: { 
  children: React.ReactNode
  title: string
  icon?: React.ElementType
  badge?: string | React.ReactNode
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h4>
      </div>
      {badge && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{badge}</span>
      )}
    </div>
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

export const PeripheralsTab: React.FC<PeripheralsTabProps> = ({ device }) => {
  const [activeCategory, setActiveCategory] = useState<string>('usb')
  
  // Extract peripherals data from device
  const peripherals: PeripheralsData = useMemo(() => {
    return device.peripherals || device.modules?.peripherals || {}
  }, [device])
  
  // Calculate counts for each category
  const categories: Category[] = useMemo(() => [
    { 
      id: 'usb', 
      name: 'USB Devices', 
      icon: Usb, 
      count: peripherals.usbDevices?.length || 0,
      color: 'text-blue-500'
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
      id: 'audio', 
      name: 'Audio', 
      icon: Volume2, 
      count: peripherals.audioDevices?.length || 0,
      color: 'text-green-500'
    },
    { 
      id: 'bluetooth', 
      name: 'Bluetooth', 
      icon: Bluetooth, 
      count: peripherals.bluetoothDevices?.length || 0,
      color: 'text-cyan-500'
    },
    { 
      id: 'cameras', 
      name: 'Cameras', 
      icon: Camera, 
      count: peripherals.cameras?.length || 0,
      color: 'text-pink-500'
    },
    { 
      id: 'thunderbolt', 
      name: 'Thunderbolt', 
      icon: Zap, 
      count: peripherals.thunderboltDevices?.length || 0,
      color: 'text-yellow-500'
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
      id: 'storage', 
      name: 'External Storage', 
      icon: HardDrive, 
      count: peripherals.externalStorage?.length || 0,
      color: 'text-red-500'
    },
  ], [peripherals])
  
  // Total device count
  const totalDevices = categories.reduce((sum, cat) => sum + cat.count, 0)
  
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
  
  // Render content based on active category
  const renderContent = () => {
    switch (activeCategory) {
      case 'usb':
        return <USBDevicesContent devices={peripherals.usbDevices || []} />
      case 'input':
        return <InputDevicesContent devices={peripherals.inputDevices || {}} />
      case 'audio':
        return <AudioDevicesContent devices={peripherals.audioDevices || []} />
      case 'bluetooth':
        return <BluetoothDevicesContent devices={peripherals.bluetoothDevices || []} />
      case 'cameras':
        return <CamerasContent devices={peripherals.cameras || []} />
      case 'thunderbolt':
        return <ThunderboltContent devices={peripherals.thunderboltDevices || []} />
      case 'printers':
        return <PrintersContent devices={peripherals.printers || []} />
      case 'scanners':
        return <ScannersContent devices={peripherals.scanners || []} />
      case 'storage':
        return <ExternalStorageContent devices={peripherals.externalStorage || []} />
      default:
        return null
    }
  }
  
  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar Navigation */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Categories</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{totalDevices} devices total</p>
          </div>
          <nav className="p-2">
            {categories.map((category) => {
              const isActive = activeCategory === category.id
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : category.color}`} />
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {category.count}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
                </button>
              )
            })}
          </nav>
        </div>
        
        {/* Collection timestamp */}
        {peripherals.collectedAt && (
          <div className="mt-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last collected: {new Date(peripherals.collectedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  )
}

// USB Devices Content
const USBDevicesContent = ({ devices }: { devices: USBDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Usb} message="No USB devices detected" />
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Usb className="w-5 h-5 text-blue-500" />
        USB Devices ({devices.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'Unknown USB Device'} icon={Usb} badge={device.deviceType}>
            <div className="space-y-2 text-sm">
              {device.vendor && <InfoRow label="Vendor" value={device.vendor} />}
              {device.vendorId && <InfoRow label="Vendor ID" value={device.vendorId} />}
              {device.productId && <InfoRow label="Product ID" value={device.productId} />}
              {device.serialNumber && <InfoRow label="Serial" value={device.serialNumber} />}
              {device.speed && <InfoRow label="Speed" value={device.speed} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Input Devices Content
const InputDevicesContent = ({ devices }: { devices: InputDevices }) => {
  const keyboards = devices.keyboards || []
  const mice = devices.mice || []
  const trackpads = devices.trackpads || []
  const tablets = devices.tablets || []
  
  const total = keyboards.length + mice.length + trackpads.length + tablets.length
  
  if (total === 0) {
    return <EmptyState icon={Keyboard} message="No input devices detected" />
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Keyboard className="w-5 h-5 text-purple-500" />
        Input Devices ({total})
      </h3>
      
      {keyboards.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Keyboards ({keyboards.length})
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
            <Mouse className="w-4 h-4" /> Mice ({mice.length})
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
            <Monitor className="w-4 h-4" /> Trackpads ({trackpads.length})
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
            <Tablet className="w-4 h-4" /> Graphics Tablets ({tablets.length})
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

// Audio Devices Content
const AudioDevicesContent = ({ devices }: { devices: AudioDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Volume2} message="No audio devices detected" />
  }
  
  const outputs = devices.filter(d => d.isOutput || d.type === 'Output')
  const inputs = devices.filter(d => d.isInput || d.type === 'Input')
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Volume2 className="w-5 h-5 text-green-500" />
        Audio Devices ({devices.length})
      </h3>
      
      {outputs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Speaker className="w-4 h-4" /> Output Devices ({outputs.length})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {outputs.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Audio Output'} icon={Speaker} badge={device.isDefault ? 'Default' : undefined}>
                <div className="space-y-2 text-sm">
                  {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
                  {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
                </div>
              </DeviceCard>
            ))}
          </div>
        </div>
      )}
      
      {inputs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Input Devices ({inputs.length})</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inputs.map((device, idx) => (
              <DeviceCard key={idx} title={device.name || 'Audio Input'} badge={device.isDefault ? 'Default' : undefined}>
                <div className="space-y-2 text-sm">
                  {device.manufacturer && <InfoRow label="Manufacturer" value={device.manufacturer} />}
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

// Bluetooth Devices Content
const BluetoothDevicesContent = ({ devices }: { devices: BluetoothDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Bluetooth} message="No Bluetooth devices detected" />
  }
  
  const connected = devices.filter(d => d.isConnected)
  const paired = devices.filter(d => !d.isConnected)
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Bluetooth className="w-5 h-5 text-cyan-500" />
        Bluetooth Devices ({devices.length})
      </h3>
      
      {connected.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" /> Connected ({connected.length})
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
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Paired ({paired.length})</h4>
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

// Cameras Content
const CamerasContent = ({ devices }: { devices: CameraDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Camera} message="No cameras detected" />
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Camera className="w-5 h-5 text-pink-500" />
        Cameras ({devices.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'Camera'} icon={Camera} badge={device.isBuiltIn ? 'Built-in' : 'External'}>
            <div className="space-y-2 text-sm">
              {device.modelId && <InfoRow label="Model ID" value={device.modelId} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Thunderbolt Content
const ThunderboltContent = ({ devices }: { devices: ThunderboltDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Zap} message="No Thunderbolt devices detected" />
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        Thunderbolt Devices ({devices.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
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
  )
}

// Printers Content - HIGH PRIORITY
const PrintersContent = ({ devices }: { devices: PrinterDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={Printer} message="No printers detected" />
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Printer className="w-5 h-5 text-orange-500" />
        Printers ({devices.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard 
            key={idx} 
            title={device.name || 'Printer'} 
            icon={Printer} 
            badge={device.isDefault ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                Default
              </span>
            ) : undefined}
          >
            <div className="space-y-2 text-sm">
              {device.printerType && <InfoRow label="Type" value={device.printerType} />}
              {device.connectionType && <InfoRow label="Connection" value={device.connectionType} />}
              {device.status && <InfoRow label="Status" value={device.status} />}
              {device.uri && <InfoRow label="URI" value={device.uri} />}
              {device.pendingJobs !== undefined && <InfoRow label="Pending Jobs" value={String(device.pendingJobs)} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Scanners Content
const ScannersContent = ({ devices }: { devices: ScannerDevice[] }) => {
  if (devices.length === 0) {
    return <EmptyState icon={ScanLine} message="No scanners detected" />
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <ScanLine className="w-5 h-5 text-indigo-500" />
        Scanners ({devices.length})
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
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-red-500" />
        External Storage ({devices.length})
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.map((device, idx) => (
          <DeviceCard key={idx} title={device.name || 'External Storage'} icon={HardDrive} badge={device.storageType}>
            <div className="space-y-2 text-sm">
              {device.totalSize && <InfoRow label="Size" value={device.totalSize} />}
              {device.fileSystem && <InfoRow label="File System" value={device.fileSystem} />}
              {device.mountPoint && <InfoRow label="Mount Point" value={device.mountPoint} />}
              {device.protocol && <InfoRow label="Protocol" value={device.protocol} />}
            </div>
          </DeviceCard>
        ))}
      </div>
    </div>
  )
}

// Helper Components
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[60%]" title={value}>{value}</span>
  </div>
)

const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="text-center py-12">
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
      <Icon className="h-6 w-6 text-gray-400 dark:text-gray-600" />
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
)

export default PeripheralsTab
