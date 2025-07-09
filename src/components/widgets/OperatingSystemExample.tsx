/**
 * Example usage of the OperatingSystem Widget
 * This shows how to integrate the granular OS widget into device pages
 */

import React from 'react'
import { OperatingSystemWidget } from './OperatingSystem'

// Example device data with granular OS information
const exampleDevice = {
  id: "0F33V9G25083HJ",
  name: "RODCHRISTIANSEN",
  // Legacy format (fallback)
  os: "Windows 11 Enterprise 24H2 (Build 26100.4349)",
  architecture: "arm64",
  // Granular OS fields (preferred)
  osName: "Windows 11 Enterprise",
  osVersion: "24H2", 
  osBuild: "26100.4349",
  osArchitecture: "arm64"
}

// Usage in a device details page or component
export function DeviceDetailsExample() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Device Details</h1>
      
      {/* Operating System Widget */}
      <OperatingSystemWidget device={exampleDevice} />
      
      {/* Other device widgets would go here */}
    </div>
  )
}

// Usage in the existing DeviceInfoModule
export function EnhancedDeviceInfoModule({ device }: { device: any }) {
  return (
    <div className="space-y-6">
      {/* Basic device info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* ... existing basic info ... */}
      </div>

      {/* Enhanced Operating System Widget */}
      <OperatingSystemWidget device={device} />
      
      {/* Other sections */}
    </div>
  )
}

export default DeviceDetailsExample
