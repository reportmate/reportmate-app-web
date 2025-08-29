/**
 * Management Module - Reader Only
 * Frontend reads pre-processed management/policy data from device collection
 * NO heavy processing - device should provide clean, standardized management status
 */

export interface ManagementInfo {
  mdmEnrollment: MdmEnrollmentInfo
  domainStatus: DomainInfo
  policies: PolicyInfo[]
  compliance: ComplianceInfo
  certificates: CertificateInfo[]
  bitlockerStatus: BitlockerInfo
  windowsUpdate: WindowsUpdateInfo
  groupPolicies: GroupPolicyInfo[]
  localUsers: LocalUserInfo[]
  remoteAccess: RemoteAccessInfo
  summary: ManagementSummary
}

export interface MdmEnrollmentInfo {
  enrolled: boolean
  provider?: string  // 'intune', 'jamf', 'workspace_one', etc.
  enrollmentId?: string
  serverUrl?: string
  lastSync?: string
  status: 'enrolled' | 'not_enrolled' | 'pending' | 'error' | 'disconnected'
  complianceState: 'compliant' | 'non_compliant' | 'unknown' | 'not_evaluated'
  managementType?: 'mdm' | 'mam' | 'hybrid'
  enrollmentDate?: string
}

export interface DomainInfo {
  joined: boolean
  domainName?: string
  domainController?: string
  computerName?: string
  lastLogon?: string
  status: 'joined' | 'not_joined' | 'workgroup' | 'error'
  organizationalUnit?: string
  siteName?: string
}

export interface PolicyInfo {
  id: string
  name: string
  type: 'security' | 'compliance' | 'configuration' | 'update' | 'application'
  status: 'applied' | 'pending' | 'failed' | 'not_applicable'
  source: 'group_policy' | 'mdm' | 'local' | 'registry'
  lastApplied?: string
  description?: string
  scope?: string
  priority?: number
}

export interface ComplianceInfo {
  overallStatus: 'compliant' | 'non_compliant' | 'unknown' | 'not_evaluated'
  lastEvaluation?: string
  complianceScore?: number  // 0-100
  policiesEvaluated: number
  policiesPassed: number
  policiesFailed: number
  criticalFailures: number
  warnings: number
}

export interface CertificateInfo {
  subject: string
  issuer: string
  thumbprint: string
  validFrom: string
  validTo: string
  status: 'valid' | 'expired' | 'expiring_soon' | 'revoked' | 'invalid'
  purpose: string[]
  store: string  // 'personal', 'trusted_root', 'intermediate', etc.
  keyUsage?: string[]
  daysUntilExpiry?: number
}

export interface BitlockerInfo {
  enabled: boolean
  encryptionMethod?: string
  protectionStatus: 'on' | 'off' | 'suspended' | 'unknown'
  drives: BitlockerDriveInfo[]
  recoveryKey?: {
    backed_up: boolean
    backup_location?: string
  }
}

export interface BitlockerDriveInfo {
  driveLetter: string
  encrypted: boolean
  encryptionPercentage: number
  protectors: string[]  // 'tpm', 'password', 'recovery_key', etc.
  lockStatus: 'unlocked' | 'locked'
}

export interface WindowsUpdateInfo {
  lastCheck?: string
  lastInstall?: string
  pendingUpdates: number
  criticalUpdates: number
  securityUpdates: number
  optionalUpdates: number
  restartRequired: boolean
  updateStatus: 'up_to_date' | 'updates_available' | 'failed' | 'downloading' | 'installing'
  automaticUpdates: boolean
  wsusServer?: string
}

export interface GroupPolicyInfo {
  name: string
  guid?: string
  status: 'applied' | 'failed' | 'not_applied'
  lastApplied?: string
  source: string  // OU path or local
  version?: string
  type: 'computer' | 'user'
}

export interface LocalUserInfo {
  username: string
  fullName?: string
  description?: string
  status: 'active' | 'disabled' | 'locked'
  admin: boolean
  lastLogon?: string
  passwordExpires?: string
  accountCreated?: string
  sid?: string
}

