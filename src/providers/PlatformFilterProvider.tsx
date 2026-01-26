"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'

export type Platform = 'macOS' | 'Windows' | 'all'

interface PlatformFilterContextType {
  // Current platform filter
  platformFilter: Platform
  // Toggle a specific platform on/off
  setPlatformFilter: (platform: Platform) => void
  // Quick toggle to show only one platform
  showOnlyMac: () => void
  showOnlyWindows: () => void
  showAll: () => void
  // Check if a platform is visible
  isPlatformVisible: (platform: string) => boolean
  // Filter an array of devices by platform
  filterByPlatform: <T extends { platform?: string }>(items: T[]) => T[]
}

const PlatformFilterContext = createContext<PlatformFilterContextType | undefined>(undefined)

/**
 * Normalizes various platform string formats to canonical form
 */
function normalizePlatform(platform?: string): 'macOS' | 'Windows' | 'unknown' {
  if (!platform) return 'unknown'
  
  const lower = platform.toLowerCase()
  
  // Mac variants
  if (lower === 'macos' || lower === 'mac' || lower === 'macintosh' || 
      lower === 'darwin' || lower === 'munki') {
    return 'macOS'
  }
  
  // Windows variants
  if (lower === 'windows' || lower.startsWith('win') || lower === 'cimian') {
    return 'Windows'
  }
  
  // Also check for OS names that indicate platform
  if (lower.includes('mac') || lower.includes('darwin') || lower.includes('macos')) {
    return 'macOS'
  }
  if (lower.includes('windows')) {
    return 'Windows'
  }
  
  return 'unknown'
}

interface PlatformFilterProviderProps {
  children: ReactNode
  defaultPlatform?: Platform
}

export function PlatformFilterProvider({ children, defaultPlatform = 'all' }: PlatformFilterProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Initialize from URL parameter if present
  const urlPlatform = searchParams.get('platform')
  const initialPlatform: Platform = 
    urlPlatform === 'mac' ? 'macOS' : 
    urlPlatform === 'win' ? 'Windows' : 
    defaultPlatform
  
  const [platformFilter, setPlatformFilterState] = useState<Platform>(initialPlatform)

  // Sync state with URL parameter on mount and when URL changes
  useEffect(() => {
    const urlPlatform = searchParams.get('platform')
    if (urlPlatform === 'mac' && platformFilter !== 'macOS') {
      setPlatformFilterState('macOS')
    } else if (urlPlatform === 'win' && platformFilter !== 'Windows') {
      setPlatformFilterState('Windows')
    } else if (!urlPlatform && platformFilter !== 'all') {
      setPlatformFilterState('all')
    }
  }, [searchParams, platformFilter])

  const setPlatformFilter = useCallback((platform: Platform) => {
    setPlatformFilterState(platform)
    
    // Update URL parameter
    const params = new URLSearchParams(searchParams.toString())
    if (platform === 'macOS') {
      params.set('platform', 'mac')
    } else if (platform === 'Windows') {
      params.set('platform', 'win')
    } else {
      params.delete('platform')
    }
    
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)
  }, [pathname, router, searchParams])

  const showOnlyMac = useCallback(() => {
    setPlatformFilterState('macOS')
  }, [])

  const showOnlyWindows = useCallback(() => {
    setPlatformFilterState('Windows')
  }, [])

  const showAll = useCallback(() => {
    setPlatformFilterState('all')
  }, [])

  const isPlatformVisible = useCallback((platform: string): boolean => {
    if (platformFilter === 'all') return true
    const normalized = normalizePlatform(platform)
    if (normalized === 'unknown') return true // Show unknown platforms when filter is active
    return normalized === platformFilter
  }, [platformFilter])

  const filterByPlatform = useCallback(<T extends { platform?: string }>(items: T[]): T[] => {
    if (platformFilter === 'all') return items
    return items.filter(item => {
      const normalized = normalizePlatform(item.platform)
      // Include unknown platforms so we don't hide data
      if (normalized === 'unknown') return true
      return normalized === platformFilter
    })
  }, [platformFilter])

  const value = useMemo(() => ({
    platformFilter,
    setPlatformFilter,
    showOnlyMac,
    showOnlyWindows,
    showAll,
    isPlatformVisible,
    filterByPlatform,
  }), [platformFilter, setPlatformFilter, showOnlyMac, showOnlyWindows, showAll, isPlatformVisible, filterByPlatform])

  return (
    <PlatformFilterContext.Provider value={value}>
      {children}
    </PlatformFilterContext.Provider>
  )
}

export function usePlatformFilter() {
  const context = useContext(PlatformFilterContext)
  if (context === undefined) {
    throw new Error('usePlatformFilter must be used within a PlatformFilterProvider')
  }
  return context
}

/**
 * Helper hook that can be used when the provider might not be present
 * Returns default values if not within a provider
 */
export function usePlatformFilterSafe() {
  const context = useContext(PlatformFilterContext)
  
  // Return default no-op values if not in provider
  if (context === undefined) {
    return {
      platformFilter: 'all' as Platform,
      setPlatformFilter: () => {},
      showOnlyMac: () => {},
      showOnlyWindows: () => {},
      showAll: () => {},
      isPlatformVisible: () => true,
      filterByPlatform: <T extends { platform?: string }>(items: T[]) => items,
    }
  }
  
  return context
}

/**
 * Utility to get platform from various device data structures
 * Priority: 1) system.operatingSystem.name (kernel data - authoritative)
 *           2) device.platform (root level)
 *           3) inventory.platform (fallback)
 *           4) configType (Cimian/Munki for installs page)
 */
export function getDevicePlatform(device: any): 'macOS' | 'Windows' | 'unknown' {
  // Priority 1: System module operatingSystem.name (kernel data - most authoritative)
  const osName = device.modules?.system?.operatingSystem?.name
  if (osName) {
    return normalizePlatform(osName)
  }
  
  // Priority 2: Direct platform field at device root
  if (device.platform) {
    return normalizePlatform(device.platform)
  }
  
  // Priority 3: Inventory module platform (fallback)
  const inventoryPlatform = device.modules?.inventory?.platform
  if (inventoryPlatform) {
    return normalizePlatform(inventoryPlatform)
  }
  
  // Priority 4: configType for installs page
  if (device.configType) {
    if (device.configType === 'Cimian') return 'Windows'
    if (device.configType === 'Munki') return 'macOS'
  }
  
  // Legacy fallbacks
  const legacyOs = device.osName || device.os
  if (legacyOs) {
    return normalizePlatform(legacyOs)
  }
  
  return 'unknown'
}

export { normalizePlatform }
