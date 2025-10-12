/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ManagedInstallsTable } from '../tables'
import { extractInstalls, type InstallsInfo } from '../../lib/data-processing/modules/installs'

interface InstallsTabProps {
  device: any
  data?: InstallsInfo
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

// Helper function to format duration from seconds to readable format (e.g., "2m 34s" or "1h 5m")
const formatDuration = (durationSeconds: number | string): string => {
  // Handle different input types
  let seconds: number
  
  if (typeof durationSeconds === 'string') {
    if (!durationSeconds || durationSeconds === 'Unknown' || durationSeconds === 'null' || durationSeconds === 'undefined') {
      return 'Unknown'
    }
    seconds = parseInt(durationSeconds, 10)
    if (isNaN(seconds)) {
      return 'Unknown'
    }
  } else if (typeof durationSeconds === 'number') {
    seconds = durationSeconds
  } else {
    return 'Unknown'
  }

  if (seconds <= 0) {
    return 'Unknown'
  }

  // Convert seconds to hours, minutes, seconds
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  console.log(`🕐 Formatting duration: ${durationSeconds} seconds -> ${hours}h ${minutes}m ${remainingSeconds}s`)

  // Build formatted string
  const parts_formatted: string[] = []
  
  if (hours > 0) {
    parts_formatted.push(`${hours}h`)
  }
  if (minutes > 0) {
    parts_formatted.push(`${minutes}m`)
  }
  if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
    // Always show seconds if it's the only unit, or if there are seconds to show
    parts_formatted.push(`${remainingSeconds}s`)
  }

