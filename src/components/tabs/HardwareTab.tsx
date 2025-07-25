/**
 * Hardware Tab Component
 * System hardware and specifications
 */

import React from 'react'

interface HardwareTabProps {
  device: any
  data?: any
}

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  // Extract hardware data from the unified structure
  const hardwareData = device?.hardware || data || {}
  
  if (!hardwareData || Object.keys(hardwareData).length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Hardware Information</h3>
        <p className="text-gray-600 dark:text-gray-400">Hardware data is not available for this device.</p>
      </div>
    )
  }

  // Hardware stats for overview cards - fix storage handling
  const storageDevices = Array.isArray(hardwareData.storage) ? hardwareData.storage : []
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
    <div className="space-y-8">
      {/* Hardware Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Processor */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {hardwareData.processor?.cores || 'N/A'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">CPU Cores</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {hardwareData.processor?.name || 'Unknown Processor'}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {memoryUsagePercent}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Memory Used</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatBytes(usedMemory)} / {formatBytes(totalMemory)}
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {storageUsagePercent}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Storage Used</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatBytes(usedStorage)} / {formatBytes(totalStorage)}
          </div>
        </div>

        {/* Graphics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {hardwareData.graphics?.memorySize || 'N/A'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">GPU Memory (GB)</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {hardwareData.graphics?.name || 'Unknown Graphics'}
          </div>
        </div>
      </div>

      {/* Storage Devices */}
      {storageDevices && storageDevices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage Devices</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Physical and logical storage devices attached to this system
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

      {/* Detailed Hardware Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hardware Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Processor</div>
            <div className="text-gray-600 dark:text-gray-400">{hardwareData.processor?.name || 'Unknown'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {hardwareData.processor?.cores} cores @ {hardwareData.processor?.maxSpeed} GHz
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Graphics</div>
            <div className="text-gray-600 dark:text-gray-400">{hardwareData.graphics?.name || 'Unknown'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {hardwareData.graphics?.manufacturer} • {hardwareData.graphics?.memorySize}GB VRAM
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">System Model</div>
            <div className="text-gray-600 dark:text-gray-400">{hardwareData.model || 'Unknown'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {hardwareData.manufacturer}
            </div>
          </div>
          {hardwareData.battery && (
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Battery</div>
              <div className="text-gray-600 dark:text-gray-400">
                {hardwareData.battery.chargePercent}% • {hardwareData.battery.health}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {hardwareData.battery.cycleCount} cycles • {hardwareData.battery.isCharging ? 'Charging' : 'Not charging'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HardwareTab