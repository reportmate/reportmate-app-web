/**
 * Security Tab Component  
 * Security features and compliance information with 3x2 grid design
 * Supports both Windows and macOS platforms
 */

import React from 'react'
import { convertPowerShellObjects } from '../../lib/utils/powershell-parser'
import { Lock, BrickWall, HardDrive, Fingerprint, Cpu, Terminal, Shield, ShieldCheck, Key, Eye } from 'lucide-react'

interface SecurityTabProps {
  device: any
}

const StatusBadge = ({ enabled, activeLabel = 'Enabled', inactiveLabel = 'Disabled' }: { 
  enabled: boolean | undefined, 
  activeLabel?: string, 
  inactiveLabel?: string 
}) => {
  if (enabled === undefined) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        Unknown
      </span>
    )
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
      enabled 
        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
    }`}>
      {enabled ? activeLabel : inactiveLabel}
    </span>
  )
}

const DetailRow = ({ label, value, isStatus, enabled }: { 
  label: string, 
  value?: string, 
  isStatus?: boolean, 
  enabled?: boolean 
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    {isStatus ? (
      <StatusBadge enabled={enabled} activeLabel={value || 'Yes'} inactiveLabel={value || 'No'} />
    ) : (
      <span className="text-xs font-medium text-gray-900 dark:text-white">{value || 'Unknown'}</span>
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
  const security = convertPowerShellObjects(rawSecurity)
  const secureShell = security?.secureShell
  const isMac = isMacOS(device)

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
  // FileVault (disk encryption)
  const fileVaultEnabled = security.fileVault?.enabled === 1 || security.fileVault?.enabled === true || security.fileVault?.status === 'On'
  // System Integrity Protection
  const sipEnabled = security.systemIntegrityProtection?.enabled === 1 || security.systemIntegrityProtection?.enabled === true
  // Gatekeeper
  const gatekeeperEnabled = security.gatekeeper?.enabled === 1 || security.gatekeeper?.enabled === true
  // Secure Boot (Mac)
  const macSecureBootEnabled = security.secureBoot?.secureBootEnabled === 1 || security.secureBoot?.secureBootEnabled === true
  // Firmware Password
  const firmwarePasswordEnabled = security.firmwarePassword?.enabled === 1 || security.firmwarePassword?.enabled === true
  // SSH (Mac) - note: enabled means it's ON, which could be a security concern
  const macSshEnabled = security.ssh?.enabled === 1 || security.ssh?.enabled === true

  // === Windows Security Status ===
  // Windows Hello
  const windowsHelloEnabled = security.windowsHello?.statusDisplay !== 'Disabled' && (
    security.windowsHello?.credentialProviders?.pinEnabled || 
    security.windowsHello?.credentialProviders?.faceRecognitionEnabled ||
    security.windowsHello?.credentialProviders?.fingerprintEnabled
  )
  // TPM
  const tpmActive = security.tpm?.isPresent && security.tpm?.isEnabled && security.tpm?.isActivated
  // SSH (Windows)
  const sshConfigured = secureShell?.isConfigured || secureShell?.isServiceRunning

  // === Common Security Status ===
  // Firewall - handle both Mac and Windows formats
  const firewallEnabled = security.firewall?.isEnabled || 
                          security.firewall?.enabled === 1 || 
                          security.firewall?.enabled === true ||
                          security.firewall?.globalState === 'on'

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
        {(security.antivirus?.lastScan || security.lastSecurityScan) && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Scan</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(security.antivirus?.lastScan || security.lastSecurityScan)}
            </div>
          </div>
        )}
      </div>

      {/* 3x2 Grid of Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. Encryption Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Encryption</h3>
            </div>
            <StatusBadge 
              enabled={isMac ? fileVaultEnabled : security.encryption?.bitLocker?.isEnabled} 
              activeLabel="Encrypted" 
              inactiveLabel="Not Encrypted" 
            />
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS FileVault
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  FileVault Disk Encryption
                </div>
                <DetailRow label="Status" value={security.fileVault?.status || (fileVaultEnabled ? 'Enabled' : 'Disabled')} />
                <DetailRow label="Encrypted Volumes" value={
                  security.fileVault?.encryptedVolumes?.length > 0 
                    ? security.fileVault.encryptedVolumes.map((v: any) => v.volumeName || v).join(', ')
                    : fileVaultEnabled ? 'System Volume' : 'None'
                } />
              </>
            ) : (
              // Windows BitLocker
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  BitLocker Drive Encryption
                </div>
                {security.encryption?.bitLocker?.encryptedDrives && security.encryption.bitLocker.encryptedDrives.length > 0 ? (
                  <DetailRow label="Drives" value={security.encryption.bitLocker.encryptedDrives.join(', ')} />
                ) : (
                  <DetailRow label="Drives" value="None encrypted" />
                )}
                <DetailRow label="Method" value={security.encryption?.bitLocker?.encryptionMethod || 'XTS-AES'} />
                <DetailRow label="Status" value={security.encryption?.bitLocker?.status || (security.encryption?.bitLocker?.isEnabled ? 'Enabled' : 'Disabled')} />
              </>
            )}
          </div>
        </div>

        {/* 2. Authentication/SIP Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                {isMac ? (
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isMac ? 'System Integrity' : 'Authentication'}
              </h3>
            </div>
            <StatusBadge enabled={isMac ? sipEnabled : windowsHelloEnabled} />
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS System Integrity Protection
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  System Integrity Protection
                </div>
                <DetailRow label="SIP Enabled" isStatus enabled={sipEnabled} />
                <DetailRow 
                  label="Details" 
                  value={security.systemIntegrityProtection?.details?.split('\n')[0] || (sipEnabled ? 'Protected' : 'Disabled')} 
                />
              </>
            ) : (
              // Windows Hello
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Windows Hello
                </div>
                <DetailRow 
                  label="PIN" 
                  isStatus 
                  enabled={security.windowsHello?.credentialProviders?.pinEnabled} 
                />
                <DetailRow 
                  label="Face Recognition" 
                  isStatus 
                  enabled={security.windowsHello?.credentialProviders?.faceRecognitionEnabled} 
                />
                <DetailRow 
                  label="Fingerprint" 
                  isStatus 
                  enabled={security.windowsHello?.credentialProviders?.fingerprintEnabled} 
                />
                <DetailRow 
                  label="Domain PIN Logon" 
                  isStatus 
                  enabled={security.windowsHello?.policies?.allowDomainPinLogon} 
                />
              </>
            )}
          </div>
        </div>

        {/* 3. Protection/Gatekeeper Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isMac ? 'Gatekeeper' : 'Protection'}
              </h3>
            </div>
            <StatusBadge enabled={isMac ? gatekeeperEnabled : security.antivirus?.isEnabled} />
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Gatekeeper
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  App Security
                </div>
                <DetailRow label="Gatekeeper" isStatus enabled={gatekeeperEnabled} />
                <DetailRow 
                  label="Assessments" 
                  isStatus 
                  enabled={security.gatekeeper?.assessmentsEnabled === 1 || security.gatekeeper?.assessmentsEnabled === true} 
                />
                <DetailRow 
                  label="Developer ID" 
                  isStatus 
                  enabled={security.gatekeeper?.developerIdEnabled === 1 || security.gatekeeper?.developerIdEnabled === true} 
                />
              </>
            ) : (
              // Windows Antivirus
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {security.antivirus?.name || 'Windows Defender'}
                </div>
                <DetailRow label="Version" value={security.antivirus?.version} />
                <DetailRow label="Definitions" value={security.antivirus?.isUpToDate ? 'Up to date' : 'Needs update'} />
                <DetailRow label="Last Update" value={formatDate(security.antivirus?.lastUpdate)} />
                <DetailRow label="Last Scan" value={`${formatDate(security.antivirus?.lastScan)}${security.antivirus?.scanType ? ` (${security.antivirus.scanType})` : ''}`} />
              </>
            )}
          </div>
        </div>

        {/* 4. Tampering/Secure Boot Card - Platform Specific */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                {isMac ? (
                  <Key className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Cpu className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isMac ? 'Boot Security' : 'Tampering'}
              </h3>
            </div>
            <StatusBadge 
              enabled={isMac ? (macSecureBootEnabled || firmwarePasswordEnabled) : tpmActive} 
              activeLabel="Secure" 
              inactiveLabel="Not Secure" 
            />
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Secure Boot & Firmware
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Startup Security
                </div>
                <DetailRow label="Secure Boot" isStatus enabled={macSecureBootEnabled} />
                <DetailRow 
                  label="Security Level" 
                  value={security.secureBoot?.securityLevel || 'Unknown'} 
                />
                <DetailRow label="Firmware Password" isStatus enabled={firmwarePasswordEnabled} />
                <DetailRow 
                  label="Firmware Details" 
                  value={security.firmwarePassword?.details?.split('\n')[0] || 'Not configured'} 
                />
              </>
            ) : (
              // Windows TPM
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Trusted Platform Module
                </div>
                <DetailRow label="Present" isStatus enabled={security.tpm?.isPresent} />
                <DetailRow label="Enabled" isStatus enabled={security.tpm?.isEnabled} />
                <DetailRow label="Activated" isStatus enabled={security.tpm?.isActivated} />
                <DetailRow label="Version" value={security.tpm?.version} />
                <DetailRow label="Manufacturer" value={security.tpm?.manufacturer} />
              </>
            )}
          </div>
        </div>

        {/* 5. Firewall Card - Common */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <BrickWall className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Firewall</h3>
            </div>
            <StatusBadge enabled={firewallEnabled} />
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS Firewall
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Application Firewall
                </div>
                <DetailRow 
                  label="Global State" 
                  value={security.firewall?.globalState || (firewallEnabled ? 'On' : 'Off')} 
                />
                <DetailRow 
                  label="Stealth Mode" 
                  isStatus 
                  enabled={security.firewall?.stealthMode === 1 || security.firewall?.stealthMode === true} 
                />
                <DetailRow 
                  label="Logging" 
                  isStatus 
                  enabled={security.firewall?.loggingEnabled === 1 || security.firewall?.loggingEnabled === true} 
                />
                <DetailRow 
                  label="Signed Software" 
                  isStatus 
                  enabled={security.firewall?.allowSignedSoftware === 1 || security.firewall?.allowSignedSoftware === true} 
                />
              </>
            ) : (
              // Windows Firewall
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Windows Firewall
                </div>
                <DetailRow label="Profile" value={security.firewall?.profile || 'Domain/Private/Public'} />
                <DetailRow label="Inbound Rules" value={security.firewall?.inboundRules?.toString() || 'Active'} />
                <DetailRow label="Outbound Rules" value={security.firewall?.outboundRules?.toString() || 'Active'} />
              </>
            )}
          </div>
        </div>

        {/* 6. Secure Shell Card - Common */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <Terminal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Secure Shell</h3>
            </div>
            {isMac ? (
              <StatusBadge 
                enabled={macSshEnabled} 
                activeLabel="Enabled" 
                inactiveLabel="Disabled" 
              />
            ) : (
              <StatusBadge 
                enabled={sshConfigured} 
                activeLabel={secureShell?.statusDisplay || 'Configured'} 
                inactiveLabel={secureShell?.statusDisplay || 'Not Configured'} 
              />
            )}
          </div>
          
          <div className="space-y-2">
            {isMac ? (
              // macOS SSH/Remote Login
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Remote Login
                </div>
                <DetailRow label="Status" isStatus enabled={macSshEnabled} />
                <DetailRow 
                  label="Details" 
                  value={security.ssh?.details || (macSshEnabled ? 'Remote Login: On' : 'Remote Login: Off')} 
                />
                <DetailRow 
                  label="Authentication" 
                  value={security.ssh?.authMethod || security.ssh?.authentication || 'Password & Key'} 
                />
              </>
            ) : (
              // Windows OpenSSH
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  OpenSSH Server
                </div>
                <DetailRow label="Installed" isStatus enabled={secureShell?.isInstalled} />
                <DetailRow label="Service Running" isStatus enabled={secureShell?.isServiceRunning} />
                <DetailRow label="Firewall Rule" isStatus enabled={secureShell?.isFirewallRulePresent} />
                <DetailRow label="Keys Deployed" isStatus enabled={secureShell?.isKeyDeployed} />
                <DetailRow label="Service Status" value={secureShell?.serviceStatus || 'Unknown'} />
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