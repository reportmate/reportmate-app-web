/**
 * Identity Module - Reader Only
 * Frontend reads pre-processed identity data from device collection
 * NO heavy processing - device provides clean, standardized user/session data
 * 
 * Includes:
 * - User accounts (local and domain)
 * - Groups and memberships
 * - Logged-in sessions
 * - Login history
 * - BTMDB health (macOS shared device critical metric)
 * - Directory services (AD/LDAP bindings)
 * - Secure Token status (macOS MDM workflows)
 */

// MARK: - Core Types

export interface IdentityInfo {
  users: UserAccount[]
  groups: UserGroup[]
  loggedInUsers: LoggedInUser[]
  loginHistory: LoginHistoryEntry[]
  btmdbHealth: BTMDBHealth | null  // macOS only
  directoryServices: DirectoryServicesInfo | null  // macOS only
  secureTokenUsers: SecureTokenInfo | null  // macOS only
  platformSSOUsers: PlatformSSOUsersInfo | null  // macOS 13+ only
  summary: IdentitySummary
}

export interface UserAccount {
  username: string
  realName: string | null
  uid: number
  gid: number
  homeDirectory: string | null
  shell: string | null
  uuid: string | null
  sid?: string | null  // Windows only
  accountType?: string  // Local, Domain, Microsoft
  isAdmin: boolean
  isEnabled?: boolean
  isLocalAccount?: boolean
  sshAccess?: boolean  // macOS
  screenSharingAccess?: boolean  // macOS
  autoLoginEnabled?: boolean
  passwordHint?: string
  creationTime?: string
  passwordLastSet?: string
  lastLogon?: string
  failedLoginCount: number
  lastFailedLogin?: string
  linkedAppleId?: string  // macOS
  linkedDate?: string
  groupMembership?: string
  isDisabled?: boolean
  isLockout?: boolean  // Windows
}

export interface UserGroup {
  groupname: string
  gid: number
  sid?: string  // Windows
  members?: string
  comment?: string
  groupType?: string  // Local, Domain, System
}

export interface LoggedInUser {
  user: string
  tty?: string
  host?: string
  time?: string
  pid?: number
  loginTime?: string
  logonType?: string  // Windows: Interactive, RemoteInteractive, etc.
  sessionState?: string  // Windows: Active, Disconnected
}

export interface LoginHistoryEntry {
  username: string
  tty?: string
  loginTime?: string
  logoutTime?: string
  duration?: string
  eventType?: string  // Logon, Logoff, Failed
  logonType?: string
  sourceIp?: string
  eventId?: number  // Windows Event Log ID
}

// MARK: - BTMDB Health (macOS Critical Metric)

export interface BTMDBHealth {
  exists: boolean
  path: string
  sizeBytes: number
  sizeMB: number
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  statusMessage: string
  jetsamKillsLast7Days: number
  lastJetsamEvent?: string
  registeredItemCount: number
  localUserCount: number
  thresholds: BTMDBThresholds
}

export interface BTMDBThresholds {
  warningMB: number
  criticalMB: number
  failureMB: number
}

// MARK: - Directory Services (macOS)

export interface DirectoryServicesInfo {
  activeDirectory: ADBindingInfo
  ldap: LDAPBindingInfo
  directoryNodes?: string
  // Windows-specific
  azureAD?: AzureADInfo
  workgroup?: string
}

export interface ADBindingInfo {
  bound: boolean
  domain?: string
}

export interface LDAPBindingInfo {
  bound: boolean
  server?: string
}

// Windows-specific Entra ID info
export interface AzureADInfo {
  joined: boolean
  registered: boolean
  tenantId?: string
  tenantName?: string
}

// MARK: - Secure Token (macOS MDM)

export interface SecureTokenInfo {
  usersWithToken: string[]
  usersWithoutToken: string[]
  totalUsersChecked: number
  tokenGrantedCount: number
  tokenMissingCount: number
}

// MARK: - Platform SSO Users (macOS 13+ Ventura)

export interface PlatformSSOUsersInfo {
  supported: boolean
  deviceRegistered: boolean
  registeredUserCount: number
  unregisteredUserCount: number
  users: PlatformSSOUser[]
}

export interface PlatformSSOUser {
  username: string
  registered: boolean
  userPrincipalName: string | null
}

// MARK: - Summary

export interface IdentitySummary {
  totalUsers: number
  adminUsers: number
  disabledUsers: number
  localUsers?: number  // Windows
  domainUsers?: number  // Windows
  currentlyLoggedIn: number
  failedLoginsLast7Days?: number  // Windows
  btmdbStatus?: string  // macOS
}

// MARK: - Extractor Function

/**
 * Extract identity information from device modules
 * READER ONLY: Expects device to provide pre-processed identity data
 */
