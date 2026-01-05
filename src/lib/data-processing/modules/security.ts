/**
 * Security Module - Reader Only
 * Frontend reads pre-processed security data from device collection
 * 
 * SNAKE_CASE: All properties match API response format directly
 * NO heavy processing - device should provide clean, standardized security analysis
 */

export interface SecurityInfo {
  overall_score: number  // 0-100, calculated on device
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  last_scan?: string
  threats: ThreatInfo[]
  vulnerabilities: VulnerabilityInfo[]
  compliance: ComplianceInfo
  firewall: FirewallInfo
  antivirus: AntivirusInfo
  encryption: EncryptionInfo
  secure_shell?: SecureShellInfo
  windows_hello?: WindowsHelloInfo
  tpm?: TpmInfo
  policies: PolicyInfo[]
  summary: SecuritySummary
  collected_at?: string
  device_id?: string
  module_id?: string
}

export interface TpmInfo {
  version?: string
  is_enabled: boolean
  is_present: boolean
  is_activated: boolean
  manufacturer?: string
  status_display?: string
}

export interface SecureShellInfo {
  is_installed: boolean
  is_service_running: boolean
  is_firewall_rule_present: boolean
  is_configured: boolean
  is_key_deployed: boolean
  are_permissions_correct: boolean
  service_status: string
  config_status: string
  status_display: string
}

export interface WindowsHelloInfo {
  policies?: {
    group_policies?: any[]
    passport_policies?: any[]
    allow_domain_pin_logon?: boolean
    biometric_logon_enabled?: boolean
  }
  web_auth_n?: {
    settings?: any[]
    is_enabled?: boolean
    is_configured?: boolean
  }
  hello_events?: Array<{
    level?: string
    source?: string
    event_id?: number
    timestamp?: string
    event_type?: string
    description?: string
  }>
}

export interface ThreatInfo {
  id: string
  type: 'malware' | 'suspicious_process' | 'network_anomaly' | 'file_modification'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'resolved' | 'investigating'
  description: string
  detected_at: string
  resolved_at?: string
}

export interface VulnerabilityInfo {
  cve?: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cvss_score?: number
  component: string
  version: string
  patch_available: boolean
  description: string
}

export interface ComplianceInfo {
  framework: string  // 'SOC2', 'GDPR', 'HIPAA', etc.
  overall_compliance: number  // percentage
  passed_controls: number
  failed_controls: number
  total_controls: number
  last_assessment?: string
}

export interface FirewallInfo {
  is_enabled: boolean
  status: 'active' | 'disabled' | 'misconfigured'
  product: string
  version?: string
  last_update?: string
  blocked_connections?: number
  profile?: string
  rules?: any[]
  status_display?: string
}

export interface AntivirusInfo {
  installed: boolean
  is_enabled: boolean
  name: string
  version?: string
  last_update?: string
  last_scan?: string
  scan_type?: string
  is_up_to_date?: boolean
  threats_detected?: number
  status: 'protected' | 'outdated' | 'disabled' | 'not_installed'
  status_display?: string
}

export interface EncryptionInfo {
  disk_encryption: boolean
  encryption_method?: string
  bit_locker?: BitLockerInfo
  file_vault?: FileVaultInfo
  luks?: LuksInfo
  device_encryption?: boolean
  encrypted_volumes?: Array<{
    status?: string
    drive_letter?: string
    encryption_method?: string
    encryption_percentage?: number
  }>
  status_display?: string
}

export interface BitLockerInfo {
  status?: string
  is_enabled: boolean
  status_display?: string
  recovery_key_id?: string
  encrypted_drives?: string[]
}

export interface FileVaultInfo {
  is_enabled: boolean
  status_display?: string
}

export interface LuksInfo {
  is_enabled: boolean
  status_display?: string
}

export interface PolicyInfo {
  name: string
  type: 'password' | 'access' | 'data' | 'network' | 'device'
  status: 'compliant' | 'non_compliant' | 'unknown'
  last_checked?: string
  description?: string
}

