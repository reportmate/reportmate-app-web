/**
 * Security Tab Component  
 * Security features and compliance information with 3x2 grid design
 * Supports both Windows and macOS platforms
 * 
 * Card Structure:
 * 1. Encryption - BitLocker (Win) / FileVault (Mac)
 * 2. Authentication - Windows Hello (Win) / Platform SSO (Mac)
 * 3. Protection - Defender (Win) / Gatekeeper + MRT + XProtect (Mac)
 * 4. Tampering - TPM (Win) / SIP (Mac)
 * 5. Firewall - Both platforms
 * 6. Remote Access - SSH + RDP (Win) / SSH + Screen Sharing (Mac)
 */

import React from 'react'
import { convertPowerShellObjects, normalizeKeys, isPowerShellTrue } from '../../lib/utils/powershell-parser'
import { Lock, BrickWall, HardDrive, Fingerprint, Cpu, Terminal, Shield, ShieldCheck, Key, Eye } from 'lucide-react'

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
              // macOS FileVault + SecureToken + BootstrapToken
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
                {/* Secure Token + Bootstrap Token */}
                <DetailRow 
                  label="Secure Token" 
                  isStatus 
                  enabled={security?.secureToken?.enabled === true || security?.secureToken?.enabled === 1 || security?.secureToken?.tokenGrantedCount > 0} 
                  value={(security?.secureToken?.enabled === true || security?.secureToken?.enabled === 1 || security?.secureToken?.tokenGrantedCount > 0) ? 'Granted' : 'Not Granted'}
                />
                <DetailRow 
                  label="Bootstrap Token" 
                  isStatus 
                  enabled={security?.bootstrapToken?.escrowed === true || security?.bootstrapToken?.escrowed === 1} 
                  value={(security?.bootstrapToken?.escrowed === true || security?.bootstrapToken?.escrowed === 1) ? 'Escrowed' : 'Not Escrowed'}
                />
                <DetailRow 
                  label="Token Holders · Volume Owners" 
                  value={security?.secureToken?.usersWithToken?.length > 0 
                    ? security.secureToken.usersWithToken.join(', ') 
                    : 'None'} 
                />
                {/* Recovery Keys - Critical for MDM */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="Personal Recovery Key" 
                    isStatus 
                    enabled={security?.fileVault?.personalRecoveryKey === true || security?.fileVault?.personalRecoveryKey === 1} 
                    value={(security?.fileVault?.personalRecoveryKey === true || security?.fileVault?.personalRecoveryKey === 1) ? 'Escrowed' : 'Not Escrowed'}
                  />
                  <DetailRow 
                    label="Institutional Recovery Key" 
                    isStatus 
                    enabled={security?.fileVault?.institutionalRecoveryKey === true || security?.fileVault?.institutionalRecoveryKey === 1} 
                    value={(security?.fileVault?.institutionalRecoveryKey === true || security?.fileVault?.institutionalRecoveryKey === 1) ? 'Escrowed' : 'Not Escrowed'}
                  />
                </div>
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

        {/* 2. Authentication Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Authentication</h3>
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Platform SSO
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Platform Single Sign-On
                </div>
                <DetailRow 
                  label="Provider" 
                  value={security?.platformSSO?.provider || 'Not configured'}
                  tooltip={security?.platformSSO?.extensionIdentifier}
                />
                <DetailRow 
                  label="Registration" 
                  isStatus
                  enabled={security?.platformSSO?.registered === true || security?.platformSSO?.registered === 1}
                  value={(security?.platformSSO?.registered === true || security?.platformSSO?.registered === 1) ? 'Registered' : 'Not Registered'}
                />
                {/* SSO Tokens - device level (shown right after Registration) */}
                {!(security?.platformSSO?.users?.length > 0) && (
                  <DetailRow 
                    label="SSO Tokens" 
                    isStatus
                    enabled={security?.platformSSO?.tokensPresent === true || security?.platformSSO?.tokensPresent === 1 || security?.platformSSO?.tokenStatus === 'Present'}
                    value={(security?.platformSSO?.tokensPresent === true || security?.platformSSO?.tokensPresent === 1 || security?.platformSSO?.tokenStatus === 'Present') ? 'Present' : 'Missing'}
                  />
                )}
                <DetailRow 
                  label="Method" 
                  value={security?.platformSSO?.method || 'Unknown'} 
                />
                {/* Show registered users - no divider */}
                {security?.platformSSO?.users?.length > 0 && (
                  security.platformSSO.users.map((user: any, index: number) => (
                    <div key={index} className={index > 0 ? "mt-2 pt-2 border-t border-gray-100 dark:border-gray-700" : "mt-2"}>
                      <DetailRow 
                        label={user.username ? `/Users/${user.username}` : 'User'} 
                        value={user.loginEmail || user.upn || '—'} 
                      />
                      <DetailRow 
                        label="SSO Tokens" 
                        isStatus
                        enabled={user.tokensPresent === true || user.tokensPresent === 1}
                        value={(user.tokensPresent === true || user.tokensPresent === 1) ? 'Present' : 'Missing'}
                      />
                    </div>
                  ))
                )}
                {/* Activation Lock & Find My Mac - moved from Tampering */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2">
                  <DetailRow 
                    label="Activation Lock" 
                    isStatus
                    enabled={!(security?.activationLock?.status === 'Enabled' || security?.activationLock?.status === 'Likely Enabled')}
                    value={(security?.activationLock?.status === 'Enabled' || security?.activationLock?.status === 'Likely Enabled') ? 'Locked' : 'Unlocked'}
                  />
                  <DetailRow 
                    label="Find My Mac" 
                    isStatus
                    enabled={security?.activationLock?.findMyMac === 'Enabled'}
                    value={security?.activationLock?.findMyMac === 'Enabled' ? 'Enabled' : 'Disabled'}
                  />
                  {/* Always show iCloud account - critical for tracking down user to deactivate */}
                  <DetailRow 
                    label="iCloud Account" 
                    value={security?.activationLock?.email || security?.activationLock?.ownerDisplayName || '—'} 
                  />
                </div>
              </>
            ) : (
              // Windows Hello (all camelCase after normalization)
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Windows Hello
                </div>
                <DetailRow 
                  label="PIN" 
                  isStatus 
                  enabled={windowsHello?.credentialProviders?.pinEnabled} 
                />
                <DetailRow 
                  label="Face Recognition" 
                  isStatus 
                  enabled={windowsHello?.credentialProviders?.faceRecognitionEnabled} 
                />
                <DetailRow 
                  label="Fingerprint" 
                  isStatus 
                  enabled={windowsHello?.credentialProviders?.fingerprintEnabled} 
                />
                <DetailRow 
                  label="Domain PIN Logon" 
                  isStatus 
                  enabled={windowsHello?.policies?.allowDomainPinLogon} 
                />
              </>
            )}
          </div>
        </div>

        {/* 3. Protection Card - Platform Specific */}
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
                  Malware Defenses
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
              // Windows Antivirus (all camelCase after normalization)
              <>
                <div className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  {security?.antivirus?.name || 'Windows Defender'}
                </div>
                <DetailRow label="Version" value={security?.antivirus?.version} />
                <DetailRow label="Definitions" value={security?.antivirus?.isUpToDate ? 'Up to date' : 'Needs update'} />
                <DetailRow label="Last Update" value={formatDate(security?.antivirus?.lastUpdate)} />
                <DetailRow label="Last Scan" value={`${formatDate(security?.antivirus?.lastScan)}${security?.antivirus?.scanType ? ` (${security.antivirus.scanType})` : ''}`} />
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