export interface RemoteAccessInfo {
  rdpEnabled: boolean
  sshEnabled: boolean
  vpnConnections: VpnConnectionInfo[]
  remoteDesktopUsers: string[]
  networkLevelAuth: boolean
  firewallExceptions: string[]
}

export interface VpnConnectionInfo {
  name: string
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  server?: string
  protocol?: string
  lastConnected?: string
}

export interface ManagementSummary {
  managementScore: number  // 0-100, calculated on device
  mdmEnrolled: boolean
  domainJoined: boolean
  compliant: boolean
  policiesApplied: number
  policiesFailed: number
  certificatesExpiring: number
  updatesRequired: number
  securityIssues: number
  lastPolicySync?: string
}

/**
 * Extract management information from device modules
 * READER ONLY: Expects device to provide pre-processed management analysis
 */
export function extractManagement(deviceModules: any): ManagementInfo {
  if (!deviceModules?.management) {
    console.log('[MANAGEMENT MODULE] No management data found in modules')
    return createEmptyManagementInfo()
  }

  const management = deviceModules.management
  
  console.log('[MANAGEMENT MODULE] Reading pre-processed management data:', {
    hasMdmEnrollment: !!management.mdmEnrollment,
    hasDomainStatus: !!management.domainStatus,
    hasPolicies: !!management.policies,
    hasCompliance: !!management.compliance,
    hasCertificates: !!management.certificates,
    hasBitlocker: !!management.bitlockerStatus,
    hasWindowsUpdate: !!management.windowsUpdate,
    hasGroupPolicies: !!management.groupPolicies,
    hasLocalUsers: !!management.localUsers,
    hasRemoteAccess: !!management.remoteAccess
  })

  const managementInfo: ManagementInfo = {
    // Read MDM enrollment status (device should detect and analyze)
    mdmEnrollment: management.mdmEnrollment ? mapMdmEnrollment(management.mdmEnrollment) : createEmptyMdmEnrollment(),
    
    // Read domain join status
    domainStatus: management.domainStatus ? mapDomainInfo(management.domainStatus) : createEmptyDomainInfo(),
    
    // Read applied policies
    policies: management.policies ? management.policies.map(mapPolicy) : [],
    
    // Read compliance analysis (device should calculate)
    compliance: management.compliance ? mapCompliance(management.compliance) : createEmptyCompliance(),
    
    // Read certificate inventory
    certificates: management.certificates ? management.certificates.map(mapCertificate) : [],
    
    // Read BitLocker status
    bitlockerStatus: management.bitlockerStatus ? mapBitlockerInfo(management.bitlockerStatus) : createEmptyBitlockerInfo(),
    
    // Read Windows Update status
    windowsUpdate: management.windowsUpdate ? mapWindowsUpdateInfo(management.windowsUpdate) : createEmptyWindowsUpdateInfo(),
    
    // Read Group Policy status
    groupPolicies: management.groupPolicies ? management.groupPolicies.map(mapGroupPolicy) : [],
    
    // Read local user accounts
    localUsers: management.localUsers ? management.localUsers.map(mapLocalUser) : [],
    
    // Read remote access configuration
    remoteAccess: management.remoteAccess ? mapRemoteAccess(management.remoteAccess) : createEmptyRemoteAccess(),
    
    // Use device-calculated summary
    summary: management.summary || createEmptySummary()
  }

  console.log('[MANAGEMENT MODULE] Management info read:', {
    mdmEnrolled: managementInfo.mdmEnrollment.enrolled,
    domainJoined: managementInfo.domainStatus.joined,
    policiesCount: managementInfo.policies.length,
    complianceScore: managementInfo.compliance.complianceScore,
    certificatesCount: managementInfo.certificates.length,
    bitlockerEnabled: managementInfo.bitlockerStatus.enabled,
    pendingUpdates: managementInfo.windowsUpdate.pendingUpdates,
    groupPoliciesCount: managementInfo.groupPolicies.length,
    localUsersCount: managementInfo.localUsers.length
  })

  return managementInfo
}

