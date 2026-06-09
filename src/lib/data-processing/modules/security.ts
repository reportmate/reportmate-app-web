/**
 * Security Module - Reader Only
 * Frontend reads pre-processed security data from device collection
 * NO heavy processing - device should provide clean, standardized security analysis
 */

export interface SecurityInfo {
  overallScore: number  // 0-100, calculated on device
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastScan?: string
  threats: ThreatInfo[]
  vulnerabilities: VulnerabilityInfo[]
  detections: DetectionAlert[]
  compliance: ComplianceInfo
  firewall: FirewallInfo
  antivirus: AntivirusInfo
  encryption: EncryptionInfo
  secureShell?: SecureShellInfo
  policies: PolicyInfo[]
  summary: SecuritySummary
  // Phase 2 — protection posture (per-device, raw passthrough; null on platforms / older clients that don't emit them)
  lsaProtection?: LsaProtectionInfo
  tamperProtection?: TamperProtectionInfo
  uac?: UacInfo
  pendingReboot?: PendingRebootInfo
  asrRules?: AsrRuleState[]
  defenderVersions?: DefenderVersionsInfo
  defenderExclusions?: DefenderExclusionsInfo
  joinState?: JoinStateInfo
  // Phase 3 — compliance / inventory
  localAdmins?: LocalAdminMember[]
  laps?: LapsInfo
  appLocker?: AppLockerInfo
  smartScreen?: SmartScreenInfo
  auditPolicy?: AuditPolicyInfo
  edrProducts?: EdrProductInfo[]
  windowsHello?: WindowsHelloInfo
  tpmOwnership?: TpmOwnershipInfo
  passwordPolicy?: PasswordPolicyInfo
  autoLogin?: AutoLoginInfo
}

// ====== Phase 2 — protection posture sub-objects (passthrough from client payload) ======

export interface LsaProtectionInfo {
  enabled?: boolean | null
  runAsPpl?: number | null   // 0 = off, 1 = PPL, 2 = PPL with UEFI lock
  mode?: string              // "Disabled" / "PPL" / "PPLBoot"
}

export interface TamperProtectionInfo {
  isTamperProtected?: boolean | null
  source?: string
}

export interface UacInfo {
  enableLua?: boolean | null
  consentPromptBehaviorAdmin?: number | null
  promptOnSecureDesktop?: number | null
  level?: string  // "AlwaysNotify" / "NotifyChangesSecure" / "NotifyChangesNoDim" / "NeverNotify" / "Disabled" / "Custom"
}

export interface PendingRebootInfo {
  cbsServicing?: boolean
  windowsUpdate?: boolean
  fileRename?: boolean
  required?: boolean
}

export interface AsrRuleState {
  id: string
  name: string
  action: number  // 0=Off, 1=Block, 2=Audit, 6=Warn
  state: string   // "Off" / "Block" / "Audit" / "Warn"
}

export interface DefenderVersionsInfo {
  amEngineVersion?: string
  amProductVersion?: string
  amServiceVersion?: string
  nisEngineVersion?: string
  antivirusSignatureVersion?: string
  antispywareSignatureVersion?: string
}

export interface DefenderExclusionsInfo {
  paths?: string[]
  extensions?: string[]
  processes?: string[]
  ipAddresses?: string[]
  totalCount?: number
}

export interface JoinStateInfo {
  azureAdJoined?: boolean | null
  domainJoined?: boolean | null
  workplaceJoined?: boolean | null
  enterpriseJoined?: boolean | null
  tenantName?: string
  tenantId?: string
  deviceId?: string
  domainName?: string
  raw?: Record<string, string>
  errorMessage?: string
}

// ====== Phase 3 — compliance / inventory ======

export interface LocalAdminMember {
  name: string
  sid?: string
  principalSource?: string   // Local / ActiveDirectory / AzureAD
  objectClass?: string       // User / Group
}

export interface LapsInfo {
  windowsLapsConfigured?: boolean
  legacyLapsInstalled?: boolean
  backupDirectory?: string   // "Active Directory" / "Azure AD" / "Configured" / ""
  adminAccountName?: string
}

export interface AppLockerInfo {
  serviceRunning?: boolean
  serviceStartType?: string
  policyConfigured?: boolean
  effectivePolicySummary?: string
  wdacEnabled?: boolean
  wdacAuditMode?: boolean
}

export interface SmartScreenInfo {
  windowsState?: string
  edgeEnabled?: boolean | null
  edgePuaProtection?: boolean | null
}

export interface AuditPolicyInfo {
  categories?: AuditCategorySetting[]
  errorMessage?: string
}

export interface AuditCategorySetting {
  category: string
  subcategory: string
  setting: string
}

export interface EdrProductInfo {
  name: string
  vendor?: string
  source?: string
  serviceRunning?: boolean
  version?: string
  sid?: string
}

