/**
 * Identity Tab Component
 * User accounts, groups, sessions, and identity management
 * Supports both Windows and macOS platforms
 * 
 * Card Structure:
 * 1. Users Summary - Quick overview of user accounts
 * 2. BTMDB Health - macOS shared device critical metric (hidden on Windows)
 * 3. Directory Services - AD/LDAP bindings (Mac) / Domain status (Windows)
 * 4. Secure Token - macOS MDM workflow status (hidden on Windows)
 * 5. Platform SSO - macOS 13+ SSO registration status (hidden on Windows/older macOS)
 * 
 * Tables:
 * - User Accounts - Detailed user list with admin status, last login
 * - Logged In Users - Current active sessions
 * - Login History - Recent authentication events
 */

import React, { useState } from 'react'
import { convertPowerShellObjects, normalizeKeys } from '../../lib/utils/powershell-parser'
import { 
  Users, 
  User, 
  UserCheck, 
  UserX, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Database,
  Network,
  LogIn,
  History,
  ChevronDown,
  Fingerprint,
  Key,
  Scan
} from 'lucide-react'
import { extractIdentity, type IdentityInfo, type UserAccount, type BTMDBHealth } from '../../lib/data-processing/modules/identity'

interface IdentityTabProps {
  device: any
}

// Status badge component
const StatusBadge = ({ 
  status, 
  variant = 'default' 
}: { 
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral'
}) => {
  const variants = {
    default: 'text-gray-900 dark:text-gray-100',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400'
  }

  return (
    <span className={`text-sm font-medium ${variants[variant]}`}>
      {status}
    </span>
  )
}

// Detail row component
const DetailRow = ({ 
  label, 
  value, 
  icon,
  variant
}: { 
  label: string
  value?: string | number
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'neutral'
}) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
      {icon}
      {label}
    </span>
    {variant ? (
      <StatusBadge status={String(value ?? 'Unknown')} variant={variant} />
    ) : (
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {value ?? 'Unknown'}
      </span>
    )}
  </div>
)

// Platform detection helper
const isMacOS = (device: any): boolean => {
  const platform = device?.platform?.toLowerCase() || 
                   device?.modules?.metadata?.platform?.toLowerCase() ||
                   device?.metadata?.platform?.toLowerCase() ||
                   device?.modules?.system?.operatingSystem?.platform?.toLowerCase() || ''
  const osName = device?.modules?.system?.operatingSystem?.name?.toLowerCase() || 
                 device?.system?.operatingSystem?.name?.toLowerCase() || ''
  return platform === 'macos' || platform === 'darwin' || osName.includes('macos') || osName.includes('mac os')
}

// BTMDB status color helper
const getBTMDBStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'healthy': return 'success'
    case 'warning': return 'warning'
    case 'critical': return 'error'
    default: return 'neutral'
  }
}

// Format date helper - handles UNIX timestamps, ISO strings, and "still" suffix
const formatDate = (dateStr?: string | number, showActiveIndicator = false): { text: string, isActive: boolean } => {
  if (!dateStr) return { text: 'Unknown', isActive: false }
  
  const strValue = String(dateStr)
  let isCurrentlyActive = false
  let cleanedStr = strValue
  
  // Check for "still" suffix indicating active session
  if (strValue.toLowerCase().includes('still')) {
    isCurrentlyActive = true
    cleanedStr = strValue.replace(/\s*still\s*/gi, '').trim()
  }
  
  try {
    let date: Date
    
    // Check if it's a UNIX timestamp (all digits, 10+ chars)
    if (/^\d{10,}$/.test(cleanedStr)) {
      const timestamp = parseInt(cleanedStr, 10)
      // Handle seconds vs milliseconds
      date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000)
    } else if (/^[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}$/.test(cleanedStr)) {
      // Handle "Jan 22 09:08" format (no year) - assume current year
      const currentYear = new Date().getFullYear()
      date = new Date(`${cleanedStr} ${currentYear}`)
    } else {
      date = new Date(cleanedStr)
    }
    
    if (isNaN(date.getTime())) {
      // If it can't be parsed but has "still", show the original text
      return { text: strValue, isActive: isCurrentlyActive }
    }
    
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    return { text: formatted, isActive: isCurrentlyActive }
  } catch {
    return { text: strValue, isActive: isCurrentlyActive }
  }
}

// Simple format for display only (backwards compatibility)
const formatDateSimple = (dateStr?: string | number): string => {
  return formatDate(dateStr).text
}

