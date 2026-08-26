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
const INSTALLS_FILTER_KEY = '/api/v1/installs/filters'

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
 * The data will be cached and available instantly when navigating to /installs
 */
export function preloadInstallsData() {
  // SWR's preload function fetches data and caches it
  preload(INSTALLS_FILTER_KEY, fetcher)
}

// Pure status/message logic lives in src/lib/installs/status.ts; re-exported
// here so existing importers keep working.
export {
  getDeviceInstallItems,
  categorizeDevicesByInstallStatus,
  getInstallItemsByStatus,
  isErrorItem,
  isWarningItem,
  isPendingItem,
  isSuccessItem,
  matchesItemStatus,
  getItemMessage,
  getItemTimestamp,
  aggregateInstallErrors,
  aggregateInstallWarnings,
  aggregateStatusMessages,
  getMessagesForItem,
} from '../lib/installs/status'
export type {
  ItemStatusFilter,
  AggregatedInstallMessage,
  InstallMessageOccurrence,
  InstallMessageDevice,
  InstallMessageGroup,
} from '../lib/installs/status'
