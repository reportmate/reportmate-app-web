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
    duration?: string | number
    durationSeconds?: number
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
  itemSize?: string // Item size in bytes
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
    // Installed variants (maps to 'success' for events per user requirements)
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

    // Pending variants - CRITICAL FIX: Added "pending update" status from Cimian
    case 'pending':
    case 'pending install':
    case 'pending_install':
    case 'pending update':
    case 'pending_update':
    case 'pendingupdate':
    case 'available':
    case 'update available':
    case 'update_available':
    case 'downloading':
    case 'installing':
    case 'queued':
    case 'waiting':
    case 'scheduled':
    case 'not available':
    case 'not_available':
    case 'notavailable':
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
 * Map install status to event type for ReportMate events
 * Per user requirements: Installs module should only report success/warning/error events
 */
export function mapStatusToEventType(status: StandardInstallStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'Installed':
      return 'success'
    case 'Warning':
      return 'warning'
    case 'Error':
      return 'error'
    case 'Pending':
    case 'Removed':
    default:
      // Pending and Removed are typically info-level, but per requirements, map to success
      return 'success'
  }
}

/**
 * Get the latest attempt timestamp from recentAttempts array
 * Returns the timestamp from the most recent attempt, or fallback to lastSeenInSession
 */
function getLatestAttemptTimestamp(item: any): string {
  if (item.recentAttempts && Array.isArray(item.recentAttempts) && item.recentAttempts.length > 0) {
    // Find the attempt with the latest timestamp
    const latestAttempt = item.recentAttempts.reduce((latest: any, current: any) => {
      if (!latest) return current;
      if (!current.timestamp) return latest;
      if (!latest.timestamp) return current;
      
      const currentTime = new Date(current.timestamp).getTime();
      const latestTime = new Date(latest.timestamp).getTime();
      
      return currentTime > latestTime ? current : latest;
    }, null);
    
    if (latestAttempt?.timestamp) {
      return latestAttempt.timestamp;
    }
  }
  
  // Fallback to existing fields
  return item.lastSeenInSession || item.lastUpdate || '';
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

  // Process recent installs (contains Cimian data) - CRITICAL FIX: Use cimian.items as primary source
  let packagesToProcess = []
  
  // CRITICAL FIX: Check cimian.items FIRST as it contains the real data
  if (installs.cimian?.items && Array.isArray(installs.cimian.items) && installs.cimian.items.length > 0) {
    packagesToProcess = installs.cimian.items.map((item: any) => ({
      ...item,
      name: item.itemName || item.displayName || item.name || 'Unknown',
      displayName: item.displayName || item.itemName || item.name || 'Unknown',
      status: item.currentStatus, // Keep original status for standardization
      version: item.latestVersion || item.installedVersion || item.version || 'Unknown',
      id: item.id || item.itemName?.toLowerCase() || 'unknown',
      type: 'cimian',
      lastSeenInSession: item.lastSeenInSession || installs.lastCheckIn || installs.collectedAt || ''
    }))
    console.log('[INSTALLS MODULE] ✅ PROCESSING CIMIAN.ITEMS - COUNT:', installs.cimian.items.length)
  } else if (installs.recentInstalls && Array.isArray(installs.recentInstalls) && installs.recentInstalls.length > 0) {
    packagesToProcess = installs.recentInstalls
    console.log('[INSTALLS MODULE] 🔍 PROCESSING RECENT INSTALLS - COUNT:', installs.recentInstalls.length)
  } else if (installs.cimian?.pendingPackages && Array.isArray(installs.cimian.pendingPackages) && installs.cimian.pendingPackages.length > 0) {
    // FALLBACK: If no items or recentInstalls, create package objects from cimian.pendingPackages
    packagesToProcess = installs.cimian.pendingPackages.map((pkgName: string) => ({
      name: pkgName,
      displayName: pkgName,
      status: 'Pending',
      type: 'cimian',
      version: 'Unknown',
      id: pkgName,
      lastSeenInSession: installs.lastCheckIn || installs.collectedAt || ''
    }))
    console.log('[INSTALLS MODULE] 🔄 FALLBACK TO CIMIAN PENDING PACKAGES:', {
      pendingPackages: installs.cimian.pendingPackages,
      processedCount: packagesToProcess.length
    })
  } else {
    console.log('[INSTALLS MODULE] ⚠️ NO PACKAGE DATA FOUND:', {
      hasRecentInstalls: !!installs.recentInstalls,
      recentInstallsLength: installs.recentInstalls?.length || 0,
      hasCimianItems: !!installs.cimian?.items,
      cimianItemsLength: installs.cimian?.items?.length || 0,
      hasCimianPending: !!installs.cimian?.pendingPackages,
      cimianPendingLength: installs.cimian?.pendingPackages?.length || 0
    })
  }
  
  if (packagesToProcess.length > 0) {
    for (const item of packagesToProcess) {
      console.log('[INSTALLS MODULE] 🔍 RAW ITEM STRUCTURE:', {
        fullItem: JSON.stringify(item, null, 2),
        name: item.name,
        status: item.status,
        statusType: typeof item.status,
        version: item.version,
        installedVersion: item.installedVersion,
        allKeys: Object.keys(item)
      })
      
      // CRITICAL FIX: For Cimian packages, respect the raw status first, then fall back to version comparison
      let finalStatus: StandardInstallStatus
      
      if (item.type === 'cimian') {
        // First, try to standardize the raw status
        const standardizedRawStatus = standardizeInstallStatus(item.status)
        
        // For Cimian, if the raw status indicates pending/error/warning, trust it
        if (standardizedRawStatus === 'Pending' || standardizedRawStatus === 'Error' || standardizedRawStatus === 'Warning') {
          finalStatus = standardizedRawStatus
          console.log('[INSTALLS MODULE] 🔄 CIMIAN STATUS OVERRIDE - TRUSTING RAW STATUS:', {
            name: item.name,
            rawStatus: item.status,
            standardizedStatus: standardizedRawStatus,
            version: item.version,
            installed: item.installedVersion,
            reason: 'Raw status indicates non-installed state'
          })
        } else if (item.version && item.installedVersion) {
          // Only use version comparison as fallback for unclear statuses
          if (item.version === item.installedVersion) {
            finalStatus = 'Installed'
            console.log('[INSTALLS MODULE] 🔄 CIMIAN VERSION FALLBACK - INSTALLED:', {
              name: item.name,
              version: item.version,
              installed: item.installedVersion,
              originalStatus: item.status,
              reason: 'Versions match and raw status not definitive'
            })
          } else {
            finalStatus = 'Pending'
            console.log('[INSTALLS MODULE] 🔄 CIMIAN VERSION FALLBACK - PENDING UPDATE:', {
              name: item.name,
              version: item.version,
              installed: item.installedVersion,
              originalStatus: item.status,
              reason: 'Version mismatch'
            })
          }
        } else {
          // No version info, use standardized status
          finalStatus = standardizedRawStatus
          console.log('[INSTALLS MODULE] 🔄 CIMIAN NO VERSION INFO - USING STANDARDIZED:', {
            name: item.name,
            rawStatus: item.status,
            finalStatus: finalStatus
          })
        }
      } else {
        // For non-Cimian packages, use the standardized status
        finalStatus = standardizeInstallStatus(item.status)
        console.log('[INSTALLS MODULE] 🔍 STATUS STANDARDIZATION:', {
          name: item.name,
          rawStatus: item.status,
          rawStatusType: typeof item.status,
          standardizedStatus: finalStatus,
          type: item.type
        })
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
        lastUpdate: getLatestAttemptTimestamp(item),
        itemSize: item.itemSize,
        failureCount: item.failureCount || 0,
        lastAttemptStatus: item.lastAttemptStatus,
        recentAttempts: item.recentAttempts || [],
        errors: [],
        warnings: []
      }

      // CRITICAL FIX: Use lastError and lastWarning fields from Cimian (added in Windows client version 2025.10.03.1427)
      // These fields contain the actual error/warning messages from the MDM system
      if (item.lastError && item.lastError.trim() !== '') {
        packageInfo.errors?.push({
          id: `${item.id || item.name}-last-error`,
          message: item.lastError,
          timestamp: item.lastUpdate || item.lastAttemptTime || new Date().toISOString(),
          code: item.hasInstallLoop ? 'INSTALL_LOOP' : 'ERROR',
          package: item.name || item.displayName,
          context: { 
            runType: 'manual'
          }
        })
        
        console.log('[INSTALLS MODULE] ✅ Added lastError for package:', {
          packageName: item.name,
          error: item.lastError,
          timestamp: item.lastUpdate,
          failureCount: item.failureCount
        })
      }
      
      if (item.lastWarning && item.lastWarning.trim() !== '') {
        packageInfo.warnings?.push({
          id: `${item.id || item.name}-last-warning`,
          message: item.lastWarning,
          timestamp: item.lastUpdate || item.lastAttemptTime || new Date().toISOString(),
          code: item.hasInstallLoop ? 'INSTALL_LOOP' : 'WARNING',
          package: item.name || item.displayName,
          context: { 
            runType: 'manual'
          }
        })
        
        console.log('[INSTALLS MODULE] ✅ Added lastWarning for package:', {
          packageName: item.name,
          warning: item.lastWarning,
          timestamp: item.lastUpdate,
          warningCount: item.warningCount
        })
      }

      // Note: No longer adding generic errors based on failureCount 
      // since failureCount includes historical failures, not just latest session

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
  } else {
    console.log('[INSTALLS MODULE] 📦 NO PACKAGES TO PROCESS - Creating empty install info')
  }

  // Add system-level warnings for packages with known issues
  // This adds warnings based on overall package state, not tied to specific sessions
  for (const pkg of packages) {
    if (pkg.name === 'DotNetRuntime' && (pkg.failureCount || 0) > 0) {
      pkg.warnings?.push({
        id: `${pkg.id}-architecture-warning`,
        message: `DotNetRuntime has ${pkg.failureCount || 0} failure(s) - likely ARM64 vs x64 architecture mismatch`,
        timestamp: new Date().toISOString(),
        code: 'ARCHITECTURE_MISMATCH',
        package: pkg.name,
        context: { 
          runType: 'manual'
        }
      })
      console.log('[INSTALLS MODULE] 🚨 Added DotNetRuntime architecture warning for package with failureCount:', pkg.failureCount || 0)
    }
  }

  // Update package statuses based on warnings/errors added and recalculate status counts
  statusCounts = {
    installed: 0,
    pending: 0,
    warnings: 0,
    errors: 0,
    removed: 0
  }

  for (const pkg of packages) {
    // Update status based on warnings/errors
    if (pkg.errors && pkg.errors.length > 0) {
      pkg.status = 'Error'
    } else if (pkg.warnings && pkg.warnings.length > 0) {
      pkg.status = 'Warning'
    }
    // Otherwise keep the original status

    // Recount statuses
    switch (pkg.status) {
      case 'Installed': statusCounts.installed++; break
      case 'Pending': statusCounts.pending++; break
      case 'Warning': statusCounts.warnings++; break
      case 'Error': statusCounts.errors++; break
      case 'Removed': statusCounts.removed++; break
    }
  }

  console.log('[INSTALLS MODULE] ✅ Updated status counts after adding warnings/errors:', statusCounts)

  // Extract run type and duration from latest session WITH ACTIVITY
  // Prioritize sessions that actually did something (installs/updates/failures) over quick checkonly runs
  let latestRunType = 'Manual'  // Default to Manual instead of Unknown
  let latestDuration = 'Unknown'
  let latestDurationSeconds: number | undefined
  
  if (installs.recentSessions && Array.isArray(installs.recentSessions) && installs.recentSessions.length > 0) {
    // Find the most recent session with actual activity (completed or partial_failure with actions/failures)
    const sessionWithActivity = installs.recentSessions.find((session: any) => 
      (session.status === 'completed' || session.status === 'partial_failure') && 
      (session.totalActions > 0 || session.packagesFailed > 0 || session.packagesInstalled > 0 || session.failures > 0 || session.installs > 0 || session.updates > 0)
    )
    
    if (sessionWithActivity) {
      latestRunType = sessionWithActivity.runType || 'Manual'
      latestDuration = sessionWithActivity.duration || 'Unknown'
      latestDurationSeconds = sessionWithActivity.duration_seconds
      
      console.log('[INSTALLS MODULE] Using session with activity:', {
        sessionId: sessionWithActivity.sessionId,
        runType: sessionWithActivity.runType,
        duration: sessionWithActivity.duration,
        durationSeconds: sessionWithActivity.duration_seconds,
        status: sessionWithActivity.status,
        totalActions: sessionWithActivity.totalActions,
        packagesFailed: sessionWithActivity.packagesFailed
      })
    } else {
      // Fallback to first completed session (even checkonly)
      const completedSession = installs.recentSessions.find((session: any) => 
        session.status === 'completed' && session.duration && session.duration !== '00:00:00'
      )
      
      if (completedSession) {
        latestRunType = completedSession.runType || 'Manual'
        latestDuration = completedSession.duration || 'Unknown'
        latestDurationSeconds = completedSession.duration_seconds
        
        console.log('[INSTALLS MODULE] Using completed session (no activity found):', {
          sessionId: completedSession.sessionId,
          runType: completedSession.runType,
          duration: completedSession.duration,
          durationSeconds: completedSession.duration_seconds,
          status: completedSession.status
        })
      } else {
        // Final fallback to first session
        const latestSession = installs.recentSessions[0]
        latestRunType = latestSession.runType || 'Manual'
        latestDuration = latestSession.duration || 'Unknown'
        latestDurationSeconds = latestSession.duration_seconds
        
        console.log('[INSTALLS MODULE] Using latest session data (fallback):', {
          sessionId: latestSession.sessionId,
          runType: latestSession.runType,
          duration: latestSession.duration,
          durationSeconds: latestSession.duration_seconds,
          status: latestSession.status
        })
      }
    }
  }
  // Fallback to cimian.sessions if recentSessions is not available
  else if (installs.cimian?.sessions && Array.isArray(installs.cimian.sessions) && installs.cimian.sessions.length > 0) {
    // Find the most recent session with activity from cimian.sessions
    const sessionWithActivity = installs.cimian.sessions.find((session: any) => 
      (session.status === 'completed' || session.status === 'partial_failure') && 
      (session.total_actions > 0 || session.packagesFailed > 0 || session.packagesInstalled > 0 || session.failures > 0 || session.installs > 0 || session.updates > 0) &&
      session.duration_seconds > 0
    )
    
    if (sessionWithActivity) {
      latestRunType = sessionWithActivity.run_type || sessionWithActivity.runType || 'Manual'
      latestDuration = sessionWithActivity.duration || 'Unknown'
      latestDurationSeconds = sessionWithActivity.duration_seconds
      
      console.log('[INSTALLS MODULE] Using cimian session with activity:', {
        sessionId: sessionWithActivity.session_id,
        runType: sessionWithActivity.run_type || sessionWithActivity.runType,
        durationSeconds: sessionWithActivity.duration_seconds,
        status: sessionWithActivity.status,
        totalActions: sessionWithActivity.total_actions,
        packagesFailed: sessionWithActivity.packagesFailed
      })
    } else {
      // Fallback to first cimian completed session
      const completedSession = installs.cimian.sessions.find((session: any) => 
        session.status === 'completed' && session.duration_seconds > 0
      )
      
      if (completedSession) {
        latestRunType = completedSession.run_type || completedSession.runType || 'Manual'
        latestDuration = completedSession.duration || 'Unknown'
        latestDurationSeconds = completedSession.duration_seconds
        
        console.log('[INSTALLS MODULE] Using completed cimian session (no activity found):', {
          sessionId: completedSession.session_id,
          runType: completedSession.run_type || completedSession.runType,
          durationSeconds: completedSession.duration_seconds,
          status: completedSession.status
        })
      } else {
        // Final fallback to first cimian session
        const latestSession = installs.cimian.sessions[0]
        latestRunType = latestSession.run_type || latestSession.runType || 'Manual'
        latestDuration = latestSession.duration || 'Unknown'
        latestDurationSeconds = latestSession.duration_seconds
        
        console.log('[INSTALLS MODULE] Using latest cimian session data (fallback):', {
          sessionId: latestSession.session_id,
          runType: latestSession.run_type || latestSession.runType,
          durationSeconds: latestSession.duration_seconds,
          status: latestSession.status
        })
      }
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
  else if (installs.recentSessions && installs.recentSessions.length > 0) {
    const latestSession = installs.recentSessions[0]
    cacheSizeMb = latestSession.cacheSizeMb
    console.log('[INSTALLS MODULE] Extracted cache size from session:', {
      sessionId: latestSession.sessionId,
      cacheSizeMb: latestSession.cacheSizeMb
    })
  }

  // Extract session-level errors and warnings - ONLY FROM LATEST COMPLETED SESSION
  const sessionErrors: ErrorMessage[] = []
  const sessionWarnings: WarningMessage[] = []
  
  if (installs.recentSessions && Array.isArray(installs.recentSessions) && installs.recentSessions.length > 0) {
    // Find the most recent session that finished (completed or partial_failure) and has actual activity
    // We want errors ONLY from the last session with actual results, not accumulated from all history
    const latestCompletedSession = installs.recentSessions.find((session: any) => 
      (session.status === 'completed' || session.status === 'partial_failure') && 
      (session.totalActions > 0 || session.packagesFailed > 0 || session.failures > 0)
    )
    
    console.log('[INSTALLS MODULE] 🎯 FILTERING TO LATEST COMPLETED SESSION ONLY:', {
      totalSessions: installs.recentSessions.length,
      latestCompletedFound: !!latestCompletedSession,
      latestCompletedSessionId: latestCompletedSession?.sessionId,
      latestCompletedStatus: latestCompletedSession?.status,
      latestCompletedFailures: latestCompletedSession?.failures,
      latestCompletedPackagesFailed: latestCompletedSession?.packagesFailed
    })
    
    // CRITICAL: Only process errors from the latest COMPLETED session
    if (latestCompletedSession) {
      console.log('[INSTALLS MODULE] ✅ Processing errors from latest completed session:', {
        sessionId: latestCompletedSession.sessionId,
        status: latestCompletedSession.status,
        failures: latestCompletedSession.failures,
        packagesFailed: latestCompletedSession.packagesFailed,
        failedItems: latestCompletedSession.failedItems,
        endTime: latestCompletedSession.endTime
      })
      
      // Note: Removed system-level warnings for pending packages 
      // These are just noise since users can see package statuses directly
    } else {
      console.log('[INSTALLS MODULE] ⚠️ No completed sessions found - no session errors to report')
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
  
  console.log('[INSTALLS MODULE] ✅ Latest completed session only - Errors/Warnings:', {
    sessionErrors: sessionErrors.length,
    sessionWarnings: sessionWarnings.length,
    packageErrors: packageErrors.length,
    packageWarnings: packageWarnings.length,
    latestCompletedSessionId: installs.cimian?.sessions?.find((s: any) => s.status === 'completed' && s.endTime)?.sessionId || 'none'
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
      duration: latestDurationSeconds || latestDuration,
      durationSeconds: latestDurationSeconds
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