export interface WindowsHelloInfo {
  faceSensorPresent?: boolean
  fingerprintSensorPresent?: boolean
  pinConfigured?: boolean | null
  passportForWorkEnabled?: boolean | null
}

export interface TpmOwnershipInfo {
  isOwned?: boolean | null
  isReady?: boolean | null
  autoProvisioning?: boolean | null
  manufacturerIdTxt?: string
  managedAuthLevel?: string
}

export interface PasswordPolicyInfo {
  minPasswordLength?: number | null
  maxPasswordAgeDays?: number | null
  minPasswordAgeDays?: number | null
  passwordHistoryLength?: number | null
  lockoutThreshold?: number | null
  lockoutDurationMinutes?: number | null
  complexityRequired?: boolean | null
  errorMessage?: string
}

export interface AutoLoginInfo {
  autoAdminLogon?: boolean
  hasDefaultUserName?: boolean
  hasDefaultPassword?: boolean       // PRESENCE ONLY — value is never read or transmitted
  hasDefaultDomainName?: boolean
  defaultUserName?: string
}

export interface DetectionAlert {
  threatId?: string
  threatName: string
  severity: string // Severe, High, Moderate, Low, Unknown
  category: string
  status: string // Detected, Cleaned, Quarantined, Removed, Allowed, Blocked
  actionTaken: string
  source: string // WindowsDefender, CrowdStrike, ArcticWolf, Sophos, etc.
  filePath?: string
  processName?: string
  user?: string
  detectedAt?: string
  resolvedAt?: string
  eventId?: number
  description?: string
}

export interface SecureShellInfo {
  isInstalled: boolean
  isServiceRunning: boolean
  isFirewallRulePresent: boolean
  isConfigured: boolean
  isKeyDeployed: boolean
  arePermissionsCorrect: boolean
  serviceStatus: string
  configStatus: string
  statusDisplay: string
}

export interface ThreatInfo {
  id: string
  type: 'malware' | 'suspicious_process' | 'network_anomaly' | 'file_modification'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'resolved' | 'investigating'
  description: string
  detectedAt: string
  resolvedAt?: string
}

export interface VulnerabilityInfo {
  cve?: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cvssScore?: number
  component: string
  version: string
  patchAvailable: boolean
  description: string
}

export interface ComplianceInfo {
  framework: string  // 'SOC2', 'GDPR', 'HIPAA', etc.
  overallCompliance: number  // percentage
  passedControls: number
  failedControls: number
  totalControls: number
  lastAssessment?: string
}

export interface FirewallInfo {
  enabled: boolean
  status: 'active' | 'disabled' | 'misconfigured'
  product: string
  version?: string
  lastUpdate?: string
  blockedConnections?: number
}

export interface AntivirusInfo {
  installed: boolean
  enabled: boolean
  product: string
  version?: string
  lastUpdate?: string
  lastScan?: string
  threatsDetected?: number
  status: 'protected' | 'outdated' | 'disabled' | 'not_installed'
}

export interface EncryptionInfo {
  diskEncryption: boolean
  encryptionMethod?: string
  bitlockerStatus?: string
  fileVaultStatus?: string
  networkEncryption: boolean
}

export interface PolicyInfo {
  name: string
  type: 'password' | 'access' | 'data' | 'network' | 'device'
  status: 'compliant' | 'non_compliant' | 'unknown'
  lastChecked?: string
  description?: string
}

export interface SecuritySummary {
  totalThreats: number
  activeThreats: number
  resolvedThreats: number
  criticalVulnerabilities: number
  patchesNeeded: number
  complianceScore: number
}

/**
 * Extract security information from device modules
 * READER ONLY: Expects device to provide pre-processed security analysis
 */
/**
 * Extract security information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean security analysis
 */
export function extractSecurity(deviceModules: any): SecurityInfo {
  if (!deviceModules?.security) {
        return createEmptySecurityInfo()
  }

  const security = deviceModules.security
  
  
  const securityInfo: SecurityInfo = {
    // Use device-calculated security score, not frontend calculation
    overallScore: security.overallScore || 0,
    riskLevel: security.riskLevel || calculateRiskFromScore(security.overallScore || 0),
    lastScan: security.lastScan,
    
    // Read pre-processed threat data
    threats: security.threats ? security.threats.map(mapThreat) : [],
    
    // Read pre-processed vulnerability data  
    vulnerabilities: security.vulnerabilities ? security.vulnerabilities.map(mapVulnerability) : [],
    
    // Read threat detection alerts from AV/EDR products
    detections: security.detections ? security.detections.map(mapDetection) : [],
    
    // Read compliance data (device should calculate compliance scores)
    compliance: security.compliance || createEmptyCompliance(),
    
    // Read system security components
    firewall: security.firewall || createEmptyFirewall(),
    antivirus: security.antivirus || createEmptyAntivirus(),
    encryption: security.encryption || createEmptyEncryption(),
    secureShell: security.secureShell || createEmptySecureShell(),
    
    // Read policy compliance
    policies: security.policies ? security.policies.map(mapPolicy) : [],

    // Read device-calculated summary
    summary: security.summary || createEmptySummary(),

    // Phase 2/3 — raw passthrough (sub-objects already arrive in the desired shape from the client).
    // We don't normalize here because the device computes these and the schema is stable.
    lsaProtection: security.lsaProtection,
    tamperProtection: security.tamperProtection,
    uac: security.uac,
    pendingReboot: security.pendingReboot,
    asrRules: security.asrRules,
    defenderVersions: security.defenderVersions,
    defenderExclusions: security.defenderExclusions,
    joinState: security.joinState,
    localAdmins: security.localAdmins,
    laps: security.laps,
    appLocker: security.appLocker,
    smartScreen: security.smartScreen,
    auditPolicy: security.auditPolicy,
    edrProducts: security.edrProducts,
    windowsHello: security.windowsHello,
    tpmOwnership: security.tpmOwnership,
    passwordPolicy: security.passwordPolicy,
    autoLogin: security.autoLogin,
  }

  
  return securityInfo
}

