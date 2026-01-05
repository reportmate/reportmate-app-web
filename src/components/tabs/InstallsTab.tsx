/**
 * Installs Tab Component
 * Managed software installations and updates
 */

import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ManagedInstallsTable } from '../tables/ManagedInstallsTable'
import { extractInstalls, type InstallsInfo } from '../../lib/data-processing/modules/installs'
import { normalizeKeys } from '../../lib/utils/powershell-parser'

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
  return formatted
}

const InstallsTabSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="text-right mr-8 space-y-2">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
      </div>
    </div>

    {/* Config Card Skeleton */}
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex gap-8 items-end">
        <div className="flex-[0_0_45%] space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        <div className="flex-[0_0_25%] space-y-4">
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
        <div className="flex-[0_0_25%] space-y-4 flex flex-col items-end pr-[2%]">
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    {/* Run Log Skeleton */}
    <div className="h-14 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>

    {/* Table Skeleton */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          ))}
        </div>
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export const InstallsTab: React.FC<InstallsTabProps> = ({ device, data: _data }) => {
  const params = useParams()
  const deviceId = params?.deviceId as string
  const [selfFetchedDevice, setSelfFetchedDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(!device && !!deviceId)
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  const [logContent, setLogContent] = useState<string | null>(null)
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [isLogCopied, setIsLogCopied] = useState(false)
  const [logSearchTerm, setLogSearchTerm] = useState('')

  // EMERGENCY WORKAROUND: Try synchronous data processing first
  // If device prop is null/empty, we'll show a fallback message
  const effectiveDevice = device || selfFetchedDevice
  
  // Normalize snake_case to camelCase for installs module
  const rawInstallsModule = effectiveDevice?.modules?.installs
  const normalizedInstallsModule = rawInstallsModule ? normalizeKeys(rawInstallsModule) as any : null
  const normalizedModules = effectiveDevice?.modules ? {
    ...effectiveDevice.modules,
    installs: normalizedInstallsModule
  } : null
  
  // CRITICAL FIX: Always process raw device data directly to ensure we get the rich Cimian data
  // The data prop might be empty or not processed correctly, so we handle it ourselves
  const installsData = normalizedModules ? extractInstalls(normalizedModules) : null
  
  // Self-contained device data fetching as workaround for broken device page useEffect
  // BUT ONLY if we don't have device data already
  useEffect(() => {
    // If we have no device prop or an empty device, fetch it ourselves
    if (!device && deviceId) {
      setIsLoading(true)
      
      fetch(`/api/device/${deviceId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then(deviceData => {
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
  
  // Process raw Cimian data to ensure proper version and duration fields
  const processedInstallsData = useMemo(() => {
    if (!installsData) {
      return null
    }
    
    // ALWAYS return the installsData as processed data (even if it looks complete)
    // The extractInstalls function should have already processed everything including cacheSizeMb
    return installsData
    
    // If we have raw device data but no processed packages, create them
    const cimianData = effectiveDevice?.modules?.installs?.cimian
    if (!cimianData) return installsData
    
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
    
    if (cimianData.sessions && Array.isArray(cimianData.sessions) && cimianData.sessions.length > 0) {
      // Find the most recent session with duration_seconds > 0 (prefer completed sessions)
      const completedSessionWithDuration = cimianData.sessions.find((session: any) => 
        session.status === 'completed' && session.duration_seconds && session.duration_seconds > 0
      )
      
      if (completedSessionWithDuration) {
        duration = completedSessionWithDuration.duration_seconds
      } else {
        // Try to find any session with duration_seconds > 0
        const sessionWithDuration = cimianData.sessions.find((session: any) => 
          session.duration_seconds && session.duration_seconds > 0
        )
        
        if (sessionWithDuration) {
          duration = sessionWithDuration.duration_seconds
        } else {
          // Fallback to first session if no sessions with duration_seconds found
          const latestSession = cimianData.sessions[0]
          duration = latestSession.duration_seconds || 'Unknown'
        }
      }
    } else {
      // No sessions data available
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
    
    return processedData
  }, [installsData, effectiveDevice])

  const toggleLog = async () => {
    if (isLogExpanded) {
      setIsLogExpanded(false)
      return
    }

    setIsLogExpanded(true)
    
    if (!logContent && effectiveDevice?.serialNumber) {
      setIsLogLoading(true)
      try {
        const response = await fetch(`/api/device/${effectiveDevice.serialNumber}/installs/log`)
        if (response.ok) {
          const data = await response.json()
          setLogContent(data.runLog || 'No log data available')
        } else {
          setLogContent('Failed to load log data')
        }
      } catch (error) {
        console.error('Error fetching run log:', error)
        setLogContent('Error loading log data')
      } finally {
        setIsLogLoading(false)
      }
    }
  }

  if (isLoading) {
    return <InstallsTabSkeleton />
  }

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
          <div className="flex-[0_0_25%] space-y-4 flex flex-col items-end pr-[2%]">
            <div className="space-y-2 flex flex-col items-end">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Duration</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDuration(processedInstallsData?.config?.duration || 'Unknown')}
              </div>
            </div>
            <div className="space-y-2 flex flex-col items-end">
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

      {/* Run Log Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={toggleLog}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">Managed Software Update Last Run Log</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${isLogExpanded ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isLogExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {isLogLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                Loading run log...
              </div>
            ) : (
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search log..."
                      value={logSearchTerm}
                      onChange={(e) => setLogSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 w-64"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       if (logContent) {
                         navigator.clipboard.writeText(logContent);
                         setIsLogCopied(true);
                         setTimeout(() => setIsLogCopied(false), 2000);
                       }
                     }}
                     className={`p-2 rounded-md border shadow-sm transition-all duration-200 ${
                       isLogCopied 
                         ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 scale-110' 
                         : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                     }`}
                     title={isLogCopied ? "Copied!" : "Copy to clipboard"}
                   >
                     {isLogCopied ? (
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                       </svg>
                     ) : (
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                       </svg>
                     )}
                   </button>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (logContent) {
                         const blob = new Blob([logContent], { type: 'text/plain' });
                         const url = window.URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `run-${effectiveDevice?.serialNumber || 'log'}.log`;
                         document.body.appendChild(a);
                         a.click();
                         window.URL.revokeObjectURL(url);
                         document.body.removeChild(a);
                       }
                     }}
                     className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                     title="Download log"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                     </svg>
                   </button>
                  </div>
                </div>
                
                <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {logSearchTerm.trim() && logContent 
                    ? logContent.split('\n').filter(line => line.toLowerCase().includes(logSearchTerm.toLowerCase())).join('\n')
                    : logContent}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {/* Removed simple loading state in favor of full page skeleton */}

      {/* Managed Installs with Configuration */}
      {processedInstallsData ? (
        <>
          <ManagedInstallsTable data={processedInstallsData} />
          
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
                  device.modules.installs
                </span>
              </summary>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <div className="p-4">
                  <div className="flex justify-end gap-2 mb-2">
                    <button
                      onClick={() => {
                        const jsonString = JSON.stringify(effectiveDevice?.modules?.installs, null, 2)
                        navigator.clipboard.writeText(jsonString)
                      }}
                      className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Copy JSON
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                    {JSON.stringify(effectiveDevice?.modules?.installs, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
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