export function extractIdentity(deviceModules: any): IdentityInfo {
  if (!deviceModules?.identity) {
    return createEmptyIdentityInfo()
  }

  const identity = deviceModules.identity

  return {
    users: identity.users ? identity.users.map(mapUserAccount) : [],
    groups: identity.groups ? identity.groups.map(mapUserGroup) : [],
    loggedInUsers: identity.loggedInUsers ? identity.loggedInUsers.map(mapLoggedInUser) : [],
    loginHistory: identity.loginHistory ? identity.loginHistory.map(mapLoginHistory) : [],
    btmdbHealth: identity.btmdbHealth ? mapBTMDBHealth(identity.btmdbHealth) : null,
    directoryServices: identity.directoryServices ? mapDirectoryServices(identity.directoryServices) : null,
    secureTokenUsers: identity.secureTokenUsers ? mapSecureTokenInfo(identity.secureTokenUsers) : null,
    platformSSOUsers: identity.platformSSOUsers ? mapPlatformSSOUsers(identity.platformSSOUsers) : null,
    summary: identity.summary ? mapIdentitySummary(identity.summary) : createEmptySummary()
  }
}

// MARK: - Mapper Functions

function mapUserAccount(user: any): UserAccount {
  return {
    username: user.username || user.user || '',
    realName: user.realName || user.real_name || user.full_name || user.fullName || user.description || null,
    uid: user.uid || 0,
    gid: user.gid || 0,
    homeDirectory: user.homeDirectory || user.home_directory || user.directory || null,
    shell: user.shell || null,
    uuid: user.uuid || null,
    sid: user.sid || user.user_sid || null,
    accountType: user.accountType || user.account_type || (user.is_local || user.isLocal ? 'Local' : 'Domain'),
    isAdmin: user.isAdmin || user.is_admin || false,
    isEnabled: user.isEnabled !== undefined ? user.isEnabled : (user.is_disabled !== undefined ? !user.is_disabled : true),
    isLocalAccount: user.isLocalAccount || user.is_local_account || user.is_local || user.isLocal,
    sshAccess: user.sshAccess || user.ssh_access,
    screenSharingAccess: user.screenSharingAccess || user.screen_sharing_access,
    autoLoginEnabled: user.autoLoginEnabled || user.auto_login_enabled,
    passwordHint: user.passwordHint || user.password_hint,
    creationTime: user.creationTime || user.creation_time || user.accountCreated || user.created_at,
    passwordLastSet: user.passwordLastSet || user.password_last_set,
    lastLogon: user.lastLogon || user.last_logon || user.time,
    failedLoginCount: user.failedLoginCount || user.failed_login_count || 0,
    lastFailedLogin: user.lastFailedLogin || user.last_failed_login,
    linkedAppleId: user.linkedAppleId || user.linked_apple_id,
    linkedDate: user.linkedDate || user.linked_date,
    groupMembership: Array.isArray(user.groupMemberships || user.group_memberships) 
      ? (user.groupMemberships || user.group_memberships).join(', ')
      : user.groupMembership || user.group_membership,
    isDisabled: user.isDisabled || user.is_disabled || false,
    isLockout: user.isLockout || user.is_lockout
  }
}

function mapUserGroup(group: any): UserGroup {
  return {
    groupname: group.groupname || group.group_name || group.name || '',
    gid: group.gid || 0,
    sid: group.sid || group.group_sid,
    members: Array.isArray(group.members) ? group.members.join(', ') : group.members,
    comment: group.comment || group.description,
    groupType: group.groupType || group.group_type || (group.is_built_in || group.isBuiltIn ? 'BuiltIn' : 'Local')
  }
}

function mapLoggedInUser(session: any): LoggedInUser {
  return {
    user: session.user || session.username || '',
    tty: session.tty,
    host: session.host || session.domain,
    time: session.time || session.login_time || session.loginTime,
    pid: session.pid || session.session_id || session.sessionId,
    loginTime: session.loginTime || session.login_time || session.time,
    logonType: session.logonType || session.logon_type || session.session_type || session.type,
    sessionState: session.sessionState || session.session_state || (session.is_active ? 'Active' : 'Disconnected')
  }
}

function mapLoginHistory(entry: any): LoginHistoryEntry {
  return {
    username: entry.username || entry.user || '',
    tty: entry.tty,
    loginTime: entry.loginTime || entry.login_time || entry.time,
    logoutTime: entry.logoutTime || entry.logout_time,
    duration: entry.duration,
    eventType: entry.eventType || entry.event_type || entry.type,
    logonType: entry.logonType || entry.logon_type,
    sourceIp: entry.sourceIp || entry.source_ip || entry.host,
    eventId: entry.eventId || entry.event_id
  }
}