// Helper functions for mapping device data (minimal processing)
function mapThreat(threat: any): ThreatInfo {
  return {
    id: threat.id || '',
    type: threat.type || 'suspicious_process',
    severity: threat.severity || 'medium',
    status: threat.status || 'active',
    description: threat.description || '',
    detectedAt: threat.detectedAt || threat.detected_at || '',
    resolvedAt: threat.resolvedAt || threat.resolved_at
  }
}

function mapVulnerability(vuln: any): VulnerabilityInfo {
  return {
    cve: vuln.cve,
    title: vuln.title || '',
    severity: vuln.severity || 'medium',
    cvssScore: vuln.cvssScore || vuln.cvss_score,
    component: vuln.component || '',
    version: vuln.version || '',
    patchAvailable: vuln.patchAvailable || vuln.patch_available || false,
    description: vuln.description || ''
  }
}

function mapDetection(detection: any): DetectionAlert {
  return {
    threatId: detection.threatId || detection.threat_id,
    threatName: detection.threatName || detection.threat_name || '',
    severity: detection.severity || 'Unknown',
    category: detection.category || '',
    status: detection.status || 'Detected',
    actionTaken: detection.actionTaken || detection.action_taken || '',
    source: detection.source || 'Unknown',
    filePath: detection.filePath || detection.file_path,
    processName: detection.processName || detection.process_name,
    user: detection.user,
    detectedAt: detection.detectedAt || detection.detected_at,
    resolvedAt: detection.resolvedAt || detection.resolved_at,
    eventId: detection.eventId || detection.event_id,
    description: detection.description
  }
}

function mapPolicy(policy: any): PolicyInfo {
  return {
    name: policy.name || '',
    type: policy.type || 'access',
    status: policy.status || 'unknown',
    lastChecked: policy.lastChecked || policy.last_checked,
    description: policy.description
  }
}

// Simple risk calculation (fallback only - device should provide)
function calculateRiskFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'low'
  if (score >= 60) return 'medium' 
  if (score >= 40) return 'high'
  return 'critical'
}

// Empty data creators
function createEmptySecurityInfo(): SecurityInfo {
  return {
    overallScore: 0,
    riskLevel: 'critical',
    threats: [],
    vulnerabilities: [],
    detections: [],
    compliance: createEmptyCompliance(),
    firewall: createEmptyFirewall(),
    antivirus: createEmptyAntivirus(),
    encryption: createEmptyEncryption(),
    policies: [],
    summary: createEmptySummary()
  }
}

function createEmptyCompliance(): ComplianceInfo {
  return {
    framework: 'Unknown',
    overallCompliance: 0,
    passedControls: 0,
    failedControls: 0,
    totalControls: 0
  }
}

function createEmptyFirewall(): FirewallInfo {
  return {
    enabled: false,
    status: 'disabled',
    product: 'Unknown'
  }
}

function createEmptyAntivirus(): AntivirusInfo {
  return {
    installed: false,
    enabled: false,
    product: 'Unknown',
    status: 'not_installed'
  }
}

function createEmptyEncryption(): EncryptionInfo {
  return {
    diskEncryption: false,
    networkEncryption: false
  }
}

function createEmptySecureShell(): SecureShellInfo {
  return {
    isInstalled: false,
    isServiceRunning: false,
    isFirewallRulePresent: false,
    isConfigured: false,
    isKeyDeployed: false,
    arePermissionsCorrect: false,
    serviceStatus: 'Unknown',
    configStatus: 'Unknown',
    statusDisplay: 'Unknown'
  }
}

function createEmptySummary(): SecuritySummary {
  return {
    totalThreats: 0,
    activeThreats: 0,
    resolvedThreats: 0,
    criticalVulnerabilities: 0,
    patchesNeeded: 0,
    complianceScore: 0
  }
}
