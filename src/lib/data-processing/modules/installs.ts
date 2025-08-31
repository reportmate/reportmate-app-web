/**
 * Installs Status Module
 * Handles all install status standardization and processing in isolation
 * FIXES: Status capitalization issues by enforcing standard format
 */

export type StandardInstallStatus = 'Installed' | 'Pending' | 'Warning' | 'Error' | 'Removed'

export enum ErrorCategory {
  ARCHITECTURE = 'architecture',
  MSI_INSTALLER = 'msi_installer', 
  EXE_INSTALLER = 'exe_installer',
  CHOCOLATEY = 'chocolatey',
  POWERSHELL = 'powershell',
  TIMEOUT = 'timeout',
  DEPENDENCY = 'dependency',
  SYSTEM = 'system'
}

interface ErrorCodeMapping {
  description: string
  severity: 'error' | 'warning'
  action: string
  category: ErrorCategory
}

const ERROR_CODE_MAPPINGS: Record<string, ErrorCodeMapping> = {
  // MSI Error Codes
  '1603': { 
    description: 'Fatal Installation Error', 
    severity: 'error', 
    action: 'Check system requirements and installer logs',
    category: ErrorCategory.MSI_INSTALLER
  },
  '1618': { 
    description: 'Installer Conflict', 
    severity: 'error', 
    action: 'Another installation is in progress - wait and retry',
    category: ErrorCategory.MSI_INSTALLER
  },
  '3010': { 
    description: 'Reboot Required', 
    severity: 'warning', 
    action: 'System restart needed to complete installation',
    category: ErrorCategory.MSI_INSTALLER
  },
  
  // Architecture Errors
  'ARCH_MISMATCH': { 
    description: 'Architecture Incompatibility', 
    severity: 'error', 
    action: 'Package not compatible with system architecture',
    category: ErrorCategory.ARCHITECTURE
  },
  'architecture_check': { 
    description: 'Architecture Validation Failed', 
    severity: 'error', 
    action: 'Package architecture not supported on this system',
    category: ErrorCategory.ARCHITECTURE
  },
  
  // Chocolatey Errors  
  'CHOCO_DEPENDENCY': { 
    description: 'Dependency Resolution Failed', 
    severity: 'error', 
    action: 'Required dependencies unavailable or incompatible',
    category: ErrorCategory.CHOCOLATEY
  },
  'chocolatey_install': { 
    description: 'Chocolatey Installation Failed', 
    severity: 'error', 
    action: 'Check Chocolatey logs and package availability',
    category: ErrorCategory.CHOCOLATEY
  },
  'chocolatey_upgrade': { 
    description: 'Chocolatey Upgrade Failed', 
    severity: 'error', 
    action: 'Check package version compatibility',
    category: ErrorCategory.CHOCOLATEY
  },
  
  // EXE Errors
  'EXE_TIMEOUT': { 
    description: 'Installation Timeout', 
    severity: 'error', 
    action: 'Installation process exceeded time limit',
    category: ErrorCategory.TIMEOUT
  },
  'exe_timeout': { 
    description: 'EXE Installer Timeout', 
    severity: 'error', 
    action: 'Installer did not complete within expected time',
    category: ErrorCategory.TIMEOUT
  },
  'exe_exit_code_error': { 
    description: 'EXE Installer Failed', 
    severity: 'error', 
    action: 'Check installer exit code and system requirements',
    category: ErrorCategory.EXE_INSTALLER
  },
  
  // PowerShell Errors
  'PS_SCRIPT_FAILED': { 
    description: 'Script Execution Failed', 
    severity: 'error', 
    action: 'Pre/post installation script encountered an error',
    category: ErrorCategory.POWERSHELL
  },
  
  // MSI Specific Actions
  'msi_fatal_error': { 
    description: 'MSI Fatal Error', 
    severity: 'error', 
    action: 'Critical MSI installation failure - check Windows Event Log',
    category: ErrorCategory.MSI_INSTALLER
  },
  'msi_conflict_error': { 
    description: 'MSI Installation Conflict', 
    severity: 'error', 
    action: 'Another MSI installation is currently running',
    category: ErrorCategory.MSI_INSTALLER
  },
  'msi_reboot_required': { 
    description: 'MSI Reboot Required', 
    severity: 'warning', 
    action: 'Installation successful but requires system restart',
    category: ErrorCategory.MSI_INSTALLER
  },
  'msi_timeout': { 
    description: 'MSI Installation Timeout', 
    severity: 'error', 
    action: 'MSI installer did not respond within timeout period',
    category: ErrorCategory.TIMEOUT
  }
}

