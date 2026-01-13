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
  compliance: ComplianceInfo
  firewall: FirewallInfo
  antivirus: AntivirusInfo
  encryption: EncryptionInfo
  secureShell?: SecureShellInfo
  policies: PolicyInfo[]
  summary: SecuritySummary
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
    summary: security.summary || createEmptySummary()
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
