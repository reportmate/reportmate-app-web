/**
 * Device Status Module
 * Handles all device status calculation logic in isolation
 */

export type DeviceStatus = 'active' | 'stale' | 'warning' | 'error' | 'missing' | 'archived' | 'storage'

/**
 * What an asset inventory system says a device is doing. A device it reports
 * as checked in to a storage room is expected to be silent, so it is shown as
 * stored rather than stale or missing.
 */
export interface InventoryState {
  state: 'checked_out' | 'storage' | 'decommissioning'
  storageLocation?: string | null
  leaseNumber?: string | null
  assetTag?: string | null
  updatedAt?: string | null
}

export function isStored(inventoryState?: InventoryState | null): boolean {
  return inventoryState?.state === 'storage'
}

interface StatusConfig {
  activeThresholdHours: number    // Default: 24
  staleThresholdHours: number     // Default: 168 (7 days)
}

const DEFAULT_CONFIG: StatusConfig = {
  activeThresholdHours: 24,
  staleThresholdHours: 168 // 7 days
}

/**
 * Calculate device status based on lastSeen timestamp
 * MODULAR: Self-contained status logic
 */
export function calculateDeviceStatus(
  lastSeen: string | Date | null | undefined, 
  config: Partial<StatusConfig> = {},
  isArchived: boolean = false,
  inventoryState?: InventoryState | null
): DeviceStatus {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  if (isArchived) return 'archived'
  if (isStored(inventoryState)) return 'storage'
  if (!lastSeen) return 'missing'
  
  try {
    const lastSeenDate = new Date(lastSeen)
    if (isNaN(lastSeenDate.getTime())) return 'missing'
    
    const now = new Date()
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < finalConfig.activeThresholdHours) return 'active'
    if (diffHours < finalConfig.staleThresholdHours) return 'stale'
    return 'missing'
    
  } catch (error) {
    console.error('[DEVICE STATUS MODULE] Error calculating status:', error)
    return 'missing'
  }
}

export type ReportDeviceStatus = 'active' | 'stale' | 'missing' | 'storage'

/**
 * The four buckets a report's device-status pills offer. A stored device is
 * Storage before any last-seen arithmetic, so it never reads as stale or
 * missing; everything that is not active, stale or stored is missing.
 */
export function reportDeviceStatus(device: {
  lastSeen?: string | Date | null
  inventoryState?: InventoryState | null
}): ReportDeviceStatus {
  const status = calculateDeviceStatus(device.lastSeen, {}, false, device.inventoryState)
  if (status === 'storage' || status === 'active' || status === 'stale') return status
  return 'missing'
}

/**
 * Normalize lastSeen value to valid ISO string
 * MODULAR: Self-contained timestamp normalization
 */
export function normalizeLastSeen(lastSeenValue: any): string {
  // Handle various invalid lastSeen values
  if (!lastSeenValue || 
      lastSeenValue === 'null' || 
      lastSeenValue === 'undefined' || 
      lastSeenValue === '' ||
      (typeof lastSeenValue === 'string' && lastSeenValue.trim() === '') ||
      (lastSeenValue instanceof Date && isNaN(lastSeenValue.getTime())) ||
      (typeof lastSeenValue === 'string' && isNaN(new Date(lastSeenValue).getTime()))) {
    
    return new Date().toISOString()
  }
  
  return typeof lastSeenValue === 'string' ? lastSeenValue : new Date(lastSeenValue).toISOString()
}