/**
 * Get enhanced error information from error code
 */
export function getErrorCodeInfo(code?: string): ErrorCodeMapping | null {
  if (!code) return null
  return ERROR_CODE_MAPPINGS[code.toLowerCase()] || ERROR_CODE_MAPPINGS[code] || null
}

/**
 * Categorize error based on code and message content
 */
export function categorizeError(error: ErrorMessage): ErrorCategory {
  const code = error.code?.toLowerCase() || ''
  const message = error.message.toLowerCase()
  
  // Check code-based categorization first
  const codeInfo = getErrorCodeInfo(code)
  if (codeInfo) return codeInfo.category
  
  // Fallback to message-based categorization
  if (message.includes('architecture') || message.includes('arch')) return ErrorCategory.ARCHITECTURE
  if (message.includes('msi') || ['1603', '1618', '3010'].includes(code)) return ErrorCategory.MSI_INSTALLER
  if (message.includes('exe') || message.includes('executable')) return ErrorCategory.EXE_INSTALLER
  if (message.includes('chocolatey') || message.includes('choco')) return ErrorCategory.CHOCOLATEY
  if (message.includes('powershell') || message.includes('script')) return ErrorCategory.POWERSHELL
  if (message.includes('timeout') || message.includes('timed out')) return ErrorCategory.TIMEOUT
  if (message.includes('dependency') || message.includes('depends')) return ErrorCategory.DEPENDENCY
  
  return ErrorCategory.SYSTEM
}

/**
 * Get user-friendly error description
 */
export function getErrorDescription(error: ErrorMessage): string {
  const codeInfo = getErrorCodeInfo(error.code)
  if (codeInfo) return codeInfo.description
  
  // Fallback descriptions based on category
  const category = categorizeError(error)
  switch (category) {
    case ErrorCategory.ARCHITECTURE:
      return 'Architecture Compatibility Issue'
    case ErrorCategory.MSI_INSTALLER:
      return 'MSI Installation Error'
    case ErrorCategory.EXE_INSTALLER:
      return 'Executable Installation Error'
    case ErrorCategory.CHOCOLATEY:
      return 'Chocolatey Package Error'
    case ErrorCategory.POWERSHELL:
      return 'Script Execution Error'
    case ErrorCategory.TIMEOUT:
      return 'Installation Timeout'
    case ErrorCategory.DEPENDENCY:
      return 'Dependency Resolution Error'
    default:
      return 'Installation Error'
  }
}

/**
 * Get recommended action for error
 */
export function getRecommendedAction(error: ErrorMessage): string {
  const codeInfo = getErrorCodeInfo(error.code)
  if (codeInfo) return codeInfo.action
  
  // Enhanced context-based recommendations
  if (error.context?.recommendedAction) return error.context.recommendedAction
  
  // Fallback recommendations based on category
  const category = categorizeError(error)
  switch (category) {
    case ErrorCategory.ARCHITECTURE:
      return 'Verify package architecture compatibility with your system'
    case ErrorCategory.MSI_INSTALLER:
      return 'Check Windows Event Log and verify system requirements'
    case ErrorCategory.EXE_INSTALLER:
      return 'Run installer manually with administrator privileges'
    case ErrorCategory.CHOCOLATEY:
      return 'Check Chocolatey logs and package repository availability'
    case ErrorCategory.POWERSHELL:
      return 'Review script execution policy and permissions'
    case ErrorCategory.TIMEOUT:
      return 'Retry installation or increase timeout settings'
    case ErrorCategory.DEPENDENCY:
      return 'Install required dependencies manually first'
    default:
      return 'Check system logs and contact support if issue persists'
  }
}

