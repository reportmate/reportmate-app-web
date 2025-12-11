/**
 * Peripherals Tab Component
 * Comprehensive peripheral device information including displays, printers, USB devices, input devices, and more
 * 
 * NOTE: This module is currently under construction. The full implementation with displays, printers,
 * USB devices, input devices, audio devices, bluetooth devices, cameras, and storage devices
 * will be enabled once the peripherals data collection is ready in the Windows client.
 */

import React from 'react'

// Interface definitions for peripheral device types (for future use)
interface DisplayDevice {
  name?: string
  model?: string
  manufacturer?: string
  resolution?: string
  refreshRate?: string
  connectionType?: string
  isPrimary?: boolean
  isBuiltIn?: boolean
}

interface PrinterDevice {
  name: string
  driverName?: string
  portName?: string
  status?: string
  isDefault?: boolean
  isOnline?: boolean
}

interface Device {
  id: string
  name: string
  modules?: {
    peripherals?: unknown
    displays?: unknown
    printers?: unknown
    [key: string]: unknown
  }
}

interface PeripheralsTabProps {
  device: Device
}

export const PeripheralsTab: React.FC<PeripheralsTabProps> = ({ device: _device }) => {
  // Under Construction - Peripherals module is not yet implemented
  return (
    <div className="text-center py-16">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
        <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Under Construction
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
        The Peripherals module is currently being developed. This will include information about displays, printers, USB devices, audio devices, and other connected peripherals.
      </p>
      <div className="inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Coming Soon
      </div>
    </div>
  )
}

export default PeripheralsTab