// Helper functions for mapping device data (minimal processing)
function mapMdmEnrollment(mdm: any): MdmEnrollmentInfo {
  return {
    enrolled: mdm.enrolled || false,
    provider: mdm.provider,
    enrollmentId: mdm.enrollmentId || mdm.enrollment_id,
    serverUrl: mdm.serverUrl || mdm.server_url,
    lastSync: mdm.lastSync || mdm.last_sync,
    status: mdm.status || 'not_enrolled',
    complianceState: mdm.complianceState || mdm.compliance_state || 'unknown',
    managementType: mdm.managementType || mdm.management_type,
    enrollmentDate: mdm.enrollmentDate || mdm.enrollment_date
  }
}

function mapDomainInfo(domain: any): DomainInfo {
  return {
    joined: domain.joined || false,
    domainName: domain.domainName || domain.domain_name,
    domainController: domain.domainController || domain.domain_controller,
    computerName: domain.computerName || domain.computer_name,
    lastLogon: domain.lastLogon || domain.last_logon,
    status: domain.status || 'not_joined',
    organizationalUnit: domain.organizationalUnit || domain.organizational_unit,
    siteName: domain.siteName || domain.site_name
  }
}

function mapPolicy(policy: any): PolicyInfo {
  return {
    id: policy.id || '',
    name: policy.name || '',
    type: policy.type || 'configuration',
    status: policy.status || 'not_applicable',
    source: policy.source || 'local',
    lastApplied: policy.lastApplied || policy.last_applied,
    description: policy.description,
    scope: policy.scope,
    priority: policy.priority
  }
}

function mapCompliance(compliance: any): ComplianceInfo {
  return {
    overallStatus: compliance.overallStatus || compliance.overall_status || 'unknown',
    lastEvaluation: compliance.lastEvaluation || compliance.last_evaluation,
    complianceScore: compliance.complianceScore || compliance.compliance_score,
    policiesEvaluated: compliance.policiesEvaluated || compliance.policies_evaluated || 0,
    policiesPassed: compliance.policiesPassed || compliance.policies_passed || 0,
    policiesFailed: compliance.policiesFailed || compliance.policies_failed || 0,
    criticalFailures: compliance.criticalFailures || compliance.critical_failures || 0,
    warnings: compliance.warnings || 0
  }
}

function mapCertificate(cert: any): CertificateInfo {
  return {
    subject: cert.subject || '',
    issuer: cert.issuer || '',
    thumbprint: cert.thumbprint || '',
    validFrom: cert.validFrom || cert.valid_from || '',
    validTo: cert.validTo || cert.valid_to || '',
    status: cert.status || 'unknown',
    purpose: cert.purpose || [],
    store: cert.store || '',
    keyUsage: cert.keyUsage || cert.key_usage,
    daysUntilExpiry: cert.daysUntilExpiry || cert.days_until_expiry
  }
}

function mapBitlockerInfo(bitlocker: any): BitlockerInfo {
  return {
    enabled: bitlocker.enabled || false,
    encryptionMethod: bitlocker.encryptionMethod || bitlocker.encryption_method,
    protectionStatus: bitlocker.protectionStatus || bitlocker.protection_status || 'unknown',
    drives: bitlocker.drives ? bitlocker.drives.map(mapBitlockerDrive) : [],
    recoveryKey: bitlocker.recoveryKey || bitlocker.recovery_key
  }
}

function mapBitlockerDrive(drive: any): BitlockerDriveInfo {
  return {
    driveLetter: drive.driveLetter || drive.drive_letter || '',
    encrypted: drive.encrypted || false,
    encryptionPercentage: drive.encryptionPercentage || drive.encryption_percentage || 0,
    protectors: drive.protectors || [],
    lockStatus: drive.lockStatus || drive.lock_status || 'unlocked'
  }
}

function mapWindowsUpdateInfo(update: any): WindowsUpdateInfo {
  return {
    lastCheck: update.lastCheck || update.last_check,
    lastInstall: update.lastInstall || update.last_install,
    pendingUpdates: update.pendingUpdates || update.pending_updates || 0,
    criticalUpdates: update.criticalUpdates || update.critical_updates || 0,
    securityUpdates: update.securityUpdates || update.security_updates || 0,
    optionalUpdates: update.optionalUpdates || update.optional_updates || 0,
    restartRequired: update.restartRequired || update.restart_required || false,
    updateStatus: update.updateStatus || update.update_status || 'unknown',
    automaticUpdates: update.automaticUpdates || update.automatic_updates || false,
    wsusServer: update.wsusServer || update.wsus_server
  }
}

