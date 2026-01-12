"use client"

import useSWR, { preload, SWRConfiguration } from 'swr'

// Fetcher with error handling
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  return response.json()
}

// Filter options interface from installs page
export interface InstallsFilterOptions {
  managedInstalls: string[]
  otherInstalls: string[]
  totalManagedInstalls: number
  totalOtherInstalls: number
  usages: string[]
  catalogs: string[]
  rooms: string[]
  fleets: string[]
  platforms: string[]
  devicesWithData: number
  devices?: any[]
}

// SWR options for installs data
const swrOptions: SWRConfiguration = {
  revalidateOnFocus: false,      // Don't refetch when window regains focus
  revalidateOnReconnect: true,   // Refetch when network reconnects
  dedupingInterval: 300000,      // Dedupe requests within 5 minutes (installs data is larger)
  errorRetryCount: 2,            // Retry failed requests 2 times
  errorRetryInterval: 5000,      // Wait 5s between retries
  keepPreviousData: true,        // Show stale data while revalidating
}

// Cache key for installs filter options - matches the actual API endpoint
const INSTALLS_FILTER_KEY = '/api/devices/installs/filters'

/**
 * Hook for fetching installs filter options with SWR caching
 * - Dedupes requests across components
 * - Caches data and shows stale while revalidating
 * - Auto-retries on error
 * - Can be preloaded in the background
 */
export function useInstallsFilterOptions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<InstallsFilterOptions>(
    INSTALLS_FILTER_KEY,
    fetcher,
    {
      ...swrOptions,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    filterOptions: data ?? null,
    devices: data?.devices ?? [],
    isLoading,
    isValidating, // True when revalidating in background
    error,
    refresh: mutate,
  }
}

/**
 * Preload installs filter data in the background
 * Call this from the dashboard to start loading data early
 * The data will be cached and available instantly when navigating to /devices/installs
 */
export function preloadInstallsData() {
  // SWR's preload function fetches data and caches it
  preload(INSTALLS_FILTER_KEY, fetcher)
}

/**
 * Categorize devices by install status
 * Returns arrays of devices with errors, warnings, pending, and healthy installs
 * Note: Warnings and Pending are DIFFERENT categories:
 *   - Warnings: Items that need attention (warning status, needs-attention)
 *   - Pending: Items scheduled for installation/removal (will-be-installed, update-available, etc.)
 */
export function categorizeDevicesByInstallStatus(devices: any[]) {
  const devicesWithErrors: any[] = []
  const devicesWithWarnings: any[] = []
  const devicesWithPending: any[] = []
  const healthyDevices: any[] = []
  
  for (const device of devices) {
    // Skip archived devices
    if (device.archived === true) continue
    
    const cimianItems = device.modules?.installs?.cimian?.items || []
    
    const hasError = cimianItems.some((item: any) => {
      const status = item.currentStatus?.toLowerCase() || ''
      return status.includes('error') || status.includes('failed') || status === 'needs_reinstall'
    })
    
    const hasWarning = cimianItems.some((item: any) => {
      const status = item.currentStatus?.toLowerCase() || ''
      // Warnings are issues that need attention - NOT pending changes
      return status.includes('warning') || status === 'needs-attention'
    })

    const hasPending = cimianItems.some((item: any) => {
      const status = item.currentStatus?.toLowerCase() || ''
      // Pending are scheduled changes - installations, removals, updates
      return status.includes('will-be-installed') || status.includes('update-available') || 
             status.includes('update_available') || status.includes('will-be-removed') || 
             status.includes('pending') || status.includes('scheduled') || 
             status === 'managed-update-available'
    })
    
    // Devices can be in multiple categories - they're not mutually exclusive
    // A device with errors can also have pending items
    if (hasError) {
      devicesWithErrors.push(device)
    }
    if (hasWarning) {
      devicesWithWarnings.push(device)
    }
    if (hasPending) {
      devicesWithPending.push(device)
    }
    if (!hasError && !hasWarning && !hasPending) {
      healthyDevices.push(device)
    }
  }
  
  return { devicesWithErrors, devicesWithWarnings, devicesWithPending, healthyDevices }
}

/**
 * Get install items with a specific status from all devices
 */
export function getInstallItemsByStatus(devices: any[], statusFilter: 'errors' | 'warnings' | 'pending' | 'all') {
  const items: any[] = []
  
  for (const device of devices) {
    const cimianItems = device.modules?.installs?.cimian?.items || []
    
    for (const item of cimianItems) {
      const status = item.currentStatus?.toLowerCase() || ''
      
      if (statusFilter === 'all') {
        items.push({ ...item, device })
      } else if (statusFilter === 'errors') {
        if (status.includes('error') || status.includes('failed') || status === 'needs_reinstall') {
          items.push({ ...item, device })
        }
      } else if (statusFilter === 'warnings') {
        // Warnings are issues - NOT pending changes
        if (status.includes('warning') || status === 'needs-attention') {
          items.push({ ...item, device })
        }
      } else if (statusFilter === 'pending') {
        // Pending are scheduled changes
        if (status.includes('will-be-installed') || status.includes('update-available') || 
            status.includes('update_available') || status.includes('will-be-removed') || 
            status.includes('pending') || status.includes('scheduled') || 
            status === 'managed-update-available') {
          items.push({ ...item, device })
        }
      }
    }
  }
  
  return items
}

/**
 * Interface for aggregated install messages
 */
export interface AggregatedInstallMessage {
  message: string
  count: number
  devices: Array<{
    serialNumber: string
    deviceName: string
    itemName?: string
    timestamp?: string
  }>
  type: 'error' | 'warning'
  source?: string // e.g., 'cimian', 'munki'
}

