/**
 * Security Tab Component  
 * Security features and compliance information with 3x2 grid design
 * Supports both Windows and macOS platforms
 * 
 * Card Structure:
 * 1. Encryption - BitLocker (Win) / FileVault (Mac)
 * 2. Protection - Defender (Win) / Gatekeeper + MRT + XProtect (Mac)
 * 3. Detection - AV/EDR Software
 * 4. Tampering - TPM (Win) / SIP (Mac)
 * 5. Firewall - Both platforms
 * 6. Remote Access - SecureShell + RDP (Win) / SecureShell + Screen Sharing (Mac)
 */

import React from 'react'
import { convertPowerShellObjects, normalizeKeys, isPowerShellTrue } from '../../lib/utils/powershell-parser'
import { Lock, BrickWall, HardDrive, Fingerprint, Cpu, Terminal, Shield, ShieldCheck, Key, Search, Award, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface SecurityTabProps {
  device: any
}

const StatusBadge = ({ enabled, activeLabel = 'Enabled', inactiveLabel = 'Disabled', neutral }: { 
  enabled: boolean | undefined, 
  activeLabel?: string, 
  inactiveLabel?: string,
  neutral?: boolean
}) => {
  if (enabled === undefined) {
    return (
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Unknown
      </span>
    )
  }
  
  // All statuses now use simple text - green for positive, black/white for negative/neutral
  if (neutral || !enabled) {
    return (
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {enabled ? activeLabel : inactiveLabel}
      </span>
    )
  }
  
  return (
    <span className="text-sm font-medium text-green-600 dark:text-green-400">
      {activeLabel}
    </span>
  )
}

const DetailRow = ({ label, value, isStatus, enabled, mono, neutral, tooltip }: { 
  label: string, 
  value?: string, 
  isStatus?: boolean, 
  enabled?: boolean,
  mono?: boolean,
  neutral?: boolean,
  tooltip?: string
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    {isStatus ? (
      <StatusBadge enabled={enabled} activeLabel={value || 'Yes'} inactiveLabel={value || 'No'} neutral={neutral} />
    ) : (
      <span 
        className={`text-sm font-medium text-gray-900 dark:text-white ${mono ? 'font-mono' : ''} ${tooltip ? 'cursor-help' : ''}`}
        title={tooltip}
      >
        {value || 'Unknown'}
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

export const SecurityTab: React.FC<SecurityTabProps> = ({ device }) => {
  const rawSecurity = device?.modules?.security || device?.security
  const parsedSecurity = convertPowerShellObjects(rawSecurity)
  // Normalize all keys to camelCase to handle API returning snake_case
  const security = parsedSecurity ? normalizeKeys(parsedSecurity) as any : null
  const secureShell = security?.secureShell
  const isMac = isMacOS(device)
  
  // Certificate filter state
  const [certFilter, setCertFilter] = React.useState<'all' | 'valid' | 'expiringsoon' | 'expired'>('all')
  const [storeFilter, setStoreFilter] = React.useState<string>('all')
  const [selfSignedFilter, setSelfSignedFilter] = React.useState<boolean>(false)
  const [expandedStores, setExpandedStores] = React.useState<Set<string>>(new Set())
  const [certSearch, setCertSearch] = React.useState('')
  
  // Get remote management data from Management module (Mac collects screen sharing there)
  const rawManagement = device?.modules?.management || device?.management
  const management = rawManagement ? normalizeKeys(convertPowerShellObjects(rawManagement)) as any : null
  const remoteManagement = management?.remoteManagement || management?.remote_management || security?.remoteManagement || {}

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  if (!security) {
    return (
      <div className="text-left py-16">
        <div className="w-16 h-16 mb-4 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
      </div>
    )
  }

  // === macOS Security Status ===
  // Mac uses top-level fields like fileVault, systemIntegrityProtection, gatekeeper (NOT nested in encryption)
  // FileVault (disk encryption)
  const fileVaultEnabled = security?.fileVault?.enabled === 1 || 
                           security?.fileVault?.enabled === true || 
                           security?.fileVault?.status?.toLowerCase() === 'on'
  // System Integrity Protection
  const sipEnabled = security?.systemIntegrityProtection?.enabled === 1 || 
                     security?.systemIntegrityProtection?.enabled === true
  // Gatekeeper
  const gatekeeperEnabled = security?.gatekeeper?.enabled === 1 || 
                            security?.gatekeeper?.enabled === true
  // Secure Boot (Mac)
  const macSecureBootEnabled = security?.secureBoot?.secureBootEnabled === 1 || 
                               security?.secureBoot?.secureBootEnabled === true
  // Firmware Password
  const firmwarePasswordEnabled = security?.firmwarePassword?.enabled === 1 || 
                                  security?.firmwarePassword?.enabled === true
  // SSH (Mac) - note: enabled means it's ON, which could be a security concern
  const macSshEnabled = security?.ssh?.enabled === 1 || 
                        security?.ssh?.enabled === true

  // === Windows Security Status ===
  // Support both snake_case (new API) and camelCase (legacy) - all normalized to camelCase now
  // Windows Hello 
  const windowsHello = security?.windowsHello
  const windowsHelloEnabled = windowsHello?.statusDisplay !== 'Disabled' && (
    windowsHello?.credentialProviders?.pinEnabled || 
    windowsHello?.credentialProviders?.faceRecognitionEnabled ||
    windowsHello?.credentialProviders?.fingerprintEnabled
  )
  // TPM 
  const tpm = security?.tpm
  const tpmActive = tpm?.isPresent && tpm?.isEnabled && tpm?.isActivated
  // SSH (Windows)
  const secureShellData = security?.secureShell || secureShell
  const sshConfigured = secureShellData?.isConfigured || secureShellData?.isServiceRunning

  // === Common Security Status ===
  // Firewall - handle both Mac and Windows formats (all normalized to camelCase now)
  const firewallEnabled = security?.firewall?.isEnabled || 
                          security?.firewall?.enabled === 1 || 
                          security?.firewall?.enabled === true ||
                          (typeof security?.firewall?.globalState === 'string' 
                            ? security.firewall.globalState.toLowerCase() === 'on'
                            : security?.firewall?.globalState === 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Overview</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {isMac ? 'macOS' : 'Windows'} protection and compliance status
            </p>
          </div>
        </div>
        {/* Support both snake_case (new) and camelCase (legacy) for last scan - now all camelCase after normalization */}
        {(security?.antivirus?.lastScan || security?.lastSecurityScan) && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Scan</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(security?.antivirus?.lastScan || security?.lastSecurityScan)}
            </div>
          </div>
        )}
      </div>

      {/* 3x2 Grid of Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. Encryption Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Encryption</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS FileVault (no token data - that's in IdentityTab now)
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  FileVault Disk Encryption
                </div>
                <DetailRow label="Encrypted Volumes" value={
                  security?.fileVault?.encryptedVolumes?.length > 0 
                    ? security.fileVault.encryptedVolumes.map((v: any) => v.name || v.volumeName || v).join(', ')
                    : fileVaultEnabled ? 'System Volume' : 'None'
                } />
                <DetailRow label="Status" isStatus enabled={fileVaultEnabled} value={fileVaultEnabled ? 'Encrypted' : 'Not Encrypted'} />
              </>
            ) : (
              // Windows BitLocker (now all camelCase after normalization)
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  BitLocker Drive Encryption
                </div>
                {security?.encryption?.bitLocker?.encryptedDrives && security.encryption.bitLocker.encryptedDrives.length > 0 ? (
                  <DetailRow label="Drives" value={security.encryption.bitLocker.encryptedDrives.join(', ')} />
                ) : (
                  <DetailRow label="Drives" value="None encrypted" />
                )}
                <DetailRow label="Method" value={security?.encryption?.encryptedVolumes?.[0]?.encryptionMethod || 'XTS-AES'} />
                <DetailRow label="Status" value={security?.encryption?.bitLocker?.status || (security?.encryption?.bitLocker?.isEnabled ? 'Enabled' : 'Disabled')} />
              </>
            )}
          </div>
        </div>

        {/* 2. Protection Card - Built-in OS Security Tools */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Protection</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Protection: Gatekeeper + MRT + XProtect
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Built-in Defenses
                </div>
                {/* Gatekeeper */}
                <DetailRow label="Gatekeeper" isStatus enabled={gatekeeperEnabled} value={gatekeeperEnabled ? 'Enabled' : 'Disabled'} />
                <DetailRow 
                  label="Allow Apps From" 
                  value={(security?.gatekeeper?.developerIdEnabled === 1 || security?.gatekeeper?.developerIdEnabled === true) 
                    ? 'App Store & Known Developers' 
                    : 'Anywhere'}
                />
                {/* XProtect */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="XProtect" 
                    isStatus 
                    enabled={security?.xprotect?.enabled === true || security?.xprotect?.enabled === 1 || security?.xprotect?.enabled === "true"}
                    value={(security?.xprotect?.enabled === true || security?.xprotect?.enabled === 1 || security?.xprotect?.enabled === "true") ? 'Active' : 'Inactive'}
                  />
                  <DetailRow label="XProtect Version" value={security?.xprotect?.version} mono />
                  <DetailRow label="Signatures" value={security?.xprotect?.signatureCount?.toString()} mono />
                </div>
                {/* MRT */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="MRT (Malware Removal)" 
                    isStatus 
                    enabled={security?.mrt?.enabled === true || security?.mrt?.enabled === 1 || security?.mrt?.enabled === "true"}
                    value={(security?.mrt?.enabled === true || security?.mrt?.enabled === 1 || security?.mrt?.enabled === "true") ? 'Installed' : 'Not Installed'}
                  />
                  <DetailRow label="MRT Version" value={security?.mrt?.version} mono />
                </div>
              </>
            ) : (
              // Windows Built-in Protection: Smart App Control, Core Isolation, Exploit Protection, VBS
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Built-in Defenses
                </div>
                {/* Smart App Control - Windows 11 22H2+ only (hide if not available) */}
                {(security?.deviceGuard?.smartAppControlAvailable || security?.smartAppControl) && (
                  <DetailRow 
                    label="Smart App Control" 
                    isStatus 
                    enabled={security?.deviceGuard?.smartAppControlState === 'On' || security?.smartAppControl?.enabled || security?.smartAppControl?.state === 'On'}
                    value={security?.deviceGuard?.smartAppControlState || security?.smartAppControl?.state || (security?.smartAppControl?.enabled ? 'On' : 'Off')}
                  />
                )}
                {/* Core Isolation / Memory Integrity */}
                <DetailRow 
                  label="Core Isolation" 
                  isStatus 
                  enabled={security?.deviceGuard?.coreIsolationEnabled || security?.coreIsolation?.memoryIntegrity || security?.coreIsolation?.enabled}
                  value={(security?.deviceGuard?.coreIsolationEnabled || security?.coreIsolation?.memoryIntegrity || security?.coreIsolation?.enabled) ? 'Enabled' : 'Disabled'}
                />
                {(security?.deviceGuard?.memoryIntegrityEnabled !== undefined || security?.coreIsolation?.memoryIntegrity !== undefined) && (
                  <DetailRow 
                    label="Memory Integrity (HVCI)" 
                    isStatus 
                    enabled={security?.deviceGuard?.memoryIntegrityEnabled || security?.coreIsolation?.memoryIntegrity}
                  />
                )}
                {/* Virtualization-based Security */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="VBS (Virtualization-based Security)" 
                    isStatus 
                    enabled={security?.deviceGuard?.vbsEnabled || security?.vbs?.enabled || security?.virtualizationBasedSecurity?.enabled}
                    value={security?.deviceGuard?.vbsStatus || (security?.vbs?.enabled || security?.virtualizationBasedSecurity?.enabled) ? 'Running' : 'Disabled'}
                  />
                  {(security?.deviceGuard?.vbsServices?.length > 0 || security?.vbs?.securityServicesRunning || security?.virtualizationBasedSecurity?.services) && (
                    <DetailRow 
                      label="VBS Services" 
                      value={security?.deviceGuard?.vbsServices?.join(', ') || security?.vbs?.securityServicesRunning?.join(', ') || security?.virtualizationBasedSecurity?.services?.join(', ') || 'None'}
                    />
                  )}
                </div>
                {/* Exploit Protection */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="Exploit Protection" 
                    isStatus 
                    enabled={security?.deviceGuard?.exploitProtection?.systemStatus === 'Configured' || security?.exploitProtection?.enabled !== false}
                    value={security?.deviceGuard?.exploitProtection?.systemStatus || (security?.exploitProtection?.enabled !== false ? 'Enabled' : 'Disabled')}
                  />
                  {(security?.deviceGuard?.exploitProtection?.depEnabled !== undefined || security?.exploitProtection?.dep !== undefined) && (
                    <DetailRow 
                      label="DEP" 
                      isStatus 
                      enabled={security?.deviceGuard?.exploitProtection?.depEnabled ?? security?.exploitProtection?.dep}
                    />
                  )}
                  {(security?.deviceGuard?.exploitProtection?.aslrEnabled !== undefined || security?.exploitProtection?.aslr !== undefined) && (
                    <DetailRow 
                      label="ASLR" 
                      isStatus 
                      enabled={security?.deviceGuard?.exploitProtection?.aslrEnabled ?? security?.exploitProtection?.aslr}
                    />
                  )}
                  {security?.deviceGuard?.exploitProtection?.cfgEnabled !== undefined && (
                    <DetailRow 
                      label="CFG" 
                      isStatus 
                      enabled={security.deviceGuard.exploitProtection.cfgEnabled}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. Detection Card - AV/EDR Software */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detection</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS: EDR products (Defender, CrowdStrike, SentinelOne) + system extensions
              <>
                {/* Primary EDR Products with detailed info */}
                {security?.edrProducts?.products?.length > 0 ? (
                  security.edrProducts.products.map((product: any, idx: number) => (
                    <div key={idx} className={idx > 0 ? 'border-t border-gray-200 dark:border-gray-700 pt-3 mt-3' : ''}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-medium text-gray-900 dark:text-white">
                          {product.name || product.vendor || 'Unknown EDR'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.healthy === true || product.running === true
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : product.healthy === false
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {product.healthy === true || product.running === true ? 'Healthy' : product.healthy === false ? 'Issues' : 'Unknown'}
                        </span>
                      </div>
                      
                      {/* Microsoft Defender specific details */}
                      {product.identifier === 'com.microsoft.wdav' && (
                        <>
                          <DetailRow 
                            label="Real-time Protection" 
                            isStatus 
                            enabled={product.realTimeProtection} 
                          />
                          <DetailRow 
                            label="Cloud Protection" 
                            isStatus 
                            enabled={product.cloudProtection}
                          />
                          <DetailRow 
                            label="Tamper Protection" 
                            isStatus 
                            enabled={product.tamperProtection}
                          />
                          <DetailRow 
                            label="Behavior Monitoring" 
                            isStatus 
                            enabled={product.behaviorMonitoring}
                          />
                          <DetailRow label="App Version" value={product.version} />
                          <DetailRow label="Engine" value={product.engineVersion} />
                          <DetailRow label="Definitions" value={product.definitionsVersion} />
                          <DetailRow label="Definitions Updated" value={formatDate(product.definitionsUpdated)} />
                          <DetailRow 
                            label="Last Scan" 
                            value={product.lastScanTime ? `${formatDate(product.lastScanTime)} (${product.lastScanType || 'unknown'})` : 'Never'}
                          />
                          {product.lastScanFilesScanned > 0 && (
                            <DetailRow label="Files Scanned" value={product.lastScanFilesScanned?.toLocaleString()} />
                          )}
                          <DetailRow 
                            label="Threats Detected" 
                            value={String(product.totalThreatsDetected || 0)}
                          />
                          <DetailRow label="Licensed" isStatus enabled={product.licensed} />
                          <DetailRow 
                            label="Full Disk Access" 
                            isStatus 
                            enabled={product.fullDiskAccess}
                            value={product.fullDiskAccess ? 'Granted' : 'Not Granted'}
                          />
                          {product.healthIssues?.length > 0 && (
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                              <div className="font-medium mb-1">Health Issues:</div>
                              <ul className="list-disc list-inside">
                                {product.healthIssues.map((issue: string, i: number) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* CrowdStrike specific details */}
                      {product.identifier === 'com.crowdstrike.falcon' && (
                        <>
                          <DetailRow label="Version" value={product.version} />
                          <DetailRow label="State" value={product.state} />
                          <DetailRow label="Agent ID" value={product.agentId} mono />
                        </>
                      )}
                      
                      {/* SentinelOne specific details */}
                      {product.identifier === 'com.sentinelone.sentinel-agent' && (
                        <>
                          <DetailRow label="Version" value={product.version} />
                          <DetailRow label="Running" isStatus enabled={product.running} />
                        </>
                      )}
                      
                      {/* Generic EDR fallback */}
                      {!['com.microsoft.wdav', 'com.crowdstrike.falcon', 'com.sentinelone.sentinel-agent'].includes(product.identifier) && (
                        <>
                          <DetailRow label="Version" value={product.version} />
                          <DetailRow label="Running" isStatus enabled={product.running} />
                        </>
                      )}
                    </div>
                  ))
                ) : security?.endpointSecurity?.extensions?.length > 0 ? (
                  // Fallback: Show system extensions if no detailed EDR data
                  <>
                    <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                      Endpoint Security Extensions
                    </div>
                    {security.endpointSecurity.extensions.slice(0, 3).map((ext: any, idx: number) => (
                      <div key={idx} className="py-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900 dark:text-white font-medium">{ext.name || ext.identifier || 'Unknown'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ext.enabled || ext.active || ext.state?.includes('enabled')
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {ext.enabled || ext.active || ext.state?.includes('enabled') ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {ext.version && <span className="mr-2">{ext.version}</span>}
                          {ext.teamId && <span className="font-mono">{ext.teamId}</span>}
                        </div>
                      </div>
                    ))}
                    {security.endpointSecurity.extensions.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        +{security.endpointSecurity.extensions.length - 3} more extensions
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No EDR products detected
                  </div>
                )}
              </>
            ) : (
              // Windows: AV/EDR via Security Center
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  {security?.antivirus?.name || 'Windows Security'}
                </div>
                <DetailRow 
                  label="Real-time Protection" 
                  isStatus 
                  enabled={security?.antivirus?.realTimeProtection || security?.antivirus?.isEnabled} 
                />
                <DetailRow label="Version" value={security?.antivirus?.version} />
                <DetailRow 
                  label="Definitions" 
                  value={security?.antivirus?.isUpToDate ? 'Up to date' : 'Needs update'} 
                />
                <DetailRow label="Last Update" value={formatDate(security?.antivirus?.lastUpdate)} />
                <DetailRow 
                  label="Last Scan" 
                  value={`${formatDate(security?.antivirus?.lastScan)}${security?.antivirus?.scanType ? ` (${security.antivirus.scanType})` : ''}`} 
                />
                {/* Additional EDR products */}
                {security?.endpointDetection && security.endpointDetection.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                    {security.endpointDetection.map((edr: any, idx: number) => (
                      <DetailRow 
                        key={idx}
                        label={edr.name || 'EDR'} 
                        isStatus 
                        enabled={edr.running || edr.isRunning}
                        value={edr.running || edr.isRunning ? 'Active' : 'Inactive'}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 4. Tampering Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              {isMac ? (
                <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <Cpu className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tampering</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS: SIP + Secure Enclave + Root User + Secure Boot
              <>
                <DetailRow label="System Integrity Protection" isStatus neutral enabled={sipEnabled} value={sipEnabled ? 'Enabled' : 'Disabled'} />
                {/* Secure Enclave - no divider */}
                <DetailRow 
                  label="Secure Enclave" 
                  isStatus 
                  neutral
                  enabled={security?.secureEnclave?.present === 1 || security?.secureEnclave?.present === true} 
                  value={(security?.secureEnclave?.present === 1 || security?.secureEnclave?.present === true) ? 'Present' : 'Not Present'}
                />
                <DetailRow 
                  label="Biometric" 
                  isStatus 
                  neutral
                  enabled={security?.secureEnclave?.touchIdSupported === 1 || security?.secureEnclave?.touchIdSupported === true} 
                  value={(security?.secureEnclave?.touchIdSupported === 1 || security?.secureEnclave?.touchIdSupported === true) ? 'Supported' : 'Not Supported'}
                />
                {/* Secure Boot - Apple Silicon */}
                {security?.secureBoot?.externalBootAllowed && (
                  <DetailRow 
                    label="External Boot" 
                    value={security.secureBoot.externalBootAllowed}
                  />
                )}
                {/* Root User - security concern if enabled */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="Root User" 
                    isStatus 
                    neutral
                    enabled={!(security?.rootUser?.enabled === 1 || security?.rootUser?.enabled === true)}
                    value={(security?.rootUser?.enabled === 1 || security?.rootUser?.enabled === true) ? 'Enabled' : 'Disabled'}
                  />
                  <DetailRow 
                    label="Authenticated Root" 
                    isStatus 
                    neutral
                    enabled={!(security?.systemIntegrityProtection?.configFlags?.allowUnauthenticatedRoot === 1 || security?.systemIntegrityProtection?.configFlags?.allow_unauthenticated_root === 1)}
                    value={(security?.systemIntegrityProtection?.configFlags?.allowUnauthenticatedRoot === 1 || security?.systemIntegrityProtection?.configFlags?.allow_unauthenticated_root === 1) ? 'Allowed' : 'Required'}
                  />
                </div>
              </>
            ) : (
              // Windows TPM - support both snake_case and camelCase
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Trusted Platform Module
                </div>
                <DetailRow label="Present" isStatus enabled={tpm?.is_present || tpm?.isPresent} />
                <DetailRow label="Enabled" isStatus enabled={tpm?.is_enabled || tpm?.isEnabled} />
                <DetailRow label="Activated" isStatus enabled={tpm?.is_activated || tpm?.isActivated} />
                <DetailRow label="Version" value={tpm?.version} />
                <DetailRow label="Manufacturer" value={tpm?.manufacturer} />
              </>
            )}
          </div>
        </div>

        {/* 5. Firewall Card - Common */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <BrickWall className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Firewall</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Firewall
              <>
                <DetailRow 
                  label="Global State" 
                  isStatus
                  neutral
                  enabled={firewallEnabled}
                  value={firewallEnabled ? 'On' : 'Off'} 
                />
                <DetailRow 
                  label="Stealth Mode" 
                  isStatus 
                  neutral
                  enabled={security?.firewall?.stealthMode === 1 || security?.firewall?.stealthMode === true}
                  value={(security?.firewall?.stealthMode === 1 || security?.firewall?.stealthMode === true) ? 'Enabled' : 'Disabled'}
                />
                <DetailRow 
                  label="Logging" 
                  isStatus 
                  neutral
                  enabled={security?.firewall?.loggingEnabled === 1 || security?.firewall?.loggingEnabled === true}
                  value={(security?.firewall?.loggingEnabled === 1 || security?.firewall?.loggingEnabled === true) ? 'Enabled' : 'Disabled'}
                />
                <DetailRow 
                  label="Allow Signed Apps" 
                  isStatus 
                  neutral
                  enabled={security?.firewall?.allowSignedSoftware === 1 || security?.firewall?.allowSignedSoftware === true}
                  value={(security?.firewall?.allowSignedSoftware === 1 || security?.firewall?.allowSignedSoftware === true) ? 'Allowed' : 'Blocked'}
                />
              </>
            ) : (
              // Windows Firewall - support both snake_case and camelCase
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Windows Firewall
                </div>
                <DetailRow label="Profile" value={security.firewall?.profile || 'Domain/Private/Public'} />
                <DetailRow label="Inbound Rules" value={(security.firewall?.inbound_rules || security.firewall?.inboundRules)?.toString() || 'Active'} />
                <DetailRow label="Outbound Rules" value={(security.firewall?.outbound_rules || security.firewall?.outboundRules)?.toString() || 'Active'} />
              </>
            )}
          </div>
        </div>

        {/* 6. Remote Access Card - Both platforms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <Terminal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remote Access</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS: Secure Shell + Screen Sharing + ARD
              <>
                {/* Secure Shell/Remote Login - use collected SSH data */}
                <DetailRow 
                  label="Secure Shell (Remote Login)" 
                  isStatus 
                  neutral
                  enabled={isPowerShellTrue(security?.ssh?.enabled) || 
                          isPowerShellTrue(remoteManagement?.remoteLoginEnabled) || 
                          isPowerShellTrue(remoteManagement?.remote_login_enabled)}
                  value={(isPowerShellTrue(security?.ssh?.enabled) || 
                          isPowerShellTrue(remoteManagement?.remoteLoginEnabled) || 
                          isPowerShellTrue(remoteManagement?.remote_login_enabled)) ? 'Enabled' : 'Disabled'}
                />
                {(security?.ssh?.enabled === 1 || security?.ssh?.enabled === true) && (
                  <>
                    <DetailRow 
                      label="Authorized Users" 
                      value={security?.ssh?.authorizedUsers === 'all' ? 'All' : (security?.ssh?.authorizedUsers || 'Not set')} 
                    />
                    {/* Authentication methods - show as plain text */}
                    {(security?.ssh?.pubkeyAuthentication === 'yes' || security?.ssh?.passwordAuthentication === 'yes') && (
                      <DetailRow 
                        label="Authentication" 
                        value={[
                          security?.ssh?.pubkeyAuthentication === 'yes' ? 'Public Key' : null,
                          security?.ssh?.passwordAuthentication === 'yes' ? 'Password' : null
                        ].filter(Boolean).join(', ')} 
                      />
                    )}
                  </>
                )}
                {/* Remote Management / Screen Sharing - if RM enabled, Screen Sharing is controlled by it */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  {(() => {
                    const rmEnabled = isPowerShellTrue(remoteManagement?.ardEnabled) || 
                                     isPowerShellTrue(remoteManagement?.ard_enabled);
                    
                    const ssEnabled = rmEnabled || 
                                     isPowerShellTrue(remoteManagement?.screenSharingEnabled) || 
                                     isPowerShellTrue(remoteManagement?.screen_sharing_enabled);
                    
                    return (
                      <>
                        <DetailRow 
                          label="Remote Management" 
                          isStatus 
                          neutral
                          enabled={rmEnabled}
                          value={rmEnabled ? 'Enabled' : 'Disabled'}
                        />
                        <DetailRow 
                          label="Screen Sharing" 
                          isStatus 
                          neutral
                          enabled={ssEnabled}
                          value={ssEnabled ? 'Enabled' : 'Disabled'}
                        />
                      </>
                    );
                  })()}
                  {(remoteManagement?.ardAllowedUsers || remoteManagement?.ard_allowed_users) && (
                    <DetailRow 
                      label="Allowed Users" 
                      value={(String(remoteManagement.ardAllowedUsers) === 'true' || String(remoteManagement.ard_allowed_users) === 'true') ? 'All Users' : (remoteManagement.ardAllowedUsers || remoteManagement.ard_allowed_users)} 
                    />
                  )}
                </div>
              </>
            ) : (
              // Windows: RDP + Secure Shell
              <>
                {/* RDP */}
                <DetailRow 
                  label="Remote Desktop (RDP)" 
                  isStatus 
                  enabled={security?.rdp?.isEnabled || security?.rdp?.is_enabled} 
                />
                <DetailRow 
                  label="RDP Port" 
                  value={security?.rdp?.port || '3389'} 
                />
                <DetailRow 
                  label="Network Level Auth" 
                  isStatus 
                  enabled={security?.rdp?.nlaEnabled || security?.rdp?.nla_enabled} 
                />
                {/* Secure Shell/OpenSSH */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow label="OpenSSH Installed" isStatus enabled={secureShellData?.is_installed || secureShellData?.isInstalled} />
                  <DetailRow label="Secure Shell Service" isStatus enabled={secureShellData?.is_service_running || secureShellData?.isServiceRunning} />
                  <DetailRow label="Secure Shell Firewall Rule" isStatus enabled={secureShellData?.is_firewall_rule_present || secureShellData?.isFirewallRulePresent} />
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Certificates Table */}
      {(() => {
        // Get certificates from security data - support both array formats
        const certificates = security?.certificates || []
        const hasCertificates = Array.isArray(certificates) && certificates.length > 0
        
        // Helper to format date for display
        const formatCertDate = (dateStr?: string) => {
          if (!dateStr) return '—'
          try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return dateStr
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          } catch {
            return dateStr
          }
        }
        
        // Helper to get status badge
        const CertStatusBadge = ({ status, daysUntilExpiry }: { status: string, daysUntilExpiry?: number }) => {
          if (status === 'Expired') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="w-3 h-3" />
                Expired
              </span>
            )
          }
          if (status === 'ExpiringSoon') {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                {daysUntilExpiry !== undefined ? `${daysUntilExpiry}d` : 'Expiring'}
              </span>
            )
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              Valid
            </span>
          )
        }
        
        // Count by status
        const expiredCount = certificates.filter((c: any) => c.status === 'Expired' || c.isExpired).length
        const expiringCount = certificates.filter((c: any) => c.status === 'ExpiringSoon' || c.isExpiringSoon).length
        const validCount = certificates.filter((c: any) => c.status === 'Valid' || (!c.isExpired && !c.isExpiringSoon)).length
        
        // Get unique stores
        const stores = Array.from(new Set(
          certificates.map((c: any) => {
            const storeLocation = c.storeLocation || c.store_location || ''
            return storeLocation === 'LocalMachine' || storeLocation === 'System' ? 'System' : 'User'
          })
        )).sort()
        
        // Helper to expand all stores when filter changes
        const expandAllStores = () => {
          const allStores = new Set(stores as string[])
          setExpandedStores(allStores)
        }
        
        // Filter certificates
        const filteredCertificates = certificates.filter((cert: any) => {
          const status = cert.status || (cert.isExpired ? 'Expired' : (cert.isExpiringSoon ? 'ExpiringSoon' : 'Valid'))
          const statusMatch = certFilter === 'all' || 
            (certFilter === 'expired' && status === 'Expired') ||
            (certFilter === 'expiringsoon' && status === 'ExpiringSoon') ||
            (certFilter === 'valid' && status === 'Valid')
          
          if (!statusMatch) return false
          
          // Store filter
          if (storeFilter !== 'all') {
            const storeLocation = cert.storeLocation || cert.store_location || ''
            const certStore = storeLocation === 'LocalMachine' || storeLocation === 'System' ? 'System' : 'User'
            
            if (certStore !== storeFilter) return false
          }
          
          // Self-signed filter
          if (selfSignedFilter) {
            const isSelfSigned = cert.isSelfSigned || cert.is_self_signed || cert.self_signed === '1' || cert.self_signed === 1
            if (!isSelfSigned) return false
          }
          
          // Search filter
          if (certSearch.trim()) {
            const searchLower = certSearch.toLowerCase()
            const commonName = (cert.commonName || cert.common_name || '').toLowerCase()
            const subject = (cert.subject || '').toLowerCase()
            const issuer = (cert.issuer || '').toLowerCase()
            const thumbprint = (cert.thumbprint || cert.sha1 || '').toLowerCase()
            
            return commonName.includes(searchLower) || 
                   subject.includes(searchLower) || 
                   issuer.includes(searchLower) ||
                   thumbprint.includes(searchLower)
          }
          
          return true
        })
        
        // Group certificates by store
        const groupedCertificates = filteredCertificates.reduce((acc: any, cert: any) => {
          const storeLocation = cert.storeLocation || cert.store_location || ''
          const store = storeLocation === 'LocalMachine' || storeLocation === 'System' ? 'System' : 'User'
          if (!acc[store]) acc[store] = []
          acc[store].push(cert)
          return acc
        }, {})
        
        return (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Certificates</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {certificates.length} total certificates
                    </p>
                  </div>
                </div>
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                    placeholder="Search certificates..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                  />
                </div>
              </div>

              {hasCertificates && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Store Filter Pills - toggle on/off (LEFT SIDE) */}
                    {stores.length > 1 && (stores as string[]).map((store: string) => {
                      const storeCount = certificates.filter((c: any) => {
                        const storeLocation = c.storeLocation || c.store_location || ''
                        const certStore = storeLocation === 'LocalMachine' || storeLocation === 'System' ? 'System' : 'User'
                        return certStore === store
                      }).length
                      
                      return (
                        <button
                          key={store}
                          onClick={() => {
                            setStoreFilter(storeFilter === store ? 'all' : store)
                            expandAllStores()
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            storeFilter === store
                              ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                          }`}
                        >
                          {store} ({storeCount})
                        </button>
                      )
                    })}
                    
                    {/* Separator */}
                    {stores.length > 1 && (
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                    )}
                    
                    {/* Status Filter Pills - toggle on/off (RIGHT SIDE) */}
                    <button
                      onClick={() => {
                        setCertFilter(certFilter === 'valid' ? 'all' : 'valid')
                        expandAllStores()
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        certFilter === 'valid'
                          ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                          : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                      }`}
                    >
                      Valid ({validCount})
                    </button>
                    <button
                      onClick={() => {
                        setCertFilter(certFilter === 'expiringsoon' ? 'all' : 'expiringsoon')
                        expandAllStores()
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        certFilter === 'expiringsoon'
                          ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800'
                      }`}
                    >
                      Expiring Soon ({expiringCount})
                    </button>
                    <button
                      onClick={() => {
                        setCertFilter(certFilter === 'expired' ? 'all' : 'expired')
                        expandAllStores()
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        certFilter === 'expired'
                          ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                      }`}
                    >
                      Expired ({expiredCount})
                    </button>
                    
                    {/* Self-signed Filter */}
                    <button
                      onClick={() => {
                        setSelfSignedFilter(!selfSignedFilter)
                        expandAllStores()
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        selfSignedFilter
                          ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                      }`}
                    >
                      Self-signed ({certificates.filter((c: any) => c.isSelfSigned || c.is_self_signed || c.self_signed === '1' || c.self_signed === 1).length})
                    </button>
                  </div>
                  
                  {/* Clear Filters Button - shown when any filter is active */}
                  {(certFilter !== 'all' || storeFilter !== 'all' || selfSignedFilter || certSearch.trim()) && (
                    <button
                      onClick={() => {
                        setCertFilter('all')
                        setStoreFilter('all')
                        setSelfSignedFilter(false)
                        setCertSearch('')
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {hasCertificates ? (
              filteredCertificates.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(groupedCertificates).sort().map(([storeName, storeCerts]: [string, any]) => {
                    const toggleExpanded = () => {
                      const newSet = new Set(expandedStores)
                      if (newSet.has(storeName)) {
                        newSet.delete(storeName)
                      } else {
                        newSet.add(storeName)
                      }
                      setExpandedStores(newSet)
                    }
                    
                    return (
                      <div key={storeName} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <button
                          onClick={toggleExpanded}
                          className="w-full px-6 py-4 flex items-center justify-between text-left"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{storeName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {storeCerts.length} certificate{storeCerts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedStores.has(storeName) ? 'rotate-180' : ''}`}
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {expandedStores.has(storeName) && (
                          <div className="pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900/30">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Name / Subject / Issuer</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Valid From</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Expires</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Keychain</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                  {storeCerts.map((cert: any, index: number) => {
                                    // Normalize field names (support both camelCase and snake_case)
                                    const commonName = cert.commonName || cert.common_name || ''
                                    const subject = cert.subject || ''
                                    const issuer = cert.issuer || ''
                                    const notBefore = cert.notBefore || cert.not_before || cert.not_valid_before || ''
                                    const notAfter = cert.notAfter || cert.not_after || cert.not_valid_after || ''
                                    const status = cert.status || (cert.isExpired ? 'Expired' : (cert.isExpiringSoon ? 'ExpiringSoon' : 'Valid'))
                                    const daysUntilExpiry = cert.daysUntilExpiry ?? cert.days_until_expiry
                                    const thumbprint = cert.thumbprint || cert.sha1 || ''
                                    const isSelfSigned = cert.isSelfSigned || cert.is_self_signed || cert.self_signed === '1' || cert.self_signed === 1
                                    const certPath = cert.path || ''
                                    
                                    // Display name: prefer commonName, fallback to subject
                                    const displayName = commonName || (subject ? subject.split(',')[0]?.replace(/^CN\s*=\s*/i, '') : '—')
                                    
                                    // Extract keychain name from path (e.g., /Library/Keychains/System.keychain → System.keychain)
                                    const keychainName = certPath ? certPath.split('/').pop() || certPath : '—'
                                    
                                    // Truncate long issuer names
                                    const displayIssuer = issuer.length > 50 
                                      ? issuer.substring(0, 50) + '...' 
                                      : (issuer || '—')
                                    
                                    return (
                                      <tr key={`${storeName}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                        <td className="px-4 py-3">
                                          <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {displayName}
                                              {isSelfSigned && (
                                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(self-signed)</span>
                                              )}
                                            </span>
                                            {issuer && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400" title={issuer}>
                                                {displayIssuer}
                                              </span>
                                            )}
                                            {thumbprint && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[300px]" title={thumbprint}>
                                                {thumbprint.substring(0, 20)}...
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <CertStatusBadge status={status} daysUntilExpiry={daysUntilExpiry} />
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {formatCertDate(notBefore)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {formatCertDate(notAfter)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-gray-600 dark:text-gray-300 font-mono" title={certPath}>
                                            {keychainName}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <Award className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No certificates match the selected filters
                  </p>
                </div>
              )
            ) : (
              <div className="px-5 py-8 text-center">
                <Award className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No certificates collected</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Certificate data will appear after the next device check-in
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Common Vulnerabilities and Exposures (CVE) Table */}
      {(() => {
        // Get CVE data from security - support both SOFA (Mac) and Windows Update formats
        // Mac: sofaUnpatchedCves, sofaSecurityReleaseInfo
        // Windows: securityUpdates (to be implemented)
        const sofaCves = security?.sofaUnpatchedCves || security?.sofa_unpatched_cves || []
        const sofaReleaseInfo = security?.sofaSecurityReleaseInfo || security?.sofa_security_release_info || {}
        const windowsUpdates = security?.securityUpdates || security?.security_updates || []
        
        // Combine Mac and Windows CVE sources
        const allCves: Array<{
          cve: string
          osVersion: string
          patchedVersion?: string
          activelyExploited: boolean
          severity?: string
          url?: string
          source: 'sofa' | 'windows'
        }> = []
        
        // Add SOFA CVEs (Mac)
        if (Array.isArray(sofaCves)) {
          sofaCves.forEach((cve: any) => {
            allCves.push({
              cve: cve.cve || cve.cve_id || 'Unknown',
              osVersion: cve.os_version || cve.osVersion || sofaReleaseInfo?.os_version || '',
              patchedVersion: cve.patched_version || cve.patchedVersion || '',
              activelyExploited: cve.actively_exploited === 'true' || cve.actively_exploited === true || cve.activelyExploited === true,
              url: cve.url || '',
              source: 'sofa'
            })
          })
        }
        
        // Add Windows Security Updates (Windows)
        if (Array.isArray(windowsUpdates)) {
          windowsUpdates.forEach((update: any) => {
            // Windows updates may have multiple CVEs per update
            const cves = update.cves || update.cve_ids || (update.cve ? [update.cve] : [])
            cves.forEach((cveId: string) => {
              allCves.push({
                cve: cveId,
                osVersion: update.os_version || update.osVersion || '',
                patchedVersion: update.kb_article || update.kbArticle || update.update_id || '',
                activelyExploited: update.actively_exploited === true || update.exploited === true,
                severity: update.severity || update.msrc_severity || '',
                url: update.url || update.support_url || (cveId ? `https://msrc.microsoft.com/update-guide/vulnerability/${cveId}` : ''),
                source: 'windows'
              })
            })
          })
        }
        
        const hasCves = allCves.length > 0
        const exploitedCount = allCves.filter(c => c.activelyExploited).length
        const totalCveCount = sofaReleaseInfo?.unique_cves_count || sofaReleaseInfo?.uniqueCvesCount || allCves.length
        
        return (
          <div className="mt-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {/* CVE Table Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Common Vulnerabilities and Exposures
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isMac ? 'SOFA Security Intelligence' : 'Windows Security Updates'} • {hasCves ? `${allCves.length} unpatched` : 'Up to date'}
                    </p>
                  </div>
                </div>
                {hasCves && (
                  <div className="flex items-center gap-3">
                    {exploitedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="w-3 h-3" />
                        {exploitedCount} Actively Exploited
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {totalCveCount} total CVEs in current release
                    </span>
                  </div>
                )}
              </div>
              
              {/* SOFA Release Info Summary (Mac only) */}
              {isMac && sofaReleaseInfo && (sofaReleaseInfo.update_name || sofaReleaseInfo.updateName) && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    <span className="font-medium">Release:</span> {sofaReleaseInfo.update_name || sofaReleaseInfo.updateName}
                  </span>
                  {(sofaReleaseInfo.release_date || sofaReleaseInfo.releaseDate) && (
                    <span>
                      <span className="font-medium">Date:</span> {new Date(sofaReleaseInfo.release_date || sofaReleaseInfo.releaseDate).toLocaleDateString()}
                    </span>
                  )}
                  {(sofaReleaseInfo.days_since_previous_release || sofaReleaseInfo.daysSincePreviousRelease) && (
                    <span>
                      <span className="font-medium">Days since last:</span> {sofaReleaseInfo.days_since_previous_release || sofaReleaseInfo.daysSincePreviousRelease}
                    </span>
                  )}
                  {(sofaReleaseInfo.security_info || sofaReleaseInfo.securityInfo) && (
                    <a 
                      href={sofaReleaseInfo.security_info || sofaReleaseInfo.securityInfo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Apple Security Notes →
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* CVE Table */}
            {hasCves ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">CVE ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">OS Version</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Patched In</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCves.map((cve, idx) => (
                      <tr 
                        key={`${cve.cve}-${idx}`}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      >
                        <td className="px-4 py-3">
                          {cve.url ? (
                            <a 
                              href={cve.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {cve.cve}
                            </a>
                          ) : (
                            <span className="font-mono text-gray-900 dark:text-white">{cve.cve}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {cve.osVersion || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {cve.patchedVersion || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {cve.activelyExploited ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              <XCircle className="w-3 h-3" />
                              Exploited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Unpatched
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            cve.source === 'sofa' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {cve.source === 'sofa' ? 'SOFA' : 'MSRC'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="w-10 h-10 mx-auto text-green-500 dark:text-green-400 mb-3" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">No Unpatched Vulnerabilities</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isMac 
                    ? 'This device is running a fully patched version of macOS'
                    : 'This device has all available security updates installed'
                  }
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Debug Accordion for API Data */}
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
              device.modules.security
            </span>
          </summary>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={() => {
                    const jsonString = JSON.stringify(device?.modules?.security, null, 2)
                    navigator.clipboard.writeText(jsonString)
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
                {JSON.stringify(device?.modules?.security, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default SecurityTab