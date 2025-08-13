/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React from 'react'
import { ManagedInstallsTable } from '../tables'
import { processInstallsData, InstallsData } from '../../lib/data-processing/component-data'

interface InstallsTabProps {
  device: any
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
  // DISABLED: Hard-code test data to verify component rendering works
  // Now using real processInstallsData function to get actual package data
  const testData = null
  
  console.log('🚨🚨🚨 INSTALLS TAB RENDERED! 🚨🚨🚨 - UPDATED VERSION')
  console.log('💡 testData is now null, should call processInstallsData')
  console.log('[INSTALLS TAB] === DEBUGGING START ===')
  console.log('[INSTALLS TAB] Raw props:', {
    hasDevice: !!device,
    hasData: !!data,
    deviceKeys: device ? Object.keys(device) : [],
    dataKeys: data ? Object.keys(data) : [],
  })
  console.log('[INSTALLS TAB] Using test data:', testData)
  
  // Debug the exact data paths we're looking for
  console.log('[INSTALLS TAB] Device installs structure:', {
    hasDeviceInstalls: !!device?.installs,
    deviceInstallsKeys: device?.installs ? Object.keys(device.installs) : [],
    hasCimian: !!device?.installs?.cimian,
    cimianKeys: device?.installs?.cimian ? Object.keys(device.installs.cimian) : [],
    hasConfig: !!device?.installs?.cimian?.config,
    hasSessions: !!device?.installs?.cimian?.sessions,
    sessionsLength: device?.installs?.cimian?.sessions?.length || 0,
    firstSessionKeys: device?.installs?.cimian?.sessions?.[0] ? Object.keys(device.installs.cimian.sessions[0]) : []
  })
  
  // Debug the processed data structure
  console.log('[INSTALLS TAB] Processed data structure:', {
    hasConfig: !!data?.config,
    configKeys: data?.config ? Object.keys(data.config) : [],
    totalPackages: data?.totalPackages,
    systemName: data?.systemName,
    fullData: data
  })
  
  // Debug the specific values we're trying to display
  console.log('[INSTALLS TAB] Specific field values:', {
    manifest: {
      fromData: data?.config?.manifest,
      fromDeviceConfig: device?.installs?.cimian?.config?.ClientIdentifier,
      fromDeviceSession: device?.installs?.cimian?.sessions?.[0]?.config?.client_identifier
    },
    repo: {
      fromData: data?.config?.softwareRepoURL,
      fromDeviceConfig: device?.installs?.cimian?.config?.SoftwareRepoURL,
      fromDeviceSession: device?.installs?.cimian?.sessions?.[0]?.config?.software_repo_url
    },
    version: {
      fromData: data?.config?.version,
      fromDevice: device?.installs?.cimian?.version
    },
    runType: {
      fromData: data?.config?.runType,
      fromDevice: device?.installs?.cimian?.sessions?.[0]?.runType
    }
  })
  
  console.log('[INSTALLS TAB] === DEBUGGING END ===')
  
  // Use the test data instead of processed data for debugging
  const installsData = testData || data || processInstallsData(device)
  
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
        {/* Last Run - Top Right */}
        {(data?.config?.lastRun || device?.installs?.cimian?.sessions?.[0]?.endTime) && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Run</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCompactRelativeTime(data?.config?.lastRun || device?.installs?.cimian?.sessions?.[0]?.endTime || '')}
            </div>
          </div>
        )}
      </div>

      {/* Managed Installs Configuration Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 items-end">
          {/* Column 1 - 45% - Manifest & Repo */}
          <div className="flex-[0_0_45%] space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Manifest</div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border">
                {data?.config?.manifest || 
                 device?.installs?.cimian?.config?.ClientIdentifier || 
                 device?.installs?.cimian?.sessions?.[0]?.config?.client_identifier || 
                 'Not specified'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Repo</div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border">
                {data?.config?.softwareRepoURL || 
                 device?.installs?.cimian?.config?.SoftwareRepoURL || 
                 device?.installs?.cimian?.sessions?.[0]?.config?.software_repo_url || 
                 'Not specified'}
              </div>
            </div>
          </div>

          {/* Column 2 - 25% - Run Type & Version - Center Aligned */}
          <div className="flex-[0_0_25%] space-y-4 text-center">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Run Type</div>
              <div className="flex justify-center">
                <span className="px-3 py-1 text-sm font-medium bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full">
                  {data?.config?.runType || 
                   device?.installs?.cimian?.sessions?.[0]?.runType || 
                   'Unknown'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {installsData?.systemName ? `${installsData.systemName.charAt(0).toUpperCase()}${installsData.systemName.slice(1)} Version` : 'Cimian Version'}
              </div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border mx-auto inline-block">
                {data?.config?.version || 
                 device?.installs?.cimian?.version || 
                 'Unknown'}
              </div>
            </div>
          </div>

          {/* Column 3 - 25% - Duration & Last Seen - Right Aligned with 2% padding */}
          <div className="flex-[0_0_25%] space-y-4 text-right pr-[2%]">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Duration</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {data?.config?.duration || 
                 device?.installs?.cimian?.sessions?.[0]?.duration || 
                 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Seen Timestamp</div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border inline-block ml-auto">
                {(() => {
                  const timestamp = data?.config?.lastRun || device?.installs?.cimian?.sessions?.[0]?.endTime
                  if (!timestamp) return 'Never'
                  
                  try {
                    return new Date(timestamp).toLocaleString('en-CA', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }).replace(', ', ' ')
                  } catch (error) {
                    console.error('Error formatting timestamp:', timestamp, error)
                    return String(timestamp)
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error and Warning Cards Section */}
      {((installsData?.messages?.errors?.length ?? 0) > 0 || (installsData?.messages?.warnings?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Error Messages Card */}
          {(installsData?.messages?.errors?.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Errors Detected ({installsData?.messages?.errors?.length ?? 0})
                </h3>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {installsData?.messages?.errors?.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {error.package || 'System'}
                    </div>
                    <div className="text-red-600 dark:text-red-400 mt-1">
                      {error.message}
                    </div>
                    {error.timestamp && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCompactRelativeTime(error.timestamp)}
                      </div>
                    )}
                  </div>
                )) ?? []}
                {(installsData?.messages?.errors?.length ?? 0) > 10 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-red-200 dark:border-red-700">
                    ... and {(installsData?.messages?.errors?.length ?? 0) - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning Messages Card */}
          {(installsData?.messages?.warnings?.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  Warnings ({installsData?.messages?.warnings?.length ?? 0})
                </h3>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {installsData?.messages?.warnings?.slice(0, 10).map((warning, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {warning.package || 'System'}
                    </div>
                    <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                      {warning.message}
                    </div>
                    {warning.timestamp && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatCompactRelativeTime(warning.timestamp)}
                      </div>
                    )}
                  </div>
                )) ?? []}
                {(installsData?.messages?.warnings?.length ?? 0) > 10 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-yellow-200 dark:border-yellow-700">
                    ... and {(installsData?.messages?.warnings?.length ?? 0) - 10} more warnings
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Managed Installs with Configuration */}
      <ManagedInstallsTable data={installsData} />
    </div>
  )
}

export default InstallsTab
