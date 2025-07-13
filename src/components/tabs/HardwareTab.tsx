/**
 * Hardware Tab Component
 * Detailed hardware specifications and performance metrics
 */

import React from 'react'
import { HardwareWidget } from '../widgets/Hardware'

interface HardwareTabProps {
  device: any
  data?: any
}

export const HardwareTab: React.FC<HardwareTabProps> = ({ device, data }) => {
  return (
    <div className="space-y-8">
      {/* Hardware Overview Widget */}
      <HardwareWidget device={device} />
      
      {/* Performance Metrics */}
      {(device.cpuUtilization !== undefined || device.memoryUtilization !== undefined || device.diskUtilization !== undefined) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {device.cpuUtilization !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Utilization</label>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(device.cpuUtilization, 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{device.cpuUtilization}%</span>
                  </div>
                </div>
              </div>
            )}
            {device.memoryUtilization !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Utilization</label>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(device.memoryUtilization, 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{device.memoryUtilization}%</span>
                  </div>
                </div>
              </div>
            )}
            {device.diskUtilization !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Utilization</label>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(device.diskUtilization, 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{device.diskUtilization}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Environmental Data */}
      {(device.temperature !== undefined || device.batteryLevel !== undefined) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Environmental</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {device.temperature !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Temperature</label>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{device.temperature}°C</p>
              </div>
            )}
            {device.batteryLevel !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Battery Level</label>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${device.batteryLevel > 20 ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${Math.min(device.batteryLevel, 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">{device.batteryLevel}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HardwareTab
