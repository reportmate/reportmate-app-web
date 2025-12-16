/**
 * Info Tab Component
 * Device overview with widgets for system information, hardware, security, network, and management
 */

import React from 'react'
import { InventoryWidget } from '../widgets/Inventory'
import { SystemWidget } from '../widgets/System'
import { HardwareWidget } from '../widgets/Hardware'
import { ManagementWidget } from '../widgets/Management'
import { SecurityWidget } from '../widgets/Security'
import { NetworkWidget } from '../widgets/Network'

interface InfoTabProps {
  device: any
}

export const InfoTab: React.FC<InfoTabProps> = ({ device }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Information Widget (Basic device info) */}
        <InventoryWidget device={device} />
        
        {/* System (Operating System) Widget */}
        <SystemWidget device={device} />
        
        {/* Hardware Widget */}
        <HardwareWidget device={device} />
        
        {/* Management Widget */}
        <ManagementWidget device={device} />
        
        {/* Security Widget */}
        <SecurityWidget device={device} />
        
        {/* Network Widget */}
        <NetworkWidget device={device} />
      </div>

      {/* Debug Accordion for API Data */}
      <div className="mt-6">
        <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              device (full object)
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default InfoTab
