/**
 * Installs Status Module
 * Handles all install status standardization and processing in isolation
 * FIXES: Status capitalization issues by enforcing standard format
 */

export type StandardInstallStatus = 'Installed' | 'Pending' | 'Warning' | 'Error' | 'Removed'

export interface InstallsInfo {
  totalPackages: number
  installed: number
  pending: number
  failed: number
  lastUpdate: string
  packages: InstallPackage[]
  systemName?: string
  config?: {
    type: string
    version?: string
    softwareRepoURL?: string
    manifest?: string
    runType?: string
    lastRun?: string
    duration?: string
  }
  messages?: {
    errors: ErrorMessage[]
    warnings: WarningMessage[]
  }
}

export interface InstallPackage {
  id: string
  name: string
  displayName: string
  version: string
  status: string // Mapped ReportMate status
  type: string
  lastUpdate: string
}

export interface ErrorMessage {
  code?: string
  message: string
  timestamp?: string
  level?: string
}

export interface WarningMessage {
  code?: string
  message: string
  timestamp?: string
}

/**
 * CRITICAL FIX: Standardize install status to proper capitalization
 * Maps any incoming status to the standard format
 */
export function standardizeInstallStatus(rawStatus: string): StandardInstallStatus {
  if (!rawStatus || typeof rawStatus !== 'string') {
    console.warn('[INSTALLS STATUS MODULE] Invalid status value:', rawStatus, 'defaulting to Pending')
    return 'Pending'
  }

  // Trim whitespace but preserve capitalization first
  const trimmed = rawStatus.trim()
  
  // If it's already a valid standardized status, return as-is
  if (['Installed', 'Pending', 'Warning', 'Error', 'Removed'].includes(trimmed)) {
    console.log('[INSTALLS STATUS MODULE] Status already standardized:', { raw: rawStatus, result: trimmed })
    return trimmed as StandardInstallStatus
  }

  // Normalize to lowercase for comparison, then return proper capitalized version
  const normalized = trimmed.toLowerCase()
  
  console.log('[INSTALLS STATUS MODULE] Standardizing status:', {
    raw: rawStatus,
    trimmed: trimmed,
    normalized: normalized
  })

  switch (normalized) {
    // Installed variants
    case 'installed':
    case 'install':
    case 'success':
    case 'successful':
    case 'completed':
    case 'complete':
    case 'up to date':
    case 'uptodate':
    case 'current':
    case 'ok':
      return 'Installed'

    // Pending variants  
    case 'pending':
    case 'pending install':
    case 'pending_install':
    case 'pending update':
    case 'pending_update':
    case 'available':
    case 'update available':
    case 'update_available':
    case 'downloading':
    case 'installing':
    case 'queued':
    case 'waiting':
    case 'scheduled':
      return 'Pending'

    // Warning variants
    case 'warning':
    case 'warnings':
    case 'warn':
    case 'caution':
    case 'needs attention':
    case 'needs_attention':
    case 'partial':
    case 'partially installed':
    case 'outdated':
      return 'Warning'

    // Error variants
    case 'error':
    case 'errors':
    case 'failed':
    case 'failure':
    case 'fail':
    case 'broken':
    case 'corrupt':
    case 'corrupted':
    case 'missing':
    case 'not found':
    case 'not_found':
    case 'invalid':
    case 'timeout':
    case 'cancelled':
    case 'canceled':
      return 'Error'

    // Removed variants
    case 'removed':
    case 'uninstalled':
    case 'deleted':
    case 'absent':
    case 'not installed':
    case 'not_installed':
      return 'Removed'

    // Unknown/default
    default:
      console.warn('[INSTALLS STATUS MODULE] Unknown status:', rawStatus, 'defaulting to Pending')
      return 'Pending'
  }
}

/**
 * Extract and process installs information from device modules
 * MODULAR: Self-contained installs data processing with status standardization
 */
/**
 * Extract install status information from device modules
 * FIXES: Status capitalization issues by enforcing standard format
 * VERSION: 2025-08-30 22:25 - Force refresh to verify duration extraction
 */
