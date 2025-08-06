/**
 * Peripherals Tab Component
 * Comprehensive peripheral device information including displays, printers, USB devices, input devices, and more
 */

import React, { useState } from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from '../widgets/shared'

// Interface definitions for all peripheral device types
interface DisplayDevice {
  name?: string
  model?: string
  manufacturer?: string
  resolution?: string
  refreshRate?: string
  connectionType?: string
  isPrimary?: boolean
  isBuiltIn?: boolean
  driverVersion?: string
  driverDate?: string
}

interface PrinterDevice {
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
  connectionType?: string
  ipAddress?: string
  serverName?: string
  manufacturer?: string
  model?: string
}

interface UsbDevice {
  vendorId?: string
  productId?: string
  vendor?: string
  model?: string
  version?: string
  serial?: string
  class?: string
  subclass?: string
  protocol?: string
  removable?: boolean
}

interface InputDevice {
  name?: string
  manufacturer?: string
  description?: string
  deviceType?: string
  interface?: string
  enabled?: boolean
}

interface AudioDevice {
  name?: string
  manufacturer?: string
  description?: string
  enabled?: boolean
  type?: string
  connectionType?: string
}

interface BluetoothDevice {
  name?: string
  address?: string
  connected?: boolean
  paired?: boolean
  type?: string
  manufacturer?: string
}

interface CameraDevice {
  name?: string
  manufacturer?: string
  model?: string
  enabled?: boolean
  resolution?: string
}

interface StorageDevice {
  name?: string
  type?: string
  size?: string
  interface?: string
  model?: string
  serial?: string
}

interface PeripheralsData {
  displays?: {
    videoInfo?: DisplayDevice[]
    monitors?: DisplayDevice[]
    currentSettings?: any[]
  }
  printers?: {
    installedPrinters?: PrinterDevice[]
    registryPrinters?: PrinterDevice[]
  }
  usbDevices?: {
    devices?: UsbDevice[]
  }
  inputDevices?: {
    devices?: InputDevice[]
  }
  audioDevices?: {
    devices?: AudioDevice[]
  }
  bluetoothDevices?: {
    devices?: BluetoothDevice[]
  }
  cameraDevices?: {
    devices?: CameraDevice[]
  }
  storageDevices?: {
    devices?: StorageDevice[]
  }
}

interface Device {
  id: string
  name: string
  // Legacy display/printer data for backward compatibility
  displays?: {
    totalDisplays?: number
    displays: DisplayDevice[]
  }
  printers?: {
    totalPrinters?: number
    printers: PrinterDevice[]
    activePrintJobs?: number
  }
  // Modular peripherals data
  peripherals?: PeripheralsData
  modules?: {
    peripherals?: PeripheralsData
  }
}

interface PeripheralsTabProps {
  device: Device
  data?: any
}