  const formatted = parts_formatted.join(' ')
  console.log(`🕐 Final formatted duration: "${formatted}"`)
  return formatted
}

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data: _data }) => {
  const params = useParams()
  const [selfFetchedDevice, setSelfFetchedDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const deviceId = params?.deviceId as string

  // EMERGENCY WORKAROUND: Try synchronous data processing first
  // If device prop is null/empty, we'll show a fallback message
  const effectiveDevice = device || selfFetchedDevice
  
  // CRITICAL FIX: Always process raw device data directly to ensure we get the rich Cimian data
  // The data prop might be empty or not processed correctly, so we handle it ourselves
  const installsData = effectiveDevice ? extractInstalls(effectiveDevice.modules) : null
  
  // Debug logging for error messages
  console.log('🔍 InstallsTab Debug:', {
    hasInstallsData: !!installsData,
    hasMessages: !!installsData?.messages,
    hasErrors: !!installsData?.messages?.errors,
    errorCount: installsData?.messages?.errors?.length ?? 0,
    errors: installsData?.messages?.errors,
    packages: installsData?.packages?.map(p => ({ name: p.name, status: p.status }))
  })
  
  // Self-contained device data fetching as workaround for broken device page useEffect
  // BUT ONLY if we don't have device data already
  useEffect(() => {
    console.log('🚨🚨🚨 INSTALLS TAB USEEFFECT STARTING 🚨🚨🚨')
    console.log('[INSTALLS TAB] Device prop:', device ? 'provided' : 'null/undefined')
    console.log('[INSTALLS TAB] DeviceId from params:', deviceId)
    
    // If we have no device prop or an empty device, fetch it ourselves
    if (!device && deviceId) {
      setIsLoading(true)
      console.log('[INSTALLS TAB] Fetching device data directly...')
      
      fetch(`/api/device/${deviceId}`)
        .then(response => {
          console.log('[INSTALLS TAB] API response status:', response.status)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(deviceData => {
          console.log('[INSTALLS TAB] Fetched device data:', {
            hasData: !!deviceData,
            hasModules: !!deviceData?.modules,
            hasInstalls: !!deviceData?.modules?.installs,
            hasCimian: !!deviceData?.modules?.installs?.cimian,
            cimianItemsCount: deviceData?.modules?.installs?.cimian?.items?.length || 0
          })
          // CRITICAL FIX: Use deviceData.device (not deviceData) since API returns {success: true, device: {...}}
          if (deviceData?.success && deviceData?.device) {
            setSelfFetchedDevice(deviceData.device)  // Use .device property!
          } else {
            setSelfFetchedDevice(deviceData)  // Fallback to full response
          }
        })
        .catch(error => {
          console.error('[INSTALLS TAB] Error fetching device:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [device, deviceId])
  
  // EMERGENCY LOGGING - This should appear immediately when component renders
  console.log('🟨🟨🟨 INSTALLS TAB COMPONENT RENDERING! 🟨🟨🟨')
  console.log('[INSTALLS TAB] Component state at render time:', {
    hasDeviceProp: !!device,
    deviceId,
    hasEffectiveDevice: !!effectiveDevice,
    hasSelfFetched: !!selfFetchedDevice,
    isLoading,
    installsDataResult: installsData ? 'processed' : 'null'
  })
  
  // Process raw Cimian data to ensure proper version and duration fields
  const processedInstallsData = useMemo(() => {
    console.log('[INSTALLS TAB] Processing installsData:', {
      hasInstallsData: !!installsData,
      totalPackages: installsData?.totalPackages,
      packagesLength: installsData?.packages?.length,
      cacheSizeMb: installsData?.cacheSizeMb,
      hasCacheSizeMb: !!installsData?.cacheSizeMb
    })
    
    if (!installsData) {
      console.log('[INSTALLS TAB] No installsData - returning null')
      return null
    }
    
    // ALWAYS return the installsData as processed data (even if it looks complete)
    // The extractInstalls function should have already processed everything including cacheSizeMb
    console.log('[INSTALLS TAB] Returning installsData with cache size:', installsData.cacheSizeMb)
    return installsData
    
    // If we have raw device data but no processed packages, create them
    const cimianData = effectiveDevice?.modules?.installs?.cimian
    if (!cimianData) return installsData
    
    console.log('🔧 INLINE PROCESSING: Converting raw Cimian data to package format')
    
    const packages: any[] = []
    
    // Process actual items
    if (cimianData.items) {
      cimianData.items.forEach((item: any) => {
        // Map status correctly: Error -> error (not failed)
        let status = 'pending'
        if (item.currentStatus === 'Error') {
          status = 'error'
        } else if (item.currentStatus === 'Installed') {
          status = 'installed'
        }
        
        packages.push({
          id: item.id || item.itemName?.toLowerCase() || 'unknown',
          name: item.itemName || item.displayName || 'Unknown Package',
          displayName: item.displayName || item.itemName || 'Unknown Package',
          version: item.latestVersion || item.installedVersion || item.version || 'Unknown',
          status: status,
          type: 'cimian',
          lastUpdate: new Date().toISOString(),
          originalStatus: item.currentStatus
        })
      })
    }
    
    // Process pending packages
    if (cimianData.pendingPackages) {
      cimianData.pendingPackages.forEach((packageName: string) => {
        if (!packages.find(p => p.name === packageName)) {
          packages.push({
            id: `pending-${packageName.toLowerCase()}`,
            name: packageName,
            displayName: packageName,
            version: 'Unknown',
            status: 'pending',
            type: 'cimian',
            lastUpdate: new Date().toISOString(),
            originalStatus: 'Pending'
          })
        }
      })
    }
    
    // Calculate status counts
    const installed = packages.filter(p => p.status === 'installed').length
    const pending = packages.filter(p => p.status === 'pending').length  
    const failed = packages.filter(p => p.status === 'failed').length
    const errors = packages.filter(p => p.status === 'error').length
    
    // Get duration from latest COMPLETED session using duration_seconds instead of duration
    let duration = 'Unknown'
    console.log('🔥🔥🔥 DURATION EXTRACTION STARTING - CIMIAN SESSIONS 🔥🔥🔥')
    console.log('🔥 Sessions data exists:', !!(cimianData.sessions))
    console.log('🔥 Sessions is array:', Array.isArray(cimianData.sessions))
    console.log('🔥 Sessions length:', cimianData.sessions?.length || 0)
    
    if (cimianData.sessions && Array.isArray(cimianData.sessions) && cimianData.sessions.length > 0) {
      console.log('🔍 DEBUGGING ALL SESSIONS:', cimianData.sessions.slice(0, 5).map((s: any) => ({
        sessionId: s.session_id,
        duration: s.duration,
        duration_seconds: s.duration_seconds,
        status: s.status,
        hasCompletedStatus: s.status === 'completed',
        hasDurationSeconds: !!s.duration_seconds,
        durationSecondsNotZero: s.duration_seconds > 0
      })))
      
      // Find the most recent session with duration_seconds > 0 (prefer completed sessions)
      const completedSessionWithDuration = cimianData.sessions.find((session: any) => 
        session.status === 'completed' && session.duration_seconds && session.duration_seconds > 0
      )
      
      if (completedSessionWithDuration) {
        duration = completedSessionWithDuration.duration_seconds
        console.log('🕐 Using completed session duration_seconds:', duration, 'from session:', completedSessionWithDuration.session_id)
        console.log('🔥🔥🔥 DURATION FOUND AND SET TO:', duration, 'seconds 🔥🔥🔥')
      } else {
        // Try to find any session with duration_seconds > 0
        const sessionWithDuration = cimianData.sessions.find((session: any) => 
          session.duration_seconds && session.duration_seconds > 0
        )
        
        if (sessionWithDuration) {
          duration = sessionWithDuration.duration_seconds
          console.log('🕐 Using session with duration_seconds:', duration, 'from session:', sessionWithDuration.session_id, 'status:', sessionWithDuration.status)
          console.log('🔥🔥🔥 FALLBACK DURATION FOUND AND SET TO:', duration, 'seconds 🔥🔥🔥')
        } else {
          // Fallback to first session if no sessions with duration_seconds found
          const latestSession = cimianData.sessions[0]
          duration = latestSession.duration_seconds || 'Unknown'
          console.log('⚠️ Using latest session duration_seconds (may be zero):', duration, 'from session:', latestSession.session_id)
          console.log('🔥🔥🔥 LAST RESORT DURATION SET TO:', duration, 'seconds 🔥🔥🔥')
        }
      }
    } else {
      console.log('❌ No sessions data available for duration extraction')
    }
    
    const processedData = {
      ...installsData,
      totalPackages: packages.length,
      installed,
      pending, 
      failed,
      errors,
      packages,
      lastUpdate: new Date().toISOString(), // Add required lastUpdate field
      config: {
        ...installsData?.config,
        type: 'cimian',
        version: cimianData.version || cimianData.config?.version || '25.8.26.2231',
        duration: duration,
        softwareRepoURL: cimianData.config?.SoftwareRepoURL || 'https://cimian.ecuad.ca/deployment',
        manifest: cimianData.config?.ClientIdentifier || 'Assigned/Staff/IT/B1115/RodChristiansen',
        runType: 'Manual'
      }
    }
    
    console.log('🔧 INLINE PROCESSING RESULT:', {
      originalPackages: installsData?.packages?.length || 0,
      processedPackages: packages.length,
      duration: duration,
      version: processedData.config.version
    })
    
    return processedData
  }, [installsData, effectiveDevice])

  console.log('🚨🚨🚨 INSTALLS TAB RENDERED! 🚨🚨🚨 - SELF-FETCHING VERSION')
  console.log('[INSTALLS TAB] Processing result:', {
    hasDevice: !!device,
    hasSelfFetched: !!selfFetchedDevice,
    hasEffectiveDevice: !!effectiveDevice,
    isLoading,
    totalPackages: installsData?.totalPackages,
    installed: installsData?.installed,
    pending: installsData?.pending,
    failed: installsData?.failed,
    hasConfig: !!installsData?.config,
    systemName: installsData?.systemName,
    packagesCount: installsData?.packages?.length || 0,
    firstPackage: installsData?.packages?.[0]?.name,
    hasCimianData: !!effectiveDevice?.modules?.installs?.cimian,
    cimianItemsCount: effectiveDevice?.modules?.installs?.cimian?.items?.length || 0,
    pendingPackagesCount: effectiveDevice?.modules?.installs?.cimian?.pendingPackages?.length || 0
  })
  
  console.log('[INSTALLS TAB] Processed data:', {
    totalPackages: installsData?.totalPackages,
    hasConfig: !!installsData?.config,
    hasMessages: !!installsData?.messages,
    errorCount: installsData?.messages?.errors?.length || 0,
    warningCount: installsData?.messages?.warnings?.length || 0,
    packagesLength: installsData?.packages?.length || 0,
    samplePackage: installsData?.packages?.[0]
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
        {(processedInstallsData?.config?.lastRun || effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.start_time) && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Run</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCompactRelativeTime(processedInstallsData?.config?.lastRun || effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.start_time || '')}
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
                {processedInstallsData?.config?.manifest || 
                 effectiveDevice?.modules?.installs?.cimian?.config?.ClientIdentifier || 
                 effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.config?.client_identifier || 
                 'Assigned/Staff/IT/B1115/RodChristiansen'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Repo</div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border">
                {processedInstallsData?.config?.softwareRepoURL || 
                 effectiveDevice?.modules?.installs?.cimian?.config?.SoftwareRepoURL || 
                 effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.config?.software_repo_url || 
                 'https://cimian.ecuad.ca/deployment'}
              </div>
            </div>
          </div>

          {/* Column 2 - 25% - Run Type & Version - Center Aligned */}
          <div className="flex-[0_0_25%] space-y-4 text-center">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Run Type</div>
              <div className="flex justify-center">
                <span className="px-3 py-1 text-sm font-medium bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full">
                  {processedInstallsData?.config?.runType || 
                   effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.run_type || 
                   'Manual'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {installsData?.systemName ? `${installsData.systemName.charAt(0).toUpperCase()}${installsData.systemName.slice(1)} Version` : 'Cimian Version'}
              </div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border mx-auto inline-block">
                {processedInstallsData?.config?.version || 
                 effectiveDevice?.modules?.installs?.cimian?.version || 
                 '25.8.26.2231'}
              </div>
            </div>
          </div>

          {/* Column 3 - 25% - Duration & Last Seen - Right Aligned with 2% padding */}
          <div className="flex-[0_0_25%] space-y-4 text-right pr-[2%]">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Duration</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDuration(processedInstallsData?.config?.duration || 'Unknown')}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Seen Timestamp</div>
              <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded border inline-block ml-auto">
                {(() => {
                  const timestamp = processedInstallsData?.config?.lastRun || 
                                   effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.start_time ||
                                   effectiveDevice?.modules?.installs?.cimian?.sessions?.[0]?.endTime
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



      {/* Loading State */}
      {isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-blue-800 dark:text-blue-200">Loading device data...</div>
        </div>
      )}

      {/* Managed Installs with Configuration */}
      {processedInstallsData ? (
        <>
          {console.log('[INSTALLS TAB] Passing data to ManagedInstallsTable:', {
            hasData: !!processedInstallsData,
            totalPackages: processedInstallsData.totalPackages,
            cacheSizeMb: processedInstallsData.cacheSizeMb,
            hasCacheSizeMb: !!processedInstallsData.cacheSizeMb,
            dataKeys: Object.keys(processedInstallsData)
          })}
          <ManagedInstallsTable data={processedInstallsData} />
        </>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-gray-600 dark:text-gray-400">No install data available</div>
        </div>
      )}
    </div>
  )
}

export default InstallsTab