export function extractInstalls(deviceModules: any): InstallsInfo {
  console.log('[INSTALLS MODULE] === STARTING EXTRACT INSTALLS v2025-08-30 ===')
  console.log('[INSTALLS MODULE] Input deviceModules:', {
    hasDeviceModules: !!deviceModules,
    deviceModulesType: typeof deviceModules,
    deviceModulesKeys: deviceModules ? Object.keys(deviceModules) : 'no keys',
    hasInstalls: !!deviceModules?.installs,
    installsStructure: deviceModules?.installs ? Object.keys(deviceModules.installs) : 'no installs'
  })

  // FULL INSTALLS MODULE DEBUG
  if (deviceModules?.installs) {
    console.log('[INSTALLS MODULE] FULL INSTALLS MODULE STRUCTURE:', JSON.stringify(deviceModules.installs, null, 2))
  }
  
  if (!deviceModules?.installs) {
    console.log('[INSTALLS MODULE] No installs data found in modules')
    return {
      totalPackages: 0,
      installed: 0,
      pending: 0,
      failed: 0,
      lastUpdate: '',
      packages: [],
      messages: { errors: [], warnings: [] }
    }
  }

  const installs = deviceModules.installs
  
  console.log('[INSTALLS MODULE] Processing installs data:', {
    hasRecentInstalls: !!installs.recentInstalls,
    recentInstallsCount: installs.recentInstalls?.length || 0,
    hasCimian: !!installs.cimian,
    hasConfig: !!installs.cimian?.config
  })

  const packages: InstallPackage[] = []
  let statusCounts = {
    installed: 0,
    pending: 0,
    warnings: 0,
    errors: 0,
    removed: 0
  }

  // Process recent installs (contains Cimian data)
  if (installs.recentInstalls && Array.isArray(installs.recentInstalls)) {
    console.log('[INSTALLS MODULE] 🔍 PROCESSING RECENT INSTALLS - COUNT:', installs.recentInstalls.length)
    for (const item of installs.recentInstalls) {
      console.log('[INSTALLS MODULE] 🔍 RAW ITEM STRUCTURE:', {
        fullItem: JSON.stringify(item, null, 2),
        name: item.name,
        status: item.status,
        statusType: typeof item.status,
        version: item.version,
        installedVersion: item.installedVersion,
        allKeys: Object.keys(item)
      })
      
      // CRITICAL FIX: Override status based on version comparison for Cimian packages
      let finalStatus: StandardInstallStatus
      
      if (item.type === 'cimian' && item.version && item.installedVersion) {
        if (item.version === item.installedVersion) {
          finalStatus = 'Installed'
          console.log('[INSTALLS MODULE] 🔄 CIMIAN VERSION FIX - INSTALLED:', {
            name: item.name,
            version: item.version,
            installed: item.installedVersion,
            originalStatus: item.status,
            newStatus: finalStatus
          })
        } else {
          finalStatus = 'Pending'
          console.log('[INSTALLS MODULE] 🔄 CIMIAN VERSION FIX - PENDING UPDATE:', {
            name: item.name,
            version: item.version,
            installed: item.installedVersion,
            originalStatus: item.status,
            newStatus: finalStatus
          })
        }
      } else {
        // For non-Cimian packages, use the standardized status
        finalStatus = standardizeInstallStatus(item.status)
      }
      
      console.log('[INSTALLS MODULE] 🔍 FINAL STATUS MAPPING:', {
        raw: item.status,
        final: finalStatus,
        name: item.name,
        isCimian: item.type === 'cimian',
        hasVersions: !!(item.version && item.installedVersion)
      })
      
      const packageInfo: InstallPackage = {
        id: item.id || item.name || 'unknown',
        name: item.name || 'Unknown Package',
        displayName: item.displayName || item.name || 'Unknown Package',
        version: item.version || item.installedVersion || '',
        status: finalStatus,  // ENFORCED: Version-based for Cimian, standardized for others
        type: item.type || 'Package',
        lastUpdate: item.lastSeenInSession || ''
      }

      packages.push(packageInfo)

      // Count by final status
      switch (finalStatus) {
        case 'Installed': statusCounts.installed++; break
        case 'Pending': statusCounts.pending++; break
        case 'Warning': statusCounts.warnings++; break
        case 'Error': statusCounts.errors++; break
        case 'Removed': statusCounts.removed++; break
      }

      console.log('[INSTALLS MODULE] Processed package:', {
        name: packageInfo.name,
        rawStatus: item.status,
        finalStatus: finalStatus
      })
    }
  }

  // Extract run type and duration from latest COMPLETED session
  let latestRunType = 'Unknown'
  let latestDuration = 'Unknown'
  
  if (installs.cimian?.sessions && Array.isArray(installs.cimian.sessions) && installs.cimian.sessions.length > 0) {
    // Find the most recent completed session (not running)
    const completedSession = installs.cimian.sessions.find((session: any) => 
      session.status === 'completed' && session.duration && session.duration !== '00:00:00'
    )
    
    if (completedSession) {
      latestRunType = completedSession.runType || 'Unknown'
      latestDuration = completedSession.duration || 'Unknown'
      
      console.log('[INSTALLS MODULE] Using completed session data:', {
        sessionId: completedSession.sessionId,
        runType: completedSession.runType,
        duration: completedSession.duration,
        status: completedSession.status
      })
    } else {
      // Fallback to first session if no completed sessions found
      const latestSession = installs.cimian.sessions[0]
      latestRunType = latestSession.runType || 'Unknown'
      latestDuration = latestSession.duration || 'Unknown'
      
      console.log('[INSTALLS MODULE] Using latest session data (may be running):', {
        sessionId: latestSession.sessionId,
        runType: latestSession.runType,
        duration: latestSession.duration,
        status: latestSession.status
      })
    }
  }

  const installsInfo: InstallsInfo = {
    totalPackages: packages.length,
    installed: statusCounts.installed,
    pending: statusCounts.pending,
    failed: statusCounts.errors + statusCounts.warnings,
    lastUpdate: installs.lastCheckIn || installs.collected_at || '',
    packages,
    systemName: installs.cimian?.config?.systemName || 'Cimian',
    config: {
      type: 'Cimian',
      version: installs.version,
      lastRun: installs.lastCheckIn,
      runType: latestRunType,
      duration: latestDuration
    },
    messages: {
      errors: [],
      warnings: []
    }
  }

  console.log('[INSTALLS MODULE] Installs info extracted:', {
    totalPackages: installsInfo.totalPackages,
    statusBreakdown: statusCounts,
    systemName: installsInfo.systemName
  })

  return installsInfo
}