export const IdentityTab: React.FC<IdentityTabProps> = ({ device }) => {
  const [activeTable, setActiveTable] = useState<'users' | 'sessions' | 'history'>('users')
  const [userSearch, setUserSearch] = useState('')
  const [showAdminsOnly, setShowAdminsOnly] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  
  // Toggle user row expansion
  const toggleUserExpanded = (username: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev)
      if (next.has(username)) {
        next.delete(username)
      } else {
        next.add(username)
      }
      return next
    })
  }

  // Extract bootstrap token from security module
  const bootstrapToken = device?.modules?.security?.bootstrapToken || device?.security?.bootstrapToken

  // Extract identity data
  const rawIdentity = device?.modules?.identity || device?.identity
  const parsedIdentity = convertPowerShellObjects(rawIdentity)
  const normalizedIdentity = parsedIdentity ? normalizeKeys(parsedIdentity) as any : null
  const identity: IdentityInfo = normalizedIdentity ? extractIdentity({ identity: normalizedIdentity }) : extractIdentity({})
  
  // Extract Windows Hello data from identity module (Windows only) - migrated from security
  const windowsHello = normalizedIdentity?.windowsHello
  
  const isMac = isMacOS(device)

  // Filter users based on search and admin filter
  const filteredUsers = identity.users.filter(user => {
    const matchesSearch = userSearch === '' || 
      user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (user.realName?.toLowerCase().includes(userSearch.toLowerCase()))
    const matchesAdminFilter = !showAdminsOnly || user.isAdmin
    return matchesSearch && matchesAdminFilter
  })

  // Filter logged in sessions to only show actual user sessions (not orphaned TTYs)
  const activeUserSessions = identity.loggedInUsers.filter(session => 
    session.user && session.user.trim() !== ''
  )
  
  // Get unique logged-in users for the header count
  const uniqueLoggedInUsers = [...new Set(activeUserSessions.map(s => s.user))]

  if (!normalizedIdentity && identity.users.length === 0) {
    return (
      <div className="text-left py-16">
        <div className="w-16 h-16 mb-4 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Identity Data</h3>
        <p className="text-gray-600 dark:text-gray-400">User account information is not available for this device.</p>
      </div>
    )
  }

  const { summary, btmdbHealth, directoryServices, secureTokenUsers } = identity

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity & Users</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {isMac ? 'macOS' : 'Windows'} user accounts and sessions
            </p>
          </div>
        </div>
        <div className="text-right mr-8">
          <div className="text-sm text-gray-500 dark:text-gray-400">User Accounts</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{identity.users.length}</div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className={`grid gap-4 ${isMac ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
        {/* Users Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Users</h3>
          </div>
          <div className="space-y-1">
            <DetailRow label="Total Users" value={summary.totalUsers} />
            <DetailRow 
              label="Admin Users" 
              value={summary.adminUsers} 
              icon={<Shield className="w-3 h-3" />}
              variant={summary.adminUsers > 0 ? 'warning' : 'success'}
            />
            <DetailRow 
              label="Disabled" 
              value={summary.disabledUsers} 
              variant={summary.disabledUsers > 0 ? 'neutral' : 'success'}
            />
            {!isMac && summary.localUsers !== undefined && (
              <DetailRow label="Local" value={summary.localUsers} />
            )}
            {!isMac && summary.domainUsers !== undefined && (
              <DetailRow label="Domain" value={summary.domainUsers} />
            )}
          </div>
        </div>

        {/* Directory Services Card - macOS Only - Hide if nothing configured */}
        {isMac && directoryServices && (
          directoryServices.activeDirectory.bound || 
          directoryServices.ldap.bound ||
          directoryServices.activeDirectory.domain ||
          directoryServices.ldap.server
        ) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Directory Services</h3>
            </div>
            <div className="space-y-1">
              <DetailRow 
                label="Active Directory" 
                value={directoryServices.activeDirectory.bound ? 'Bound' : 'Not Bound'}
                variant={directoryServices.activeDirectory.bound ? 'success' : 'neutral'}
              />
              {directoryServices.activeDirectory.domain && (
                <DetailRow label="AD Domain" value={directoryServices.activeDirectory.domain} />
              )}
              <DetailRow 
                label="LDAP" 
                value={directoryServices.ldap.bound ? 'Bound' : 'Not Bound'}
                variant={directoryServices.ldap.bound ? 'success' : 'neutral'}
              />
            </div>
          </div>
        )}

        {/* Platform SSO Card - macOS 13+ Only (moved before Tokens) */}
        {isMac && identity.platformSSOUsers && identity.platformSSOUsers.supported && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Platform SSO</h3>
            </div>
            <div className="space-y-1">
              <DetailRow 
                label="Device Registered" 
                value={identity.platformSSOUsers.deviceRegistered ? 'Yes' : 'No'}
                variant={identity.platformSSOUsers.deviceRegistered ? 'success' : 'warning'}
              />
              {identity.platformSSOUsers.deviceRegistered && (
                <>
                  <DetailRow 
                    label="Registered Users" 
                    value={identity.platformSSOUsers.registeredUserCount} 
                    variant="success"
                  />
                  <DetailRow 
                    label="Unregistered Users" 
                    value={identity.platformSSOUsers.unregisteredUserCount}
                    variant={identity.platformSSOUsers.unregisteredUserCount > 0 ? 'warning' : 'success'}
                  />
                </>
              )}
            </div>
            {identity.platformSSOUsers.deviceRegistered && identity.platformSSOUsers.users.length > 0 && (
              <div className="mt-3 space-y-1">
                {identity.platformSSOUsers.users.filter(u => u.registered).slice(0, 3).map(u => (
                  <div key={u.username} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {u.username}{u.userPrincipalName ? ` (${u.userPrincipalName})` : ''}
                  </div>
                ))}
                {identity.platformSSOUsers.registeredUserCount > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{identity.platformSSOUsers.registeredUserCount - 3} more registered
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Windows Hello Card - Windows Only */}
        {!isMac && windowsHello && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scan className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Windows Hello</h3>
            </div>
            <div className="space-y-1">
              <DetailRow 
                label="Status" 
                value={windowsHello.statusDisplay || 'Unknown'}
                variant={
                  windowsHello.statusDisplay === 'Enabled' || windowsHello.statusDisplay === 'Business' 
                    ? 'success' 
                    : windowsHello.statusDisplay === 'Partially Configured' 
                    ? 'warning' 
                    : 'neutral'
                }
              />
              {windowsHello.credentialProviders && (
                <>
                  <DetailRow 
                    label="PIN" 
                    value={windowsHello.credentialProviders.pinEnabled ? 'Enabled' : 'Disabled'}
                    variant={windowsHello.credentialProviders.pinEnabled ? 'success' : 'neutral'}
                  />
                  <DetailRow 
                    label="Fingerprint" 
                    value={windowsHello.credentialProviders.fingerprintEnabled ? 'Enabled' : 'Disabled'}
                    variant={windowsHello.credentialProviders.fingerprintEnabled ? 'success' : 'neutral'}
                  />
                  <DetailRow 
                    label="Face Recognition" 
                    value={windowsHello.credentialProviders.faceRecognitionEnabled ? 'Enabled' : 'Disabled'}
                    variant={windowsHello.credentialProviders.faceRecognitionEnabled ? 'success' : 'neutral'}
                  />
                </>
              )}
              {windowsHello.credentialGuard && (
                <DetailRow 
                  label="Credential Guard" 
                  value={windowsHello.credentialGuard.isEnabled ? 'Enabled' : 'Disabled'}
                  variant={windowsHello.credentialGuard.isEnabled ? 'success' : 'neutral'}
                />
              )}
            </div>
            {/* NGC Key Storage Info */}
            {windowsHello.ngcKeyStorage?.isConfigured && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 mb-1">
                  <Key className="w-3 h-3" />
                  <span className="font-medium">NGC Key Storage Configured</span>
                </div>
                {windowsHello.ngcKeyStorage.providers?.length > 0 && (
                  <div className="text-blue-600 dark:text-blue-400">
                    {windowsHello.ngcKeyStorage.providers.map((p: any) => p.name || p.type).slice(0, 2).join(', ')}
                    {windowsHello.ngcKeyStorage.providers.length > 2 && ` +${windowsHello.ngcKeyStorage.providers.length - 2} more`}
                  </div>
                )}
              </div>
            )}
            {/* WebAuthN Info */}
            {windowsHello.webAuthN?.isEnabled && (
              <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                WebAuthN/FIDO2 Enabled
              </div>
            )}
          </div>
        )}

        {/* Tokens Card - macOS Only (Bootstrap Token + Secure Token combined) */}
        {isMac && (secureTokenUsers || bootstrapToken) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tokens</h3>
            </div>
            <div className="space-y-1">
              {/* Bootstrap Token */}
              {bootstrapToken && (
                <DetailRow 
                  label="Bootstrap Token" 
                  value={bootstrapToken.escrowed ? 'Escrowed' : bootstrapToken.supported ? 'Not Escrowed' : 'Not Supported'}
                  variant={bootstrapToken.escrowed ? 'success' : bootstrapToken.supported ? 'warning' : 'neutral'}
                />
              )}
              {/* Secure Token */}
              {secureTokenUsers && (
                <>
                  <DetailRow 
                    label="Secure Token Users" 
                    value={`${secureTokenUsers.tokenGrantedCount} of ${secureTokenUsers.totalUsersChecked}`}
                    variant={secureTokenUsers.tokenMissingCount > 0 ? 'warning' : 'success'}
                  />
                </>
              )}
            </div>
            {secureTokenUsers && secureTokenUsers.usersWithoutToken.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                Missing token: {secureTokenUsers.usersWithoutToken.slice(0, 3).join(', ')}
                {secureTokenUsers.usersWithoutToken.length > 3 && ` +${secureTokenUsers.usersWithoutToken.length - 3} more`}
              </div>
            )}
          </div>
        )}

        {/* Failed Logins Card - Windows Only */}
        {!isMac && summary.failedLoginsLast7Days !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Login Security</h3>
            </div>
            <div className="space-y-1">
              <DetailRow 
                label="Failed Logins (7d)" 
                value={summary.failedLoginsLast7Days}
                variant={summary.failedLoginsLast7Days > 10 ? 'error' : summary.failedLoginsLast7Days > 5 ? 'warning' : 'success'}
              />
              <DetailRow label="Currently Logged In" value={summary.currentlyLoggedIn} />
            </div>
          </div>
        )}
      </div>

      {/* BTMDB Health Footnote - macOS Only (Collapsible) */}
      {isMac && btmdbHealth && (
        <details className={`p-3 rounded-lg border ${
          btmdbHealth.status === 'critical' 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
            : btmdbHealth.status === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
        }`}>
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Background Task Management DB: 
            <span className={`${
              btmdbHealth.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
              btmdbHealth.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
              btmdbHealth.status === 'critical' ? 'text-red-600 dark:text-red-400' :
              'text-gray-500 dark:text-gray-400'
            }`}>
              {btmdbHealth.sizeMB.toFixed(2)} MB
            </span>
            {btmdbHealth.status !== 'healthy' && (
              <AlertTriangle className={`w-4 h-4 ${
                btmdbHealth.status === 'critical' ? 'text-red-500' : 'text-yellow-500'
              }`} />
            )}
          </summary>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>{' '}
              <span className={`font-medium ${
                btmdbHealth.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                btmdbHealth.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {btmdbHealth.status.charAt(0).toUpperCase() + btmdbHealth.status.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Jetsam Kills (7d):</span>{' '}
              <span className={`font-medium ${
                btmdbHealth.jetsamKillsLast7Days > 100 ? 'text-red-600 dark:text-red-400' :
                btmdbHealth.jetsamKillsLast7Days > 50 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-gray-900 dark:text-white'
              }`}>
                {btmdbHealth.jetsamKillsLast7Days}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Registered Items:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{btmdbHealth.registeredItemCount}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Local Users:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{btmdbHealth.localUserCount}</span>
            </div>
          </div>
          {btmdbHealth.status === 'critical' && (
            <div className="mt-3 text-xs text-red-700 dark:text-red-300">
              {btmdbHealth.statusMessage}
            </div>
          )}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Thresholds: Warning {'>'}3MB, Critical {'>'}3.5MB, Failure {'>'}4MB
          </div>
        </details>
      )}

      {/* Table Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTable('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTable === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            User Accounts ({identity.users.length})
          </button>
          <button
            onClick={() => setActiveTable('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTable === 'sessions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-2" />
            Active Sessions ({activeUserSessions.length})
          </button>
          <button
            onClick={() => setActiveTable('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTable === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Login History ({identity.loginHistory.length})
          </button>
        </nav>
      </div>

      {/* User Accounts Table */}
      {activeTable === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={() => setShowAdminsOnly(!showAdminsOnly)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                showAdminsOnly
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-1" />
              Admins
            </button>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Display Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                  {isMac && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Secure Token</th>}
                  {isMac && bootstrapToken && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Bootstrap Token</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user, idx) => {
                  const isExpanded = expandedUsers.has(user.username);
                  const lastLoginInfo = user.lastLogon ? formatDate(user.lastLogon) : null;
                  const isLoggedIn = lastLoginInfo?.isActive || false;
                  const userHasSecureToken = secureTokenUsers?.usersWithToken?.includes(user.username);
                  
                  return (
                    <React.Fragment key={`${user.username}-${idx}`}>
                      {/* Main Row */}
                      <tr 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                        onClick={() => toggleUserExpanded(user.username)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {user.realName || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{user.uid}</td>
                        <td className="px-4 py-3">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Admin
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isLoggedIn ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                              Logged in
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium font-mono text-gray-900 dark:text-white">{user.username}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {lastLoginInfo?.text || 'Never'}
                        </td>
                        {isMac && (
                          <td className="px-4 py-3">
                            {userHasSecureToken ? (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </td>
                        )}
                        {isMac && bootstrapToken && (
                          <td className="px-4 py-3">
                            {bootstrapToken.escrowed ? (
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={isMac ? (bootstrapToken ? 9 : 8) : 7} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Basic Info */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Details</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Username:</span>
                              <span className="font-mono text-gray-900 dark:text-white">{user.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">UID:</span>
                              <span className="font-mono text-gray-900 dark:text-white">{user.uid}</span>
                            </div>
                            {user.gid && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">GID:</span>
                                <span className="font-mono text-gray-900 dark:text-white">{user.gid}</span>
                              </div>
                            )}
                            {user.realName && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Full Name:</span>
                                <span className="text-gray-900 dark:text-white">{user.realName}</span>
                              </div>
                            )}
                            {user.homeDirectory && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Home:</span>
                                <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={user.homeDirectory}>{user.homeDirectory}</span>
                              </div>
                            )}
                            {user.shell && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Shell:</span>
                                <span className="font-mono text-xs text-gray-900 dark:text-white">{user.shell}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Login & Security */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login & Security</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                              <span className={`${isLoggedIn ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                {lastLoginInfo?.text || 'Never'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Status:</span>
                              <span className={user.isDisabled ? 'text-gray-500' : 'text-green-600 dark:text-green-400'}>
                                {user.isDisabled ? 'Disabled' : 'Active'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Admin:</span>
                              <span className={user.isAdmin ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}>
                                {user.isAdmin ? 'Yes' : 'No'}
                              </span>
                            </div>
                            {isMac && user.linkedAppleId && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Apple ID:</span>
                                <span className="text-gray-900 dark:text-white text-xs truncate max-w-[180px]" title={user.linkedAppleId}>{user.linkedAppleId}</span>
                              </div>
                            )}
                            {user.passwordLastSet && (
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Password Set:</span>
                                <span className="text-gray-900 dark:text-white">{formatDateSimple(user.passwordLastSet)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Groups */}
                        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Group Membership</h4>
                          <div className="flex flex-wrap gap-1">
                            {user.groupMembership ? (
                              user.groupMembership.split(',').map((group, gIdx) => (
                                <span key={gIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {group.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">No group memberships</span>
                            )}
                          </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={isMac ? (bootstrapToken ? 9 : 8) : 7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No users found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </div>
      )}

      {/* Active Sessions Table */}
      {activeTable === 'sessions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TTY</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Host</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Login Time</th>
                  {!isMac && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeUserSessions.map((session, idx) => (
                  <tr key={`${session.user}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{session.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{session.tty || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{session.host || 'localhost'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {session.loginTime ? formatDate(session.loginTime).text : session.time || '—'}
                    </td>
                    {!isMac && (
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{session.logonType || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">{session.pid || '—'}</td>
                  </tr>
                ))}
                {activeUserSessions.length === 0 && (
                  <tr>
                    <td colSpan={isMac ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No active sessions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Login History Table */}
      {activeTable === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                  {!isMac && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {identity.loginHistory.map((entry, idx) => (
                  <tr key={`${entry.username}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{entry.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.eventType === 'Failed' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </span>
                      ) : entry.eventType === 'Logoff' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <LogIn className="w-3 h-3 mr-1 rotate-180" />
                          Logoff
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Logon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.loginTime ? formatDate(entry.loginTime).text : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.duration || '—'}
                    </td>
                    {!isMac && (
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{entry.logonType || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.sourceIp || entry.tty || '—'}
                    </td>
                  </tr>
                ))}
                {identity.loginHistory.length === 0 && (
                  <tr>
                    <td colSpan={isMac ? 5 : 6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No login history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug API JSON Data */}
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
              device.modules.identity
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <pre className="text-xs overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
                {JSON.stringify(normalizedIdentity, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default IdentityTab
