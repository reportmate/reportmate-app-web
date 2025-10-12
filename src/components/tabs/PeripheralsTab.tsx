/**
 * Peripherals Tab Component
 * Comprehensive peripheral device information including displays, printers, USB devices, input devices, and more
 */

import React, { useState } from 'react'
import { StatBlock, Stat, StatusBadge, Icons, WidgetColors } from '../widgets/shared'

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
    monitors?: DisplayDevice[]           // ONLY actual displays/monitors
    currentSettings?: any[]
    drivers?: any[]
    display_settings?: any
  }
  printers?: {
    installed_printers?: PrinterDevice[]  // API structure
    installedPrinters?: PrinterDevice[]   // Legacy structure
    registryPrinters?: PrinterDevice[]
    print_queues?: any[]
    printer_drivers?: any[]
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
  summary?: {
    total_displays?: number
    total_printers?: number
    total_keyboards?: number
    total_mice?: number
    total_peripherals?: number
    total_usb_devices?: number
    total_audio_devices?: number
    total_storage_devices?: number
    total_bluetooth_devices?: number
    total_cameras?: number
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
    displays?: any
    printers?: any
    [key: string]: any
  }
}

interface PeripheralsTabProps {
  device: Device
}

export const PeripheralsTab: React.FC<PeripheralsTabProps> = ({ device }) => {
  const [activeSection, setActiveSection] = useState<string>('all')

  // STANDARDIZED: Access peripherals data only from nested modules structure
  const peripheralsData = device.modules?.peripherals
  
  // Get displays and printers data from the modules structure only
  const displaysModule = device.modules?.displays
  const printersModule = device.modules?.printers

  console.log('PeripheralsTab Debug - STANDARDIZED ACCESS:', {
    hasModules: !!device.modules,
    moduleKeys: device.modules ? Object.keys(device.modules) : [],
    hasDisplaysModule: !!displaysModule,
    hasPrintersModule: !!printersModule,
    hasPeripheralsData: !!peripheralsData,
    displaysModuleKeys: displaysModule ? Object.keys(displaysModule) : [],
    printersModuleKeys: printersModule ? Object.keys(printersModule) : [],
    displaysModulePreview: displaysModule ? JSON.stringify(displaysModule).substring(0, 200) : 'No displays module',
    printersModulePreview: printersModule ? JSON.stringify(printersModule).substring(0, 200) : 'No printers module',
    peripheralsDisplays: peripheralsData?.displays ? Object.keys(peripheralsData.displays) : 'No peripherals displays',
    monitorsCount: peripheralsData?.displays?.monitors?.length || 0
  })

  // IMPORTANT: Get actual displays/monitors ONLY (graphics cards have been removed from peripherals)
  // Graphics cards now belong in hardware module where they should be
  const displayDevices = displaysModule?.displays || 
                         displaysModule?.monitors ||
                         peripheralsData?.displays?.monitors ||  // Actual monitor devices only
                         (peripheralsData?.displays as any)?.externalMonitors || []
  
  const hasDisplays = displayDevices.length > 0

  // STANDARDIZED: Combine and process printer data only from modules
  const printerDevices = peripheralsData?.printers?.installed_printers || 
                         peripheralsData?.printers?.installedPrinters || 
                         printersModule?.installedPrinters ||
                         printersModule?.printers || []
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

  // Section navigation - removing graphics cards from peripherals
  const sections = [
    { id: 'displays', name: 'Displays', icon: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zM5 20h14', count: displayDevices.length },
    { id: 'printers', name: 'Printers', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', count: printerDevices.length },
    { id: 'usb', name: 'USB Devices', icon: 'M8.8 3.2h6.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1zM8.8 7.2h6.4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zM10.4 17.2h3.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z', count: usbDevices.length },
    { id: 'input', name: 'Input Devices', icon: 'M6 6h12a3 3 0 013 3v6a3 3 0 01-3 3H6a3 3 0 01-3-3V9a3 3 0 013-3zM9 10h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2a1 1 0 011-1z', count: inputDevices.length },
    { id: 'audio', name: 'Audio Devices', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5 7v8a1 1 0 001 1h3l4 4V2L9 6H6a1 1 0 00-1 1z', count: audioDevices.length },
    { id: 'bluetooth', name: 'Bluetooth', icon: 'M12 3l6 5-6 4.5 6 4.5-6 5v-9.5L6 8l6 4.5L6 17l6-4.5V3z', count: bluetoothDevices.length },
    { id: 'cameras', name: 'Cameras', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z', count: cameraDevices.length },
    { id: 'storage', name: 'Storage', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z', count: storageDevices.length }
  ]

  if (!hasPeripheralData) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
          <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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

  // Display Devices Section (actual monitors/displays)
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
          {(displayDevices as any[]).filter((d: any) => d.isPrimary).length > 0 && (
            <Stat label="Primary Displays" value={(displayDevices as any[]).filter((d: any) => d.isPrimary).length.toString()} />
          )}
          {(displayDevices as any[]).filter((d: any) => !d.isBuiltIn).length > 0 && (
            <Stat label="External Displays" value={(displayDevices as any[]).filter((d: any) => !d.isBuiltIn).length.toString()} />
          )}
        </StatBlock>
      </div>

      {displayDevices.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Display Devices</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {(displayDevices as any[]).map((display: any, index: number) => (
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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Display Devices</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Display Devices Detected
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                No monitor or display device information is currently available. This could mean:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>The display module hasn&apos;t collected monitor data yet</li>
                <li>Display detection may need Windows client updates</li>
                <li>Check the Hardware tab for graphics card information</li>
              </ul>
            </div>
          </div>
        </div>
      )}
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
          {(printerDevices as any[]).filter((p: any) => p.isOnline).length > 0 && (
            <Stat label="Online Printers" value={(printerDevices as any[]).filter((p: any) => p.isOnline).length.toString()} />
          )}
          {(printerDevices as any[]).filter((p: any) => p.isShared).length > 0 && (
            <Stat label="Shared Printers" value={(printerDevices as any[]).filter((p: any) => p.isShared).length.toString()} />
          )}
          {printersModule?.activePrintJobs !== undefined && (
            <Stat label="Active Print Jobs" value={printersModule.activePrintJobs.toString()} />
          )}
        </StatBlock>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Printer Devices</h3>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {(printerDevices as any[]).map((printer: any, index: number) => (
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

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    displays: renderDisplaysSection,
    printers: renderPrintersSection,
    usb: renderUsbSection,
    input: renderInputSection,
    audio: renderAudioSection,
    bluetooth: renderBluetoothSection,
    cameras: renderCamerasSection,
    storage: renderStorageSection
  }

  const renderActiveSectionContent = () => {
    if (activeSection === 'all') {
      return (
        <>
          {displayDevices.length > 0 && renderDisplaysSection()}
          {printerDevices.length > 0 && renderPrintersSection()}
          {usbDevices.length > 0 && renderUsbSection()}
          {inputDevices.length > 0 && renderInputSection()}
          {audioDevices.length > 0 && renderAudioSection()}
          {bluetoothDevices.length > 0 && renderBluetoothSection()}
          {cameraDevices.length > 0 && renderCamerasSection()}
          {storageDevices.length > 0 && renderStorageSection()}
        </>
      )
    }

    const renderer = sectionRenderers[activeSection]
    return renderer ? renderer() : null
  }

  // Combine all peripheral devices into a single table data structure
  const getAllPeripheralDevices = () => {
    const allDevices: Array<{
      id: string;
      name: string;
      type: string;
      category: string;
      manufacturer?: string;
      model?: string;
      status?: string;
      connection?: string;
      details: Array<{ label: string; value: string }>;
    }> = [];

    // Add displays
    (displayDevices as any[]).forEach((device, index) => {
      const details = [];
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.model) details.push({ label: 'Model', value: device.model });
      if (device.resolution) details.push({ label: 'Resolution', value: device.resolution });
      if (device.refreshRate) details.push({ label: 'Refresh Rate', value: `${device.refreshRate} Hz` });
      if (device.connectionType) details.push({ label: 'Connection', value: device.connectionType });
      if (device.driverVersion) details.push({ label: 'Driver Version', value: device.driverVersion });

      allDevices.push({
        id: `display-${index}`,
        name: device.name || `Display ${index + 1}`,
        type: device.isPrimary ? 'Primary Display' : 'Display',
        category: 'displays',
        manufacturer: device.manufacturer,
        model: device.model,
        status: 'Active',
        connection: device.connectionType,
        details
      });
    });

    // Add printers
    (printerDevices as any[]).forEach((device, index) => {
      const details = [];
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.model) details.push({ label: 'Model', value: device.model });
      if (device.driverName) details.push({ label: 'Driver', value: device.driverName });
      if (device.portName) details.push({ label: 'Port', value: device.portName });
      if (device.location) details.push({ label: 'Location', value: device.location });
      if (device.connectionType) details.push({ label: 'Connection', value: device.connectionType });

      allDevices.push({
        id: `printer-${index}`,
        name: device.name,
        type: device.isDefault ? 'Default Printer' : 'Printer',
        category: 'printers',
        manufacturer: device.manufacturer,
        model: device.model,
        status: device.isOnline ? 'Online' : 'Offline',
        connection: device.connectionType || device.portName,
        details
      });
    });

    // Add USB devices
    usbDevices.forEach((device, index) => {
      const details = [];
      if (device.vendor) details.push({ label: 'Vendor', value: device.vendor });
      if (device.vendorId) details.push({ label: 'Vendor ID', value: device.vendorId });
      if (device.productId) details.push({ label: 'Product ID', value: device.productId });
      if (device.class) details.push({ label: 'Class', value: device.class });
      if (device.serial) details.push({ label: 'Serial', value: device.serial });

      allDevices.push({
        id: `usb-${index}`,
        name: device.model || device.vendor || `USB Device ${index + 1}`,
        type: device.removable ? 'Removable USB' : 'USB Device',
        category: 'usb',
        manufacturer: device.vendor,
        model: device.model,
        status: 'Connected',
        connection: 'USB',
        details
      });
    });

    // Add input devices
    inputDevices.forEach((device, index) => {
      const details = [];
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.deviceType) details.push({ label: 'Type', value: device.deviceType });
      if (device.interface) details.push({ label: 'Interface', value: device.interface });
      if (device.description) details.push({ label: 'Description', value: device.description });

      allDevices.push({
        id: `input-${index}`,
        name: device.name || `Input Device ${index + 1}`,
        type: device.deviceType || 'Input Device',
        category: 'input',
        manufacturer: device.manufacturer,
        model: (device as any).model,
        status: device.enabled ? 'Enabled' : 'Disabled',
        connection: device.interface,
        details
      });
    });

    // Add audio devices
    audioDevices.forEach((device, index) => {
      const details = [];
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.type) details.push({ label: 'Type', value: device.type });
      if (device.connectionType) details.push({ label: 'Connection', value: device.connectionType });
      if (device.description) details.push({ label: 'Description', value: device.description });

      allDevices.push({
        id: `audio-${index}`,
        name: device.name || `Audio Device ${index + 1}`,
        type: device.type || 'Audio Device',
        category: 'audio',
        manufacturer: device.manufacturer,
        model: (device as any).model,
        status: device.enabled ? 'Enabled' : 'Disabled',
        connection: device.connectionType,
        details
      });
    });

    // Add bluetooth devices
    bluetoothDevices.forEach((device, index) => {
      const details = [];
      if (device.address) details.push({ label: 'Address', value: device.address });
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.type) details.push({ label: 'Type', value: device.type });

      allDevices.push({
        id: `bluetooth-${index}`,
        name: device.name || `Bluetooth Device ${index + 1}`,
        type: device.type || 'Bluetooth Device',
        category: 'bluetooth',
        manufacturer: device.manufacturer,
        model: (device as any).model,
        status: device.connected ? 'Connected' : (device.paired ? 'Paired' : 'Disconnected'),
        connection: 'Bluetooth',
        details
      });
    });

    // Add camera devices
    cameraDevices.forEach((device, index) => {
      const details = [];
      if (device.manufacturer) details.push({ label: 'Manufacturer', value: device.manufacturer });
      if (device.model) details.push({ label: 'Model', value: device.model });
      if (device.resolution) details.push({ label: 'Resolution', value: device.resolution });

      allDevices.push({
        id: `camera-${index}`,
        name: device.name || `Camera ${index + 1}`,
        type: 'Camera',
        category: 'cameras',
        manufacturer: device.manufacturer,
        model: device.model,
        status: device.enabled ? 'Enabled' : 'Disabled',
        connection: 'USB',
        details
      });
    });

    // Add storage devices
    storageDevices.forEach((device, index) => {
      const details = [];
      if (device.type) details.push({ label: 'Type', value: device.type });
      if (device.size) details.push({ label: 'Size', value: device.size });
      if (device.interface) details.push({ label: 'Interface', value: device.interface });
      if (device.model) details.push({ label: 'Model', value: device.model });
      if (device.serial) details.push({ label: 'Serial', value: device.serial });

      allDevices.push({
        id: `storage-${index}`,
        name: device.name || `Storage Device ${index + 1}`,
        type: device.type || 'Storage Device',
        category: 'storage',
        manufacturer: (device as any).manufacturer,
        model: device.model,
        status: 'Connected',
        connection: device.interface,
        details
      });
    });

    return allDevices;
  };

  const allPeripheralDevices = getAllPeripheralDevices();

  // Filter devices based on active section
  const filteredDevices = activeSection === 'all' 
    ? allPeripheralDevices 
    : allPeripheralDevices.filter(device => device.category === activeSection);

  // Update sections to include 'all' option
  const enhancedSections = [
    { id: 'all', name: 'All', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', count: allPeripheralDevices.length },
    ...sections
  ];

  return (
    <div className="space-y-6">
      {/* Section Navigation - Keep the awesome filter buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-2">
            {enhancedSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={section.count === 0 && section.id !== 'all'}
              >
                <svg className={`w-5 h-5 mb-1 ${section.count === 0 && section.id !== 'all' ? 'opacity-50' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                </svg>
                <span className={`text-xs font-medium ${section.count === 0 && section.id !== 'all' ? 'opacity-50' : ''}`}>
                  {section.name}
                </span>
                <span className={`text-xs ${activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} ${section.count === 0 && section.id !== 'all' ? 'opacity-50' : ''}`}>
                  {section.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

        {/* Detailed Section Views */}
        <div className="space-y-6">
          {renderActiveSectionContent()}
        </div>

      {/* Combined Peripheral Devices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {activeSection === 'all' ? 'All Peripheral Devices' : `${sections.find(s => s.id === activeSection)?.name || 'Peripheral Devices'}`}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Connection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          device.category === 'displays' ? 'bg-indigo-100 dark:bg-indigo-900' :
                          device.category === 'printers' ? 'bg-green-100 dark:bg-green-900' :
                          device.category === 'usb' ? 'bg-blue-100 dark:bg-blue-900' :
                          device.category === 'input' ? 'bg-purple-100 dark:bg-purple-900' :
                          device.category === 'audio' ? 'bg-orange-100 dark:bg-orange-900' :
                          device.category === 'bluetooth' ? 'bg-pink-100 dark:bg-pink-900' :
                          device.category === 'cameras' ? 'bg-yellow-100 dark:bg-yellow-900' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            device.category === 'displays' ? 'text-indigo-600 dark:text-indigo-400' :
                            device.category === 'printers' ? 'text-green-600 dark:text-green-400' :
                            device.category === 'usb' ? 'text-blue-600 dark:text-blue-400' :
                            device.category === 'input' ? 'text-purple-600 dark:text-purple-400' :
                            device.category === 'audio' ? 'text-orange-600 dark:text-orange-400' :
                            device.category === 'bluetooth' ? 'text-pink-600 dark:text-pink-400' :
                            device.category === 'cameras' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                              sections.find(s => s.id === device.category)?.icon || 'M4 6h16M4 10h16M4 14h16M4 18h16'
                            } />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {device.name}
                        </div>
                        {device.manufacturer && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {device.manufacturer} {device.model && `• ${device.model}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {device.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      device.status === 'Active' || device.status === 'Online' || device.status === 'Enabled' || device.status === 'Connected' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : device.status === 'Paired' 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {device.connection || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {device.details.length > 0 ? (
                      <div className="space-y-1">
                        {device.details.slice(0, 2).map((detail, index) => (
                          <div key={index}>
                            <span className="font-medium">{detail.label}:</span> {detail.value}
                          </div>
                        ))}
                        {device.details.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{device.details.length - 2} more
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDevices.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                No {activeSection === 'all' ? 'peripheral' : sections.find(s => s.id === activeSection)?.name.toLowerCase()} devices found
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

}

export default PeripheralsTab
