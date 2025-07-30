/**
 * Hardware Tab Component
 * Displays device hardware information and specifications
 */

import React from 'react'

interface HardwareTabProps {
  device: any
  data?: any
}

// Helper function to safely render any value as a string
const safeString = (value: any): string => {
  if (value === null || value === undefined) return 'Unknown'
  if (typeof value === 'object') {
    // If it's an object, try to extract meaningful properties
    if (value.name) return String(value.name)
    if (value.value) return String(value.value)
    // Otherwise, just return a placeholder
    return 'Complex Value'
  }
  return String(value)
}

// Helper function to safely extract processor name specifically
const safeProcessorName = (processor: any): string => {
  if (!processor) return 'Unknown'
  if (typeof processor === 'string') return processor
  if (typeof processor === 'object') {
    return String(processor.name || processor.value || 'Unknown Processor')
  }
  return String(processor)
}

// Helper function to safely get a numeric value
const safeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

// Helper function to format battery runtime
const formatRuntime = (runtime: string): string => {
  if (!runtime) return 'Unknown'
  
  // Handle Windows TimeSpan format (HH:MM:SS.FFFFFFF)
  const match = runtime.match(/^(\d{1,2}):(\d{2}):(\d{2})/)
  if (match) {
    const [, hours, minutes, seconds] = match
    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    const s = parseInt(seconds, 10)
    
    if (h > 0) {
      return `${h}h ${m}m`
    } else if (m > 0) {
      return `${m}m ${s}s`
    } else {
      return `${s}s`
    }
  }
  
  return runtime
}

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  // Extract hardware data from the unified structure - check modular structure first
  // FIXED: Ensure we're correctly accessing the hardware module from the new structure
  const hardwareData = device?.modules?.hardware || device?.hardware || data || {}
  
  console.log('HardwareTab Debug - FIXED:', {
    hasDevice: !!device,
    hasDeviceModules: !!device?.modules,
    hasDeviceModulesHardware: !!device?.modules?.hardware,
    hasDeviceHardware: !!device?.hardware,
    hasData: !!data,
    hardwareDataKeys: Object.keys(hardwareData),
    hardwareDataSample: JSON.stringify(hardwareData).substring(0, 500),
    // Additional debugging to see the full modules structure
    deviceModulesKeys: device?.modules ? Object.keys(device.modules) : [],
    fullHardwareModuleStructure: device?.modules?.hardware ? JSON.stringify(device.modules.hardware, null, 2).substring(0, 1000) : 'No hardware module found'
  })
  
  if (!hardwareData || Object.keys(hardwareData).length === 0) {
    return (
      <div className="space-y-6">
        {/* Header with Icon - Consistent with other tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
            </div>
          </div>
        </div>
        
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hardware Information</h3>
          <p className="text-gray-600 dark:text-gray-400">Hardware data is not available for this device.</p>
        </div>
      </div>
    )
  }

  // Hardware stats for overview cards - filter out invalid storage devices
  const allStorageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
  // Filter out devices with 0 capacity or 0 free space as they don't have proper data collection
  const storageDevices = allStorageDevices.filter((drive: any) => 
    (drive.capacity && drive.capacity > 0) && (drive.freeSpace && drive.freeSpace > 0)
  )
  const totalStorage = storageDevices.reduce((total: number, drive: any) => total + (drive.capacity || 0), 0) || 0
  const freeStorage = storageDevices.reduce((total: number, drive: any) => total + (drive.freeSpace || 0), 0) || 0
  const usedStorage = totalStorage - freeStorage
  const storageUsagePercent = totalStorage > 0 ? Math.round((usedStorage / totalStorage) * 100) : 0

  const totalMemory = hardwareData.memory?.totalPhysical || 0
  const availableMemory = hardwareData.memory?.availablePhysical || 0
  const usedMemory = totalMemory - availableMemory
  const memoryUsagePercent = totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header with Icon - Consistent with other tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Overview</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">System hardware specifications and components</p>
          </div>
        </div>
        {/* Architecture - Top Right */}
        {hardwareData.processor?.architecture && (
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Architecture</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 max-w-xs truncate">
              {safeString(hardwareData.processor.architecture)}
            </div>
          </div>
        )}
      </div>

      {/* Hardware Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Model - Takes 50% width */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 md:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Model</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {hardwareData.model || 'Unknown'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Manufacturer</div>
          <div className="text-sm text-gray-900 dark:text-white font-medium">
            {hardwareData.manufacturer || 'Unknown Manufacturer'}
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col justify-end">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {storageUsagePercent}%
          </div>
          <div className="text-base text-gray-500 dark:text-gray-400">Storage Used</div>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {formatBytes(usedStorage)} / {formatBytes(totalStorage)}
          </div>
        </div>

        {/* Battery or Memory Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex flex-col justify-end">
          {hardwareData.battery ? (
            <>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {hardwareData.battery.cycleCount || 'N/A'}
              </div>
              <div className="text-base text-gray-500 dark:text-gray-400">Battery Cycles</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {hardwareData.battery.cycleCount ? `${Math.round((hardwareData.battery.cycleCount / 1000) * 100)}% of 1000 max` : 'Battery info unavailable'}
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {memoryUsagePercent}%
              </div>
              <div className="text-base text-gray-500 dark:text-gray-400">Memory Used</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {formatBytes(usedMemory)} / {formatBytes(totalMemory)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detailed Hardware Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware Specifications</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-base">
          {/* Row 1: CPU, GPU, NPU (if available) */}
          {/* 1. CPU */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900 rounded-lg">
                <div className="font-semibold text-lg text-red-600 dark:text-red-400">CPU</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{safeProcessorName(hardwareData.processor)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {safeNumber(hardwareData.processor?.cores) || safeNumber(hardwareData.processor?.logicalProcessors)} cores @ {safeNumber(hardwareData.processor?.maxSpeed)}GHz
            </div>
          </div>
          
          {/* 2. GPU */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <div className="font-semibold text-lg text-purple-600 dark:text-purple-400">GPU</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{hardwareData.graphics?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {hardwareData.graphics?.manufacturer} • {hardwareData.graphics?.memorySize}GB VRAM
            </div>
          </div>
          
          {/* 3. NPU - Only show if available */}
          {hardwareData.npu && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <div className="font-semibold text-lg text-blue-600 dark:text-blue-400">NPU</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">{hardwareData.npu.name || 'Unknown'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {hardwareData.npu.manufacturer} • {hardwareData.npu.computeUnits || hardwareData.npu.compute_units || 0} TOPS
              </div>
            </div>
          )}
          
          {/* Row 2: Memory, Storage, Battery (if available) */}
          {/* 4. Memory */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <div className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">Memory</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">{formatBytes(totalMemory)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {hardwareData.memory?.modules?.[0]?.type || 'Unknown'} • {hardwareData.memory?.modules?.[0]?.manufacturer || 'Unknown'}
            </div>
          </div>
          
          {/* 5. Storage */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <div className="font-semibold text-lg text-orange-600 dark:text-orange-400">Storage</div>
              </div>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-2">
              {storageDevices[0] ? formatBytes(storageDevices[0].capacity) : 'Unknown'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {storageDevices[0]?.type || 'Unknown'} • {storageDevices[0]?.health || 'Unknown'} Health
            </div>
          </div>
          
          {/* 6. Battery - Only show if available */}
          {hardwareData.battery && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900 rounded-lg">
                  <div className="font-semibold text-lg text-green-600 dark:text-green-400">Battery</div>
                </div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-2">
                {hardwareData.battery.chargePercent}% • {hardwareData.battery.health}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                {hardwareData.battery.cycleCount} cycles • {hardwareData.battery.isCharging ? 'Charging' : 'Not charging'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Storage Devices - Only show devices with valid capacity or free space data */}
      {storageDevices && storageDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Devices</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Physical and logical storage devices
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Free Space</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usage %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {storageDevices.map((drive: any, index: number) => {
                  const usagePercent = drive.capacity > 0 ? Math.round(((drive.capacity - drive.freeSpace) / drive.capacity) * 100) : 0
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {drive.name || `Drive ${index + 1}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          drive.type === 'SSD' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          drive.type === 'HDD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {drive.type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatBytes(drive.capacity || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatBytes(drive.freeSpace || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                usagePercent >= 90 ? 'bg-red-500' :
                                usagePercent >= 75 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{usagePercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          drive.health === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          drive.health === 'Warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          drive.health === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {drive.health || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Battery Information - Only show for laptops (devices with battery data) */}
      {hardwareData.battery && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Battery Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current battery status and health information
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charge Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Health</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cycle Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimated Runtime</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hardwareData.battery.isCharging ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-1.5 ${
                        hardwareData.battery.isCharging ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      {hardwareData.battery.isCharging ? 'Charging' : 'Not Charging'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (hardwareData.battery.chargePercent || 0) >= 80 ? 'bg-green-500' :
                            (hardwareData.battery.chargePercent || 0) >= 20 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(hardwareData.battery.chargePercent || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{hardwareData.battery.chargePercent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hardwareData.battery.health === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      hardwareData.battery.health === 'Fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      hardwareData.battery.health === 'Poor' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {hardwareData.battery.health || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {hardwareData.battery.cycleCount || 0} cycles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {hardwareData.battery.estimatedRuntime ? formatRuntime(hardwareData.battery.estimatedRuntime) : 'Unknown'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Memory Modules */}
      {hardwareData.memory?.modules && hardwareData.memory.modules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Memory Modules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Physical memory modules installed in this system
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Speed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manufacturer</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {hardwareData.memory.modules.map((module: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {module.location || `Slot ${index + 1}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {module.type || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatBytes((module.capacity || 0) * 1024 * 1024)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {module.speed ? `${module.speed} MHz` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {module.manufacturer || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}

export default HardwareTab