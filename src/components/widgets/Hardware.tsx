/**
 * Hardware Widget
 * Displays system hardware specifications
 */

import React from 'react'

interface Device {
  id: string
  name: string
  model?: string
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  architecture?: string
  manufacturer?: string
}

interface HardwareWidgetProps {
  device: Device
}

const getHardwareIcon = () => (
  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  const hasHardwareInfo = device.processor || device.memory || device.storage || device.graphics

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            {getHardwareIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System specifications</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {hasHardwareInfo ? (
          <div className="space-y-4">
            {device.model && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Model</label>
                <p className="text-gray-900 dark:text-white">{device.model}</p>
              </div>
            )}
            {device.processor && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Processor</label>
                <p className="text-gray-900 dark:text-white">{device.processor}</p>
                {device.processorSpeed && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{device.processorSpeed}</p>
                )}
              </div>
            )}
            {device.cores && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Cores</label>
                <p className="text-gray-900 dark:text-white">{device.cores} cores</p>
              </div>
            )}
            {device.memory && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</label>
                <p className="text-gray-900 dark:text-white">{device.memory}</p>
                {device.availableRAM && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available: {device.availableRAM}</p>
                )}
              </div>
            )}
            {device.storage && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage</label>
                <p className="text-gray-900 dark:text-white">{device.storage}</p>
                {device.storageType && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{device.storageType}</p>
                )}
                {device.availableStorage && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Available: {device.availableStorage}</p>
                )}
              </div>
            )}
            {device.graphics && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Graphics</label>
                <p className="text-gray-900 dark:text-white">{device.graphics}</p>
                {device.vram && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{device.vram} VRAM</p>
                )}
              </div>
            )}
            {device.resolution && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Display Resolution</label>
                <p className="text-gray-900 dark:text-white">{device.resolution}</p>
              </div>
            )}
            {device.architecture && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Architecture</label>
                <p className="text-gray-900 dark:text-white">{device.architecture}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Hardware information not available</p>
        )}
      </div>
    </div>
  )
}

export default HardwareWidget
