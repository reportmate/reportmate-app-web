"use client"

import useSWR, { SWRConfiguration } from 'swr'

// Fetcher with error handling
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  return response.json()
}

// Device interface
export interface DeviceSummary {
  deviceId: string
  serialNumber: string
  deviceName: string
  lastSeen: string
  status: string
  platform?: string
  os?: string
  assetTag?: string
  location?: string
  department?: string
}

// SWR options with smart defaults
const swrOptions: SWRConfiguration = {
  revalidateOnFocus: false,      // Don't refetch when window regains focus
  revalidateOnReconnect: true,   // Refetch when network reconnects
  dedupingInterval: 60000,       // Dedupe requests within 60s
  errorRetryCount: 3,            // Retry failed requests 3 times
  errorRetryInterval: 5000,      // Wait 5s between retries
  keepPreviousData: true,        // Show stale data while revalidating
}

/**
 * Hook for fetching devices with SWR caching
 * - Dedupes requests across components
 * - Caches data and shows stale while revalidating
 * - Auto-retries on error
 */
export function useDevices() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ devices: DeviceSummary[] }>(
    '/api/devices',
    fetcher,
    {
      ...swrOptions,
      refreshInterval: 120000, // Refresh every 2 minutes
    }
  )

  return {
    devices: data?.devices ?? [],
    isLoading,
    isValidating, // True when revalidating in background
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching a single device with full details
 */
export function useDevice(serialNumber: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    serialNumber ? `/api/device/${serialNumber}` : null,
    fetcher,
    {
      ...swrOptions,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    device: data?.device ?? null,
    isLoading,
    isValidating,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching install statistics
 */
export function useInstallStats() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/stats/installs',
    fetcher,
    {
      ...swrOptions,
      refreshInterval: 600000, // Refresh every 10 minutes
    }
  )

  return {
    stats: data ?? null,
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching events (used when WebSocket is not available)
 */
export function useEvents(limit: number = 1000) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/events?limit=${limit}`,
    fetcher,
    {
      ...swrOptions,
      refreshInterval: 60000, // Fallback polling every 60s
      isPaused: () => false,  // Can be paused when WebSocket is connected
    }
  )

  return {
    events: data?.events ?? [],
    totalEvents: data?.totalEvents ?? 0,
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for prefetching device data (for hover previews, etc.)
 */
export function usePrefetchDevice() {
  const prefetch = async (serialNumber: string) => {
    // Use SWR's mutate to prefetch and cache
    const data = await fetcher(`/api/device/${serialNumber}`)
    return data
  }

  return { prefetch }
}