function mapGroupPolicy(gpo: any): GroupPolicyInfo {
  return {
    name: gpo.name || '',
    guid: gpo.guid,
    status: gpo.status || 'not_applied',
    lastApplied: gpo.lastApplied || gpo.last_applied,
    source: gpo.source || '',
    version: gpo.version,
    type: gpo.type || 'computer'
  }
}

function mapLocalUser(user: any): LocalUserInfo {
  return {
    username: user.username || '',
    fullName: user.fullName || user.full_name,
    description: user.description,
    status: user.status || 'active',
    admin: user.admin || false,
    lastLogon: user.lastLogon || user.last_logon,
    passwordExpires: user.passwordExpires || user.password_expires,
    accountCreated: user.accountCreated || user.account_created,
    sid: user.sid
  }
}

function mapRemoteAccess(remote: any): RemoteAccessInfo {
  return {
    rdpEnabled: remote.rdpEnabled || remote.rdp_enabled || false,
    sshEnabled: remote.sshEnabled || remote.ssh_enabled || false,
    vpnConnections: remote.vpnConnections || remote.vpn_connections ? 
      (remote.vpnConnections || remote.vpn_connections).map(mapVpnConnection) : [],
    remoteDesktopUsers: remote.remoteDesktopUsers || remote.remote_desktop_users || [],
    networkLevelAuth: remote.networkLevelAuth || remote.network_level_auth || false,
    firewallExceptions: remote.firewallExceptions || remote.firewall_exceptions || []
  }
}

function mapVpnConnection(vpn: any): VpnConnectionInfo {
  return {
    name: vpn.name || '',
    status: vpn.status || 'disconnected',
    server: vpn.server,
    protocol: vpn.protocol,
    lastConnected: vpn.lastConnected || vpn.last_connected
  }
}

// Empty data creators
function createEmptyManagementInfo(): ManagementInfo {
  return {
    mdmEnrollment: createEmptyMdmEnrollment(),
    domainStatus: createEmptyDomainInfo(),
    policies: [],
    compliance: createEmptyCompliance(),
    certificates: [],
    bitlockerStatus: createEmptyBitlockerInfo(),
    windowsUpdate: createEmptyWindowsUpdateInfo(),
    groupPolicies: [],
    localUsers: [],
    remoteAccess: createEmptyRemoteAccess(),
    summary: createEmptySummary()
  }
}

function createEmptyMdmEnrollment(): MdmEnrollmentInfo {
  return {
    enrolled: false,
    status: 'not_enrolled',
    complianceState: 'unknown'
  }
}

function createEmptyDomainInfo(): DomainInfo {
  return {
    joined: false,
    status: 'not_joined'
  }
}

function createEmptyCompliance(): ComplianceInfo {
  return {
    overallStatus: 'unknown',
    policiesEvaluated: 0,
    policiesPassed: 0,
    policiesFailed: 0,
    criticalFailures: 0,
    warnings: 0
  }
}

function createEmptyBitlockerInfo(): BitlockerInfo {
  return {
    enabled: false,
    protectionStatus: 'unknown',
    drives: []
  }
}

function createEmptyWindowsUpdateInfo(): WindowsUpdateInfo {
  return {
    pendingUpdates: 0,
    criticalUpdates: 0,
    securityUpdates: 0,
    optionalUpdates: 0,
    restartRequired: false,
    updateStatus: 'up_to_date',
    automaticUpdates: false
  }
}

function createEmptyRemoteAccess(): RemoteAccessInfo {
  return {
    rdpEnabled: false,
    sshEnabled: false,
    vpnConnections: [],
    remoteDesktopUsers: [],
    networkLevelAuth: false,
    firewallExceptions: []
  }
}

function createEmptySummary(): ManagementSummary {
  return {
    managementScore: 0,
    mdmEnrolled: false,
    domainJoined: false,
    compliant: false,
    policiesApplied: 0,
    policiesFailed: 0,
    certificatesExpiring: 0,
    updatesRequired: 0,
    securityIssues: 0
  }
}
