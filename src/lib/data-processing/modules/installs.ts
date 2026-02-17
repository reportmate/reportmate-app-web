import { normalizeCimianTimestamp } from '../../time'

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
  category?: string // Category from pkgsinfo (e.g., "Management", "Drivers", "Utilities")
  developer?: string // Developer from pkgsinfo
  errors?: ErrorMessage[]
  warnings?: WarningMessage[]
  pendingReason?: string // Why the package is pending (e.g., "Update available: 1.0 → 2.0")
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
 * Standardize install status to proper capitalization
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
        return trimmed as StandardInstallStatus
  }

  // Normalize to lowercase for comparison, then return proper capitalized version
  const normalized = trimmed.toLowerCase()
  
  
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

    // Pending variants - includes "pending update" status from Cimian
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
 * Get the latest attempt timestamp from recentAttempts array.
 * 
 * Cimian's last_update field reflects when package metadata was last updated,
 * NOT when it was actually installed. For pre-existing packages, this can be old/misleading.
 * 
 * Logic:
 * - Check recentAttempts array first for actual attempt timestamps
 * - If installCount > 0 or updateCount > 0: Package was actually processed by Cimian, show timestamp
 * - If status is "Installed" but installCount == 0 and updateCount == 0: Package was pre-existing, hide timestamp
 * - For Pending/Error/Warning status: Show last_attempt_time (when it was last tried)
 * - NEVER show last_seen_in_session for pre-existing packages (that's just when Cimian saw it, not when it was processed)
 * 
 * Supports both snake_case (new) and camelCase (legacy) field names
 */
function getLatestAttemptTimestamp(item: any): string {
  // Support both snake_case and camelCase field names
  const status = standardizeInstallStatus(item.status || item.current_status || item.currentStatus || '');
  const installCount = item.install_count ?? item.installCount ?? 0;
  const updateCount = item.update_count ?? item.updateCount ?? 0;
  const failureCount = item.failure_count ?? item.failureCount ?? 0;
  const hasActivity = installCount > 0 || updateCount > 0 || failureCount > 0;
  
    
  // First check recentAttempts if available (support both snake_case and camelCase)
  const recentAttempts = item.recent_attempts || item.recentAttempts
  if (recentAttempts && Array.isArray(recentAttempts) && recentAttempts.length > 0) {
    const latestAttempt = recentAttempts.reduce((latest: any, current: any) => {
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
  
  // For "Installed" packages that Cimian never actually touched (pre-existing),
  // don't show any timestamp - it's misleading
  if (status === 'Installed' && !hasActivity) {
        return '';
  }
  
  // For packages with actual activity (install/update/failure attempts), show when they were last attempted
  // Priority: last_attempt_time (when it was tried) > last_update (metadata update)
  if (hasActivity) {
    const timestamp = item.last_attempt_time || item.lastAttemptTime || item.last_update || item.lastUpdate || '';
        return timestamp;
  }
  
  // For Error/Warning/Pending status, show last_attempt_time (when it was last tried)
  if (status === 'Error' || status === 'Warning' || status === 'Pending') {
    const timestamp = item.last_attempt_time || item.lastAttemptTime || item.last_update || item.lastUpdate || '';
        return timestamp;
  }
  
  // Default: no timestamp (shouldn't reach here in normal cases)
    return '';
}

/**
 * Extract install status information from device modules
 * Supports both Cimian (Windows/cross-platform) and Munki (macOS) data sources
 * FIXES: Status capitalization issues by enforcing standard format
 * VERSION: 2025-01-04 - Added Munki support via macadmins osquery extension
 */
export function extractInstalls(deviceModules: any): InstallsInfo {
    
  // FULL INSTALLS MODULE DEBUG
  if (deviceModules?.installs) {
      }
  
  if (!deviceModules?.installs) {
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
  
  
  const packages: InstallPackage[] = []
  let statusCounts = {
    installed: 0,
    pending: 0,
    warnings: 0,
    errors: 0,
    removed: 0
  }

  // Determine which managed software system to use
  const hasCimianData = installs.cimian?.items && Array.isArray(installs.cimian.items) && installs.cimian.items.length > 0
  const hasMunkiData = installs.munki?.items && Array.isArray(installs.munki.items) && installs.munki.items.length > 0
  
  // Determine system name for UI
  let systemName = 'Managed Installs'
  if (hasCimianData) {
    systemName = 'Cimian'
  } else if (hasMunkiData) {
    systemName = 'Munki'
  }

  // Process recent installs (contains Cimian data) - Use cimian.items as primary source
  let packagesToProcess = []
  
  // Check cimian.items FIRST as it contains the real data
  if (installs.cimian?.items && Array.isArray(installs.cimian.items) && installs.cimian.items.length > 0) {
    packagesToProcess = installs.cimian.items
      .filter((item: any) => {
        // Support both snake_case and camelCase field names
        const name = item.item_name || item.itemName || item.display_name || item.displayName || item.name;
        const type = item.type || item.item_type || item.itemType || item.group;
        
        // Filter out internal managed_apps and managed_profiles items by name
        if (name === 'managed_apps' || name === 'managed_profiles') return false;
        
        // Filter out items that belong to managed_apps or managed_profiles types/groups
        if (type === 'managed_apps' || type === 'managed_profiles') return false;
        
        return true;
      })
      .map((item: any) => ({
      ...item,
      // Support both snake_case (new) and camelCase (legacy) field names
      name: item.item_name || item.itemName || item.display_name || item.displayName || item.name || 'Unknown',
      displayName: item.display_name || item.displayName || item.item_name || item.itemName || item.name || 'Unknown',
      status: item.current_status || item.currentStatus || item.mapped_status || item.mappedStatus, // Keep original status for standardization
      version: item.latest_version || item.latestVersion || item.installed_version || item.installedVersion || item.version || 'Unknown',
      installedVersion: item.installed_version || item.installedVersion || '',
      id: item.id || (item.item_name || item.itemName || '')?.toLowerCase() || 'unknown',
      type: 'cimian',
      lastSeenInSession: item.last_seen_in_session || item.lastSeenInSession || installs.lastCheckIn || installs.last_check_in || installs.collectedAt || installs.collected_at || '',
      lastUpdate: item.last_update || item.lastUpdate || '',
      lastAttemptTime: item.last_attempt_time || item.lastAttemptTime || '',
      lastAttemptStatus: item.last_attempt_status || item.lastAttemptStatus || '',
      failureCount: item.failure_count ?? item.failureCount ?? 0,
      installCount: item.install_count ?? item.installCount ?? 0,
      updateCount: item.update_count ?? item.updateCount ?? 0,
      itemSize: item.item_size || item.itemSize || '',
      recentAttempts: item.recent_attempts || item.recentAttempts || []
    }))
      } 
  // Process Munki items if available (macOS)
  else if (hasMunkiData) {
    packagesToProcess = installs.munki.items.map((item: any) => ({
      ...item,
      name: item.name || item.displayName || 'Unknown',
      displayName: item.displayName || item.name || 'Unknown',
      status: item.status, // Already standardized from macOS client
      version: item.version || item.installedVersion || 'Unknown',
      installedVersion: item.installedVersion || '',
      id: item.id || item.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      type: 'munki',
      lastSeenInSession: item.endTime || installs.munki.endTime || ''
    }))
      }
  else if (installs.recentInstalls && Array.isArray(installs.recentInstalls) && installs.recentInstalls.length > 0) {
    packagesToProcess = installs.recentInstalls
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
      } 
  // FALLBACK: Check for Munki pending packages
  else if (installs.munki?.pendingPackages && Array.isArray(installs.munki.pendingPackages) && installs.munki.pendingPackages.length > 0) {
    packagesToProcess = installs.munki.pendingPackages.map((pkgName: string) => ({
      name: pkgName,
      displayName: pkgName,
      status: 'Pending',
      type: 'munki',
      version: 'Unknown',
      id: pkgName.toLowerCase().replace(/\s+/g, '-'),
      lastSeenInSession: installs.munki?.endTime || ''
    }))
      }
  else {
      }
  
  if (packagesToProcess.length > 0) {
    for (const item of packagesToProcess) {
            
// For Cimian packages, respect the raw status first, then fall back to version comparison
      let finalStatus: StandardInstallStatus
      
      if (item.type === 'cimian') {
        // First, try to standardize the raw status
        const standardizedRawStatus = standardizeInstallStatus(item.status)
        
        // For Cimian, if the raw status indicates pending/error/warning, trust it
        if (standardizedRawStatus === 'Pending' || standardizedRawStatus === 'Error' || standardizedRawStatus === 'Warning') {
          finalStatus = standardizedRawStatus
                  } else if (item.version && item.installedVersion) {
          // Only use version comparison as fallback for unclear statuses
          if (item.version === item.installedVersion) {
            finalStatus = 'Installed'
                      } else {
            finalStatus = 'Pending'
                      }
        } else {
          // No version info, use standardized status
          finalStatus = standardizedRawStatus
                  }
      } else {
        // For non-Cimian packages, use the standardized status
        finalStatus = standardizeInstallStatus(item.status)
              }
      
            
      const packageInfo: InstallPackage = {
        id: item.id || item.name || 'unknown',
        name: item.name || 'Unknown Package',
        displayName: item.displayName || item.name || 'Unknown Package',
        version: item.version || item.installedVersion || '',
        status: finalStatus,  // ENFORCED: Version-based for Cimian, standardized for others
        type: item.type || 'Package',
        // DATE PROCESSED: Only show for items processed in the LATEST session
        // Items from older sessions get empty (they weren't touched in this run)
        lastUpdate: (() => {
          const itemTimestamp = item.lastSeenInSession || item.lastUpdate || ''
          if (!itemTimestamp || !latestSessionStartTime) return ''
          // Check if this item was processed in the latest session
          // Compare the item's lastSeenInSession with the latest session's start_time
          // If they're from the same session (within a reasonable window), show the timestamp
          try {
            const itemTime = new Date(normalizeCimianTimestamp(itemTimestamp)).getTime()
            const sessionTime = new Date(latestSessionStartTime).getTime()
            // Items processed in the latest session will have timestamps >= session start_time
            // Use a 2-hour window to account for long-running sessions
            if (!isNaN(itemTime) && !isNaN(sessionTime) && itemTime >= sessionTime - 60000) {
              return normalizeCimianTimestamp(itemTimestamp)
            }
          } catch { /* fall through */ }
          return ''
        })(),
        itemSize: item.itemSize,
        category: item.category || '', // Category from pkgsinfo
        developer: item.developer || '', // Developer from pkgsinfo
        pendingReason: item.pending_reason || item.pendingReason || '', // Why pending (e.g., "Update available: 1.0 → 2.0")
        failureCount: item.failureCount || 0,
        lastAttemptStatus: item.lastAttemptStatus,
        recentAttempts: item.recentAttempts || [],
        errors: [],
        warnings: []
      }

      // Use lastError and lastWarning fields from Cimian
      // These fields contain the actual error/warning messages from the MDM system
      if (item.lastError && item.lastError.trim() !== '') {
        // Get the most recent failed attempt timestamp from recentAttempts array
        let errorTimestamp = item.lastAttemptTime || item.lastUpdate || new Date().toISOString()
        if (item.recentAttempts && Array.isArray(item.recentAttempts) && item.recentAttempts.length > 0) {
          const failedAttempts = item.recentAttempts.filter((a: any) => 
            a.status?.toLowerCase() === 'failed' || a.status?.toLowerCase() === 'error'
          )
          if (failedAttempts.length > 0) {
            const latestFailed = failedAttempts.reduce((latest: any, current: any) => {
              if (!latest?.timestamp) return current
              if (!current?.timestamp) return latest
              const currentTime = new Date(current.timestamp).getTime()
              const latestTime = new Date(latest.timestamp).getTime()
              return currentTime > latestTime ? current : latest
            }, failedAttempts[0])
            if (latestFailed?.timestamp) {
              errorTimestamp = latestFailed.timestamp
            }
          }
        }
        
        packageInfo.errors?.push({
          id: `${item.id || item.name}-last-error`,
          message: item.lastError,
          timestamp: errorTimestamp,
          code: item.hasInstallLoop ? 'INSTALL_LOOP' : 'ERROR',
          package: item.name || item.displayName,
          context: { 
            runType: 'manual'
          }
        })
        
              }
      
      if (item.lastWarning && item.lastWarning.trim() !== '') {
        // Get the most recent warning attempt timestamp from recentAttempts array
        let warningTimestamp = item.lastAttemptTime || item.lastUpdate || new Date().toISOString()
        if (item.recentAttempts && Array.isArray(item.recentAttempts) && item.recentAttempts.length > 0) {
          const warningAttempts = item.recentAttempts.filter((a: any) => 
            a.status?.toLowerCase() === 'warning'
          )
          if (warningAttempts.length > 0) {
            const latestWarning = warningAttempts.reduce((latest: any, current: any) => {
              if (!latest?.timestamp) return current
              if (!current?.timestamp) return latest
              const currentTime = new Date(current.timestamp).getTime()
              const latestTime = new Date(latest.timestamp).getTime()
              return currentTime > latestTime ? current : latest
            }, warningAttempts[0])
            if (latestWarning?.timestamp) {
              warningTimestamp = latestWarning.timestamp
            }
          }
        }
        
        packageInfo.warnings?.push({
          id: `${item.id || item.name}-last-warning`,
          message: item.lastWarning,
          timestamp: warningTimestamp,
          code: item.hasInstallLoop ? 'INSTALL_LOOP' : 'WARNING',
          package: item.name || item.displayName,
          context: { 
            runType: 'manual'
          }
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

          }
  } else {
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
    // DO NOT update lastUpdate - keep it as lastSeenInSession
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

  
  // Extract run type and duration from latest session WITH ACTIVITY
  // Prioritize sessions that actually did something (installs/updates/failures) over quick checkonly runs
  let latestRunType = 'Manual'  // Default to Manual instead of Unknown
  let latestDuration = 'Unknown'
  let latestDurationSeconds: number | undefined
  // Track the latest session's start_time to determine which items were processed in this session
  let latestSessionStartTime = ''
  
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
      
          } else {
      // Fallback to first completed session (even checkonly)
      const completedSession = installs.recentSessions.find((session: any) => 
        session.status === 'completed' && session.duration && session.duration !== '00:00:00'
      )
      
      if (completedSession) {
        latestRunType = completedSession.runType || 'Manual'
        latestDuration = completedSession.duration || 'Unknown'
        latestDurationSeconds = completedSession.duration_seconds
        
              } else {
        // Final fallback to first session
        const latestSession = installs.recentSessions[0]
        latestRunType = latestSession.runType || 'Manual'
        latestDuration = latestSession.duration || 'Unknown'
        latestDurationSeconds = latestSession.duration_seconds
        
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
      
          } else {
      // Fallback to first cimian completed session
      const completedSession = installs.cimian.sessions.find((session: any) => 
        session.status === 'completed' && session.duration_seconds > 0
      )
      
      if (completedSession) {
        latestRunType = completedSession.run_type || completedSession.runType || 'Manual'
        latestDuration = completedSession.duration || 'Unknown'
        latestDurationSeconds = completedSession.duration_seconds
        
              } else {
        // Final fallback to first cimian session
        const latestSession = installs.cimian.sessions[0]
        latestRunType = latestSession.run_type || latestSession.runType || 'Manual'
        latestDuration = latestSession.duration || 'Unknown'
        latestDurationSeconds = latestSession.duration_seconds
        
              }
    }
  }
  
  // Extract cache size from the cacheStatus or latest session
  let cacheSizeMb: number | undefined
  
  // First try to get from cacheStatus (primary source)
  if (installs.cacheStatus?.cache_size_mb) {
    cacheSizeMb = installs.cacheStatus.cache_size_mb
      }
  // Fallback to sessions if needed
  else if (installs.recentSessions && installs.recentSessions.length > 0) {
    const latestSession = installs.recentSessions[0]
    cacheSizeMb = latestSession.cacheSizeMb
      }

  // Determine the latest session's start_time to identify which items were processed in this session
  // Items processed in the latest session get their lastSeenInSession shown as DATE PROCESSED
  // Items from older sessions show empty (they weren't touched in this run)
  if (installs.cimian?.sessions && Array.isArray(installs.cimian.sessions) && installs.cimian.sessions.length > 0) {
    latestSessionStartTime = installs.cimian.sessions[0].start_time || installs.cimian.sessions[0].startTime || ''
  } else if (installs.recentSessions && Array.isArray(installs.recentSessions) && installs.recentSessions.length > 0) {
    latestSessionStartTime = installs.recentSessions[0].start_time || installs.recentSessions[0].startTime || ''
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
    
        
    // Only process errors from the latest COMPLETED session
    if (latestCompletedSession) {
            
      // Note: Removed system-level warnings for pending packages 
      // These are just noise since users can see package statuses directly
    } else {
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
  
  
  const installsInfo: InstallsInfo = {
    totalPackages: packages.length,
    installed: statusCounts.installed,
    pending: statusCounts.pending,
    failed: statusCounts.errors + statusCounts.warnings,
    lastUpdate: installs.lastCheckIn || installs.collected_at || '',
    packages,
    systemName: hasMunkiData ? 'Munki' : (installs.cimian?.config?.systemName || 'Cimian'),
    cacheSizeMb,
    config: hasMunkiData ? {
      // Munki configuration
      type: 'Munki',
      version: installs.munki?.version || '',
      softwareRepoURL: installs.munki?.softwareRepoURL || '',
      manifest: installs.munki?.manifestName || installs.munki?.clientIdentifier || '',
      lastRun: installs.munki?.endTime || installs.munki?.lastRun || '',
      runType: 'Auto', // Munki is typically scheduled
      duration: 'Unknown', // Munki doesn't report duration
      durationSeconds: undefined
    } : {
      // Cimian configuration
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

  // Add Munki-specific errors/warnings if present
  if (hasMunkiData) {
    if (installs.munki?.errors && installs.munki.errors.trim() !== '') {
      installsInfo.messages?.errors.push({
        id: 'munki-run-errors',
        message: installs.munki.errors,
        timestamp: installs.munki.endTime || new Date().toISOString(),
        code: 'MUNKI_ERROR',
        package: 'Munki'
      })
    }
    if (installs.munki?.warnings && installs.munki.warnings.trim() !== '') {
      installsInfo.messages?.warnings.push({
        id: 'munki-run-warnings',
        message: installs.munki.warnings,
        timestamp: installs.munki.endTime || new Date().toISOString(),
        code: 'MUNKI_WARNING',
        package: 'Munki'
      })
    }
    if (installs.munki?.problemInstalls && installs.munki.problemInstalls.trim() !== '') {
      installsInfo.messages?.warnings.push({
        id: 'munki-problem-installs',
        message: `Problem installs: ${installs.munki.problemInstalls}`,
        timestamp: installs.munki.endTime || new Date().toISOString(),
        code: 'MUNKI_PROBLEM_INSTALLS',
        package: 'Munki'
      })
    }
  }

  
  return installsInfo
}