/**
 * Aggregate all error messages from devices
 * Groups identical messages and counts occurrences
 * Similar to MunkiReport's "Munki Errors" widget
 */
export function aggregateInstallErrors(devices: any[]): AggregatedInstallMessage[] {
  const errorMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    // Check Cimian items for lastError
    const cimianItems = device.modules?.installs?.cimian?.items || []
    for (const item of cimianItems) {
      if (item.lastError && item.lastError.trim() !== '') {
        const errorMsg = item.lastError.trim()
        const existing = errorMap.get(errorMsg)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: item.itemName || item.name,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          errorMap.set(errorMsg, {
            message: errorMsg,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: item.itemName || item.name,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: 'error',
            source: 'cimian'
          })
        }
      }
    }
    
    // Check Munki errors (if available)
    const munkiData = device.modules?.installs?.munki
    if (munkiData?.errors && munkiData.errors.trim() !== '') {
      // Munki can have multiple errors concatenated, split by common delimiters
      const munkiErrors = munkiData.errors.split(/ERROR:|[\n\r]+/).filter((e: string) => e.trim())
      for (const errorMsg of munkiErrors) {
        const trimmedError = errorMsg.trim()
        if (!trimmedError) continue
        
        const existing = errorMap.get(trimmedError)
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          })
        } else {
          errorMap.set(trimmedError, {
            message: trimmedError,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              timestamp: munkiData.endTime
            }],
            type: 'error',
            source: 'munki'
          })
        }
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(errorMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Aggregate all warning messages from devices
 * Groups identical messages and counts occurrences
 * Similar to MunkiReport's "Munki Warnings" widget
 */
export function aggregateInstallWarnings(devices: any[]): AggregatedInstallMessage[] {
  const warningMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    // Check Cimian items for lastWarning
    const cimianItems = device.modules?.installs?.cimian?.items || []
    for (const item of cimianItems) {
      if (item.lastWarning && item.lastWarning.trim() !== '') {
        const warningMsg = item.lastWarning.trim()
        const existing = warningMap.get(warningMsg)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: item.itemName || item.name,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          warningMap.set(warningMsg, {
            message: warningMsg,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: item.itemName || item.name,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: 'warning',
            source: 'cimian'
          })
        }
      }
    }
    
    // Check Munki warnings (if available)
    const munkiData = device.modules?.installs?.munki
    if (munkiData?.warnings && munkiData.warnings.trim() !== '') {
      // Munki can have multiple warnings, split by common delimiters
      const munkiWarnings = munkiData.warnings.split(/WARNING:|[\n\r]+/).filter((w: string) => w.trim())
      for (const warningMsg of munkiWarnings) {
        const trimmedWarning = warningMsg.trim()
        if (!trimmedWarning) continue
        
        const existing = warningMap.get(trimmedWarning)
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          })
        } else {
          warningMap.set(trimmedWarning, {
            message: trimmedWarning,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              timestamp: munkiData.endTime
            }],
            type: 'warning',
            source: 'munki'
          })
        }
      }
    }
    
    // Also check problemInstalls
    if (munkiData?.problemInstalls && munkiData.problemInstalls.trim() !== '') {
      const problemMsg = `Problem installs: ${munkiData.problemInstalls.trim()}`
      const existing = warningMap.get(problemMsg)
      if (existing) {
        existing.count++
        existing.devices.push({
          serialNumber,
          deviceName,
          timestamp: munkiData.endTime
        })
      } else {
        warningMap.set(problemMsg, {
          message: problemMsg,
          count: 1,
          devices: [{
            serialNumber,
            deviceName,
            timestamp: munkiData.endTime
          }],
          type: 'warning',
          source: 'munki'
        })
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(warningMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Get error/warning messages for a specific package item across all devices
 * Used when clicking on an item in the Items with Errors/Warnings widgets
 */
export function getMessagesForItem(
  devices: any[], 
  itemName: string, 
  messageType: 'errors' | 'warnings'
): AggregatedInstallMessage[] {
  const messageMap = new Map<string, AggregatedInstallMessage>()
  
  for (const device of devices) {
    if (device.archived === true) continue
    
    const deviceName = device.modules?.inventory?.deviceName || device.serialNumber || 'Unknown'
    const serialNumber = device.serialNumber || device.deviceId || 'Unknown'
    
    // Check Cimian items
    const cimianItems = device.modules?.installs?.cimian?.items || []
    for (const item of cimianItems) {
      const currentItemName = item.itemName || item.name || ''
      if (currentItemName.toLowerCase() !== itemName.toLowerCase()) continue
      
      const messageField = messageType === 'errors' ? item.lastError : item.lastWarning
      if (messageField && messageField.trim() !== '') {
        const message = messageField.trim()
        const existing = messageMap.get(message)
        
        if (existing) {
          existing.count++
          existing.devices.push({
            serialNumber,
            deviceName,
            itemName: currentItemName,
            timestamp: item.lastUpdate || item.lastAttemptTime
          })
        } else {
          messageMap.set(message, {
            message,
            count: 1,
            devices: [{
              serialNumber,
              deviceName,
              itemName: currentItemName,
              timestamp: item.lastUpdate || item.lastAttemptTime
            }],
            type: messageType === 'errors' ? 'error' : 'warning',
            source: 'cimian'
          })
        }
      }
    }
  }
  
  // Sort by count (most common first)
  return Array.from(messageMap.values()).sort((a, b) => b.count - a.count)
}