export const PeripheralsTab: React.FC<PeripheralsTabProps> = ({ device, data }) => {
  const [activeSection, setActiveSection] = useState<string>('displays')

  // Access peripherals data from multiple sources (modular structure, direct peripherals, legacy)
  const peripheralsData = device.modules?.peripherals || device.peripherals
  const legacyDisplays = device.displays
  const legacyPrinters = device.printers

  // Combine and process display data
  const displayDevices = peripheralsData?.displays?.videoInfo || peripheralsData?.displays?.monitors || legacyDisplays?.displays || []
  const hasDisplays = displayDevices.length > 0

  // Combine and process printer data
  const printerDevices = peripheralsData?.printers?.installedPrinters || legacyPrinters?.printers || []
  const hasPrinters = printerDevices.length > 0

  // Process other peripheral devices
  const usbDevices = peripheralsData?.usbDevices?.devices || []
  const inputDevices = peripheralsData?.inputDevices?.devices || []
  const audioDevices = peripheralsData?.audioDevices?.devices || []
  const bluetoothDevices = peripheralsData?.bluetoothDevices?.devices || []
  const cameraDevices = peripheralsData?.cameraDevices?.devices || []
  const storageDevices = peripheralsData?.storageDevices?.devices || []

  const hasPeripheralData = hasDisplays || hasPrinters || usbDevices.length > 0 || 
                           inputDevices.length > 0 || audioDevices.length > 0 || 
                           bluetoothDevices.length > 0 || cameraDevices.length > 0 || 
                           storageDevices.length > 0

  // Section navigation
  const sections = [
    { id: 'displays', name: 'Displays', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', count: displayDevices.length },
    { id: 'printers', name: 'Printers', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', count: printerDevices.length },
    { id: 'usb', name: 'USB Devices', icon: 'M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2M7 4a1 1 0 00-1 1v4a1 1 0 001 1h6a1 1 0 001-1V5a1 1 0 00-1-1M7 4h6M5 21h10a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2z', count: usbDevices.length },
    { id: 'input', name: 'Input Devices', icon: 'M12 19l9-7-9-7-9 7 9 7z', count: inputDevices.length },
    { id: 'audio', name: 'Audio Devices', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 7v8a1 1 0 001 1h3l4 4V2L9 6H6a1 1 0 00-1 1z', count: audioDevices.length },
    { id: 'bluetooth', name: 'Bluetooth', icon: 'M8 10v1.414L9.414 10 8 8.586 8 10zm0 4V12.586L6.586 14 8 14zm8-4V8.586L14.586 10 16 11.414 16 10zm0 4v1.414L14.586 14 16 12.586 16 14z', count: bluetoothDevices.length },
    { id: 'cameras', name: 'Cameras', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z', count: cameraDevices.length },
    { id: 'storage', name: 'Storage', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z', count: storageDevices.length }
  ]

  if (!hasPeripheralData) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Peripheral Data Available
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Peripheral device information has not been collected for this device yet.
        </p>
      </div>
    )
  }

  // Display Devices Section
  const renderDisplaysSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Display Overview" 
          subtitle="Connected displays and monitors"
          icon={Icons.display}
          iconColor={WidgetColors.indigo}
        >
          <Stat label="Total Displays" value={displayDevices.length.toString()} />
          {displayDevices.filter(d => d.isPrimary).length > 0 && (
            <Stat label="Primary Displays" value={displayDevices.filter(d => d.isPrimary).length.toString()} />
          )}
          {displayDevices.filter(d => !d.isBuiltIn).length > 0 && (
            <Stat label="External Displays" value={displayDevices.filter(d => !d.isBuiltIn).length.toString()} />
          )}
        </StatBlock>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Display Devices</h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {displayDevices.map((display, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {display.name || `Display ${index + 1}`}
                  </h4>
                  {display.isPrimary && (
                    <StatusBadge label="Primary" status="primary" type="info" />
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {display.manufacturer && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.manufacturer}</span>
                    </div>
                  )}
                  {display.model && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.model}</span>
                    </div>
                  )}
                  {display.resolution && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Resolution:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.resolution}</span>
                    </div>
                  )}
                  {display.refreshRate && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Refresh Rate:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.refreshRate} Hz</span>
                    </div>
                  )}
                  {display.connectionType && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Connection:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.connectionType}</span>
                    </div>
                  )}
                  {display.driverVersion && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Driver Version:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{display.driverVersion}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Printers Section
  const renderPrintersSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Printer Overview" 
          subtitle="Installed printers and print queues"
          icon={Icons.printers}
          iconColor={WidgetColors.green}
        >
          <Stat label="Total Printers" value={printerDevices.length.toString()} />
          {printerDevices.filter(p => p.isOnline).length > 0 && (
            <Stat label="Online Printers" value={printerDevices.filter(p => p.isOnline).length.toString()} />
          )}
          {printerDevices.filter(p => p.isShared).length > 0 && (
            <Stat label="Shared Printers" value={printerDevices.filter(p => p.isShared).length.toString()} />
          )}
          {legacyPrinters?.activePrintJobs !== undefined && (
            <Stat label="Active Print Jobs" value={legacyPrinters.activePrintJobs.toString()} />
          )}
        </StatBlock>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Printer Devices</h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {printerDevices.map((printer, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {printer.name}
                  </h4>
                  <div className="flex gap-2">
                    {printer.isDefault && <StatusBadge label="Default" status="default" type="info" />}
                    {printer.isOnline ? (
                      <StatusBadge label="Online" status="online" type="success" />
                    ) : (
                      <StatusBadge label="Offline" status="offline" type="error" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {printer.manufacturer && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.manufacturer}</span>
                    </div>
                  )}
                  {printer.model && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.model}</span>
                    </div>
                  )}
                  {printer.driverName && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Driver:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.driverName}</span>
                    </div>
                  )}
                  {printer.connectionType && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Connection:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.connectionType}</span>
                    </div>
                  )}
                  {printer.portName && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Port:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.portName}</span>
                    </div>
                  )}
                  {printer.location && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Location:</span>
                      <br />
                      <span className="text-gray-900 dark:text-gray-100">{printer.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // USB Devices Section
  const renderUsbSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="USB Overview" 
          subtitle="Connected USB devices"
          icon={Icons.usb}
          iconColor={WidgetColors.blue}
        >
          <Stat label="Total USB Devices" value={usbDevices.length.toString()} />
          {usbDevices.filter(d => d.removable).length > 0 && (
            <Stat label="Removable Devices" value={usbDevices.filter(d => d.removable).length.toString()} />
          )}
        </StatBlock>
      </div>

      {usbDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">USB Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {usbDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {device.model || device.vendor || `USB Device ${index + 1}`}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.vendor && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Vendor:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.vendor}</span>
                      </div>
                    )}
                    {device.vendorId && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Vendor ID:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.vendorId}</span>
                      </div>
                    )}
                    {device.productId && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Product ID:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.productId}</span>
                      </div>
                    )}
                    {device.class && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Class:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.class}</span>
                      </div>
                    )}
                    {device.serial && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Serial:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.serial}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Input Devices Section
  const renderInputSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Input Overview" 
          subtitle="Keyboards, mice, and input devices"
          icon={Icons.input}
          iconColor={WidgetColors.purple}
        >
          <Stat label="Total Input Devices" value={inputDevices.length.toString()} />
          {inputDevices.filter(d => d.enabled).length > 0 && (
            <Stat label="Enabled Devices" value={inputDevices.filter(d => d.enabled).length.toString()} />
          )}
        </StatBlock>
      </div>

      {inputDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Input Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {inputDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {device.name || `Input Device ${index + 1}`}
                    </h4>
                    {device.enabled && <StatusBadge label="Enabled" status="enabled" type="success" />}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.manufacturer && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.manufacturer}</span>
                      </div>
                    )}
                    {device.deviceType && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.deviceType}</span>
                      </div>
                    )}
                    {device.interface && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Interface:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.interface}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Audio Devices Section
  const renderAudioSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Audio Overview" 
          subtitle="Sound and audio devices"
          icon={Icons.audio}
          iconColor={WidgetColors.orange}
        >
          <Stat label="Total Audio Devices" value={audioDevices.length.toString()} />
          {audioDevices.filter(d => d.enabled).length > 0 && (
            <Stat label="Enabled Devices" value={audioDevices.filter(d => d.enabled).length.toString()} />
          )}
        </StatBlock>
      </div>

      {audioDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Audio Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {audioDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {device.name || `Audio Device ${index + 1}`}
                    </h4>
                    {device.enabled && <StatusBadge label="Enabled" status="enabled" type="success" />}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.manufacturer && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.manufacturer}</span>
                      </div>
                    )}
                    {device.type && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.type}</span>
                      </div>
                    )}
                    {device.connectionType && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Connection:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.connectionType}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Bluetooth Devices Section
  const renderBluetoothSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Bluetooth Overview" 
          subtitle="Bluetooth and wireless devices"
          icon={Icons.bluetooth}
          iconColor={WidgetColors.blue}
        >
          <Stat label="Total Bluetooth Devices" value={bluetoothDevices.length.toString()} />
          {bluetoothDevices.filter(d => d.connected).length > 0 && (
            <Stat label="Connected Devices" value={bluetoothDevices.filter(d => d.connected).length.toString()} />
          )}
          {bluetoothDevices.filter(d => d.paired).length > 0 && (
            <Stat label="Paired Devices" value={bluetoothDevices.filter(d => d.paired).length.toString()} />
          )}
        </StatBlock>
      </div>

      {bluetoothDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bluetooth Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {bluetoothDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {device.name || `Bluetooth Device ${index + 1}`}
                    </h4>
                    <div className="flex gap-2">
                      {device.connected && <StatusBadge label="Connected" status="connected" type="success" />}
                      {device.paired && <StatusBadge label="Paired" status="paired" type="info" />}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.address && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Address:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.address}</span>
                      </div>
                    )}
                    {device.type && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.type}</span>
                      </div>
                    )}
                    {device.manufacturer && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.manufacturer}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Camera Devices Section
  const renderCamerasSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Camera Overview" 
          subtitle="Video and imaging devices"
          icon={Icons.camera}
          iconColor={WidgetColors.pink}
        >
          <Stat label="Total Cameras" value={cameraDevices.length.toString()} />
          {cameraDevices.filter(d => d.enabled).length > 0 && (
            <Stat label="Enabled Cameras" value={cameraDevices.filter(d => d.enabled).length.toString()} />
          )}
        </StatBlock>
      </div>

      {cameraDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Camera Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {cameraDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {device.name || `Camera ${index + 1}`}
                    </h4>
                    {device.enabled && <StatusBadge label="Enabled" status="enabled" type="success" />}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.manufacturer && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.manufacturer}</span>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.model}</span>
                      </div>
                    )}
                    {device.resolution && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Resolution:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.resolution}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Storage Devices Section
  const renderStorageSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <StatBlock 
          title="Storage Overview" 
          subtitle="External and removable storage"
          icon={Icons.storage}
          iconColor={WidgetColors.gray}
        >
          <Stat label="Total Storage Devices" value={storageDevices.length.toString()} />
        </StatBlock>
      </div>

      {storageDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Storage Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {storageDevices.map((device, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {device.name || `Storage Device ${index + 1}`}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {device.type && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.type}</span>
                      </div>
                    )}
                    {device.size && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Size:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.size}</span>
                      </div>
                    )}
                    {device.interface && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Interface:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.interface}</span>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Model:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.model}</span>
                      </div>
                    )}
                    {device.serial && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Serial:</span>
                        <br />
                        <span className="text-gray-900 dark:text-gray-100">{device.serial}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'displays': return renderDisplaysSection()
      case 'printers': return renderPrintersSection()
      case 'usb': return renderUsbSection()
      case 'input': return renderInputSection()
      case 'audio': return renderAudioSection()
      case 'bluetooth': return renderBluetoothSection()
      case 'cameras': return renderCamerasSection()
      case 'storage': return renderStorageSection()
      default: return renderDisplaysSection()
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Peripheral Devices</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive view of all connected peripheral devices
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={section.count === 0}
              >
                <svg className={`w-5 h-5 mb-1 ${section.count === 0 ? 'opacity-50' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                </svg>
                <span className={`text-xs font-medium ${section.count === 0 ? 'opacity-50' : ''}`}>
                  {section.name}
                </span>
                <span className={`text-xs ${activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} ${section.count === 0 ? 'opacity-50' : ''}`}>
                  {section.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Section Content */}
      {renderActiveSection()}
    </div>
  )
}

export default PeripheralsTab