export interface InstallsInfo {
  totalPackages: number
  installed: number
  pending: number
  failed: number
  lastUpdate: string
  packages: InstallPackage[]
  systemName?: string
  cacheSizeMb?: number
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
  installedVersion?: string
  status: string // Mapped ReportMate status
  type: string
  lastUpdate: string
  errors?: ErrorMessage[]
  warnings?: WarningMessage[]
  failureCount?: number
  lastAttemptStatus?: string
  recentAttempts?: any[]
}

export interface ErrorContext {
  runType?: string
  exitCode?: string
  exitMeaning?: string
  installerPath?: string
  recommendedAction?: string
  systemArch?: string
  supportedArch?: string[]
  packageId?: string
  packageVersion?: string
  commandUsed?: string
  timeoutDuration?: number
}

export interface ErrorMessage {
  id?: string
  code?: string
  message: string
  timestamp?: string
  level?: string
  package?: string
  context?: ErrorContext
  details?: string
}

export interface WarningMessage {
  id?: string
  code?: string
  message: string
  timestamp?: string
  package?: string
  context?: ErrorContext
  details?: string
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
        lastUpdate: item.lastSeenInSession || '',
        failureCount: item.failureCount || 0,
        lastAttemptStatus: item.lastAttemptStatus,
        recentAttempts: item.recentAttempts || [],
        errors: [],
        warnings: []
      }

      // Extract errors and warnings from recent attempts
      if (item.recentAttempts && Array.isArray(item.recentAttempts)) {
        for (const attempt of item.recentAttempts) {
          if (attempt.status === 'Error' || attempt.status === 'Failed' || attempt.status === 'Failure') {
            packageInfo.errors?.push({
              id: `${item.id || item.name}-${attempt.timestamp || Date.now()}`,
              message: `${attempt.action || 'Operation'} failed${attempt.timestamp ? ` at ${attempt.timestamp}` : ''}`,
              timestamp: attempt.timestamp,
              code: attempt.errorCode || attempt.action,
              package: item.name || item.displayName,
              context: { runType: attempt.runType }
            })
          }
          if (attempt.status === 'Warning' || attempt.warnings) {
            packageInfo.warnings?.push({
              id: `${item.id || item.name}-warning-${attempt.timestamp || Date.now()}`,
              message: `${attempt.action || 'Operation'} warning${attempt.timestamp ? ` at ${attempt.timestamp}` : ''}`,
              timestamp: attempt.timestamp,
              code: attempt.warningCode || attempt.action,
              package: item.name || item.displayName,
              context: { runType: attempt.runType }
            })
          }
        }
      }

      // If item has failure count but no specific errors, add a generic error
      if (item.failureCount > 0 && (!packageInfo.errors || packageInfo.errors.length === 0)) {
        packageInfo.errors?.push({
          id: `${item.id || item.name}-generic-failure`,
          message: `Package has ${item.failureCount} failure(s) recorded`,
          level: 'error',
          package: item.name || item.displayName
        })
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
  
  // Extract cache size from the cacheStatus or latest session
  let cacheSizeMb: number | undefined
  
  // First try to get from cacheStatus (primary source)
  if (installs.cacheStatus?.cache_size_mb) {
    cacheSizeMb = installs.cacheStatus.cache_size_mb
    console.log('[INSTALLS MODULE] Extracted cache size from cacheStatus:', cacheSizeMb)
  }
  // Fallback to sessions if needed
  else if (installs.cimian?.sessions && installs.cimian.sessions.length > 0) {
    const latestSession = installs.cimian.sessions[0]
    cacheSizeMb = latestSession.cacheSizeMb
    console.log('[INSTALLS MODULE] Extracted cache size from session:', {
      sessionId: latestSession.sessionId,
      cacheSizeMb: latestSession.cacheSizeMb
    })
  }

  // Extract session-level errors and warnings - ONLY FROM LATEST SESSION
  const sessionErrors: ErrorMessage[] = []
  const sessionWarnings: WarningMessage[] = []
  
  if (installs.cimian?.sessions && Array.isArray(installs.cimian.sessions) && installs.cimian.sessions.length > 0) {
    // Get only the most recent session (first in array)
    const latestSession = installs.cimian.sessions[0]
    
    console.log('[INSTALLS MODULE] Latest session data:', {
      sessionId: latestSession.sessionId,
      status: latestSession.status,
      failures: latestSession.failures,
      failedItems: latestSession.failedItems,
      endTime: latestSession.endTime,
      startTime: latestSession.startTime
    })
    
    // Only add errors/warnings from this latest session
    if (latestSession.failures > 0 || (latestSession.failedItems && latestSession.failedItems.length > 0)) {
      sessionErrors.push({
        id: `session-${latestSession.sessionId}-failures`,
        message: `Session ${latestSession.sessionId} had ${latestSession.failures} failure(s)${latestSession.failedItems?.length ? ` affecting items: ${latestSession.failedItems.join(', ')}` : ''}`,
        timestamp: latestSession.endTime || latestSession.startTime,
        code: 'SESSION_FAILURES',
        package: 'System',
        context: { runType: latestSession.runType }
      })
    }
    
    // Only add warnings from this latest session
    if (latestSession.packagesPending > 0 && latestSession.status === 'completed') {
      sessionWarnings.push({
        id: `session-${latestSession.sessionId}-pending`,
        message: `Session ${latestSession.sessionId} completed with ${latestSession.packagesPending} packages still pending`,
        timestamp: latestSession.endTime || latestSession.startTime,
        code: 'PENDING_PACKAGES',
        package: 'System',
        context: { runType: latestSession.runType }
      })
    }
  }

  // Collect all package-level errors and warnings
  const packageErrors: ErrorMessage[] = []
  const packageWarnings: WarningMessage[] = []
  
  for (const pkg of packages) {
    if (pkg.errors && pkg.errors.length > 0) {
      packageErrors.push(...pkg.errors)
    }
    if (pkg.warnings && pkg.warnings.length > 0) {
      packageWarnings.push(...pkg.warnings)
    }
  }
  
  console.log('[INSTALLS MODULE] Latest session only - Errors/Warnings:', {
    sessionErrors: sessionErrors.length,
    sessionWarnings: sessionWarnings.length,
    packageErrors: packageErrors.length,
    packageWarnings: packageWarnings.length,
    latestSessionId: installs.cimian?.sessions?.[0]?.sessionId
  })

  const installsInfo: InstallsInfo = {
    totalPackages: packages.length,
    installed: statusCounts.installed,
    pending: statusCounts.pending,
    failed: statusCounts.errors + statusCounts.warnings,
    lastUpdate: installs.lastCheckIn || installs.collected_at || '',
    packages,
    systemName: installs.cimian?.config?.systemName || 'Cimian',
    cacheSizeMb,
    config: {
      type: 'Cimian',
      version: installs.cimian?.version || installs.version,
      lastRun: installs.lastCheckIn,
      runType: latestRunType,
      duration: latestDuration
    },
    messages: {
      errors: [...sessionErrors, ...packageErrors],
      warnings: [...sessionWarnings, ...packageWarnings]
    }
  }

  console.log('[INSTALLS MODULE] Installs info extracted:', {
    totalPackages: installsInfo.totalPackages,
    statusBreakdown: statusCounts,
    systemName: installsInfo.systemName,
    errorsFound: installsInfo.messages?.errors.length || 0,
    warningsFound: installsInfo.messages?.warnings.length || 0,
    errorMessages: installsInfo.messages?.errors.map(e => e.message) || [],
    warningMessages: installsInfo.messages?.warnings.map(w => w.message) || []
  })

  return installsInfo
}
