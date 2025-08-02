/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React from 'react'
import { ManagedInstallsTable } from '../tables'
import { processInstallsData, InstallsData } from '../../lib/data-processing/component-data'

interface InstallsTabProps {
  device: Record<string, unknown>
  data?: InstallsData
}

// Helper function for compact relative time format (e.g., "2h 37m ago")
const formatCompactRelativeTime = (timestamp: string): string => {
  if (!timestamp || timestamp === 'null' || timestamp === 'undefined' || timestamp.trim() === '') {
    return 'never'
  }

  const now = new Date()
  const eventTime = new Date(timestamp)
  
  if (isNaN(eventTime.getTime())) {
    return 'unknown'
  }

  const diffInMs = now.getTime() - eventTime.getTime()
  
  if (diffInMs < 0) {
    return 'just now'
  }
  
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    const remainingMinutes = diffInMinutes % 60
    if (remainingMinutes > 0) {
      return `${diffInHours}h ${remainingMinutes}m ago`
    }
    return `${diffInHours}h ago`
  } else {
    return `${diffInDays}d ago`
  }
}

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data }) => {
  console.log('[INSTALLS TAB] Received props:', {
    hasDevice: !!device,
    hasData: !!data,
    deviceKeys: device ? Object.keys(device) : [],
    deviceId: device?.metadata?.deviceId || device?.deviceId,
    serialNumber: device?.metadata?.serialNumber || device?.serialNumber
  })
  
  // Use the processed installs data which includes configuration
  const installsData = data || processInstallsData(device)
  
  console.log('[INSTALLS TAB] Processed data:', {
    totalPackages: installsData?.totalPackages,
    hasConfig: !!installsData?.config,
    hasMessages: !!installsData?.messages,
    errorCount: installsData?.messages?.errors?.length || 0,
    warningCount: installsData?.messages?.warnings?.length || 0
  })

  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Managed Installs</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Software deployment report</p>
          </div>
        </div>
        {/* Run Start - Top Right */}
        {installsData?.config?.lastRun && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Run Start</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCompactRelativeTime(installsData.config.lastRun)}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Information - 3 Column Layout (50/25/25) */}
      {installsData?.config && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="grid grid-cols-4 gap-6">
            {/* Column 1 - 50% (2 grid columns) */}
            <div className="col-span-2 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Manifest</h3>
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-3 py-2">
                  <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {installsData.config.manifest || 'Not specified'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Repo</h3>
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-3 py-2">
                  <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {installsData.config.softwareRepoURL || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Column 2 - 25% (1 grid column) */}
            <div className="space-y-5">
              <div className="text-center pt-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {installsData.systemName ? `${installsData.systemName.charAt(0).toUpperCase()}${installsData.systemName.slice(1)} Version` : 'Version'}
                </h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {installsData.config.version || 'Unknown'}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Run Type</h3>
                <div className="flex justify-center">
                  <span className="px-3 py-1 text-sm font-medium bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full">
                    {installsData.config.runType || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Column 3 - 25% (1 grid column) */}
            <div className="space-y-5">
              <div className="text-center pt-3">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Duration</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {installsData.config.duration || 'Unknown'}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Timestamp</h3>
                <div className="flex justify-center">
                  <span className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                    {installsData.config.lastRun ? new Date(installsData.config.lastRun).toLocaleString('en-CA', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }).replace(', ', ' ') : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Managed Installs with Configuration */}
      <ManagedInstallsTable data={installsData} />
    </div>
  )
}

export default InstallsTab
