/**
 * System Tab Component
 * Detailed system information and operating system details
 */

import React from 'react'
import { SystemWidget } from '../widgets/System'

interface SystemTabProps {
  device: any
}

export const SystemTab: React.FC<SystemTabProps> = ({ device }) => {
  return (
    <div className="space-y-8">
      {/* System Overview Widget */}
      <SystemWidget device={device} />
      
      {/* Additional system details can be added here in the future */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {device.uptime && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Uptime</label>
              <p className="text-gray-900 dark:text-white">{device.uptime}</p>
            </div>
          )}
          {device.bootTime && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Boot Time</label>
              <p className="text-gray-900 dark:text-white">{new Date(device.bootTime).toLocaleString()}</p>
            </div>
          )}
          {device.kernelVersion && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Kernel Version</label>
              <p className="text-gray-900 dark:text-white font-mono">{device.kernelVersion}</p>
            </div>
          )}
          {device.platform && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Platform</label>
              <p className="text-gray-900 dark:text-white">{device.platform}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SystemTab