function mapBTMDBHealth(btmdb: any): BTMDBHealth {
  return {
    exists: btmdb.exists || false,
    path: btmdb.path || '/private/var/db/com.apple.backgroundtaskmanagement',
    sizeBytes: btmdb.sizeBytes || btmdb.size_bytes || 0,
    sizeMB: btmdb.sizeMB || btmdb.size_mb || 0,
    status: btmdb.status || 'unknown',
    statusMessage: btmdb.statusMessage || btmdb.status_message || '',
    jetsamKillsLast7Days: btmdb.jetsamKillsLast7Days || btmdb.jetsam_kills_last_7_days || 0,
    lastJetsamEvent: btmdb.lastJetsamEvent || btmdb.last_jetsam_event,
    registeredItemCount: btmdb.registeredItemCount || btmdb.registered_item_count || 0,
    localUserCount: btmdb.localUserCount || btmdb.local_user_count || 0,
    thresholds: btmdb.thresholds || { warningMB: 3.0, criticalMB: 3.5, failureMB: 4.0 }
  }
}

function mapDirectoryServices(ds: any): DirectoryServicesInfo {
  // Handle Windows structure (active_directory, azure_ad)
  const ad = ds.activeDirectory || ds.active_directory || {}
  
  return {
    activeDirectory: {
      bound: ad.bound || ad.is_domain_joined || ad.isDomainJoined || false,
      domain: ad.domain || ad.domain_name || ad.domainName
    },
    ldap: {
      bound: ds.ldap?.bound || false,
      server: ds.ldap?.server
    },
    directoryNodes: ds.directoryNodes || ds.directory_nodes,
    // Windows-specific: Entra ID info
    ...(ds.azure_ad || ds.azureAd ? {
      azureAD: {
        joined: ds.azure_ad?.is_aad_joined || ds.azureAd?.isAadJoined || false,
        registered: ds.azure_ad?.is_aad_registered || ds.azureAd?.isAadRegistered || false,
        tenantId: ds.azure_ad?.tenant_id || ds.azureAd?.tenantId,
        tenantName: ds.azure_ad?.tenant_name || ds.azureAd?.tenantName
      }
    } : {}),
    // Windows-specific: Workgroup
    ...(ds.workgroup ? { workgroup: ds.workgroup } : {})
  }
}

function mapSecureTokenInfo(st: any): SecureTokenInfo {
  return {
    usersWithToken: st.usersWithToken || st.users_with_token || [],
    usersWithoutToken: st.usersWithoutToken || st.users_without_token || [],
    totalUsersChecked: st.totalUsersChecked || st.total_users_checked || 0,
    tokenGrantedCount: st.tokenGrantedCount || st.token_granted_count || 0,
    tokenMissingCount: st.tokenMissingCount || st.token_missing_count || 0
  }
}

function mapPlatformSSOUsers(psso: any): PlatformSSOUsersInfo {
  return {
    supported: psso.supported || false,
    deviceRegistered: psso.deviceRegistered || psso.device_registered || false,
    registeredUserCount: psso.registeredUserCount || psso.registered_user_count || 0,
    unregisteredUserCount: psso.unregisteredUserCount || psso.unregistered_user_count || 0,
    users: (psso.users || []).map((u: any) => ({
      username: u.username || '',
      registered: u.registered || false,
      userPrincipalName: u.userPrincipalName || u.user_principal_name || null
    }))
  }
}

function mapIdentitySummary(summary: any): IdentitySummary {
  return {
    totalUsers: summary.totalUsers || summary.total_users || 0,
    adminUsers: summary.adminUsers || summary.admin_users || 0,
    disabledUsers: summary.disabledUsers || summary.disabled_users || 0,
    localUsers: summary.localUsers || summary.local_users,
    domainUsers: summary.domainUsers || summary.domain_users,
    currentlyLoggedIn: summary.currentlyLoggedIn || summary.currently_logged_in || 0,
    failedLoginsLast7Days: summary.failedLoginsLast7Days || summary.failed_logins_last_7_days,
    btmdbStatus: summary.btmdbStatus || summary.btmdb_status
  }
}

// MARK: - Empty State Creators

function createEmptyIdentityInfo(): IdentityInfo {
  return {
    users: [],
    groups: [],
    loggedInUsers: [],
    loginHistory: [],
    btmdbHealth: null,
    directoryServices: null,
    secureTokenUsers: null,
    platformSSOUsers: null,
    summary: createEmptySummary()
  }
}

function createEmptySummary(): IdentitySummary {
  return {
    totalUsers: 0,
    adminUsers: 0,
    disabledUsers: 0,
    currentlyLoggedIn: 0
  }
}