export interface SecuritySummary {
  total_threats: number
  active_threats: number
  resolved_threats: number
  critical_vulnerabilities: number
  patches_needed: number
  compliance_score: number
}

/**
 * Extract security information from device modules
 * READER ONLY: Expects device to provide pre-processed, clean snake_case security analysis
 */
export function extractSecurity(deviceModules: any): SecurityInfo {
  if (!deviceModules?.security) {
    console.log('[SECURITY MODULE] No security data found in modules')
    return createEmptySecurityInfo()
  }

  const security = deviceModules.security
  
  console.log('[SECURITY MODULE] Reading pre-processed security data:', {
    hasTpm: !!security.tpm,
    hasFirewall: !!security.firewall,
    hasAntivirus: !!security.antivirus,
    hasEncryption: !!security.encryption,
    hasSecureShell: !!security.secure_shell,
    hasWindowsHello: !!security.windows_hello
  })

  const securityInfo: SecurityInfo = {
    // Use device-calculated security score, not frontend calculation
    overall_score: security.overall_score || 0,
    risk_level: security.risk_level || calculateRiskFromScore(security.overall_score || 0),
    last_scan: security.last_scan,
    
    // TPM data - snake_case from API
    tpm: security.tpm,
    
    // Read pre-processed threat data
    threats: security.threats ? security.threats.map(mapThreat) : [],
    
    // Read pre-processed vulnerability data  
    vulnerabilities: security.vulnerabilities ? security.vulnerabilities.map(mapVulnerability) : [],
    
    // Read compliance data (device should calculate compliance scores)
    compliance: security.compliance || createEmptyCompliance(),
    
    // Read system security components - snake_case from API
    firewall: security.firewall || createEmptyFirewall(),
    antivirus: security.antivirus || createEmptyAntivirus(),
    encryption: security.encryption || createEmptyEncryption(),
    secure_shell: security.secure_shell,
    windows_hello: security.windows_hello,
    
    // Read policy compliance
    policies: security.policies ? security.policies.map(mapPolicy) : [],
    
    // Read device-calculated summary
    summary: security.summary || createEmptySummary(),
    
    // Metadata
    collected_at: security.collected_at,
    device_id: security.device_id,
    module_id: security.module_id
  }

  console.log('[SECURITY MODULE] Security info read:', {
    overall_score: securityInfo.overall_score,
    risk_level: securityInfo.risk_level,
    threats_count: securityInfo.threats.length,
    vulnerabilities_count: securityInfo.vulnerabilities.length
  })

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
    detected_at: threat.detected_at || '',
    resolved_at: threat.resolved_at
  }
}

function mapVulnerability(vuln: any): VulnerabilityInfo {
  return {
    cve: vuln.cve,
    title: vuln.title || '',
    severity: vuln.severity || 'medium',
    cvss_score: vuln.cvss_score,
    component: vuln.component || '',
    version: vuln.version || '',
    patch_available: vuln.patch_available || false,
    description: vuln.description || ''
  }
}

function mapPolicy(policy: any): PolicyInfo {
  return {
    name: policy.name || '',
    type: policy.type || 'access',
    status: policy.status || 'unknown',
    last_checked: policy.last_checked,
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
    overall_score: 0,
    risk_level: 'critical',
    threats: [],
    vulnerabilities: [],
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
    overall_compliance: 0,
    passed_controls: 0,
    failed_controls: 0,
    total_controls: 0
  }
}

function createEmptyFirewall(): FirewallInfo {
  return {
    is_enabled: false,
    status: 'disabled',
    product: 'Unknown'
  }
}

function createEmptyAntivirus(): AntivirusInfo {
  return {
    installed: false,
    is_enabled: false,
    name: 'Unknown',
    status: 'not_installed'
  }
}

function createEmptyEncryption(): EncryptionInfo {
  return {
    disk_encryption: false
  }
}

function createEmptySummary(): SecuritySummary {
  return {
    total_threats: 0,
    active_threats: 0,
    resolved_threats: 0,
    critical_vulnerabilities: 0,
    patches_needed: 0,
    compliance_score: 0
  }
}
