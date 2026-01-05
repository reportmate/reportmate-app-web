/**
 * Security Tab Component  
 * Security features and compliance information with 3x2 grid design
 * Supports both Windows and macOS platforms
 * 
 * SNAKE_CASE: All fields match API response format directly
 */

import React from 'react'
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

// Platform detection helper (snake_case)
const isMacOS = (device: any): boolean => {
  const platform = device?.platform?.toLowerCase() || 
                   device?.modules?.metadata?.platform?.toLowerCase() ||
                   device?.metadata?.platform?.toLowerCase() ||
                   device?.modules?.system?.operating_system?.platform?.toLowerCase() || ''
  const osName = device?.modules?.system?.operating_system?.name?.toLowerCase() || 
                 device?.system?.operating_system?.name?.toLowerCase() || ''
  return platform === 'macos' || platform === 'darwin' || osName.includes('macos') || osName.includes('mac os')
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ device }) => {
  const security = device?.modules?.security || device?.security
  const secureShell = security?.secure_shell
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
  const fileVaultEnabled = security?.file_vault?.enabled === 1 || security?.file_vault?.enabled === true || security?.file_vault?.status === 'On'
  // System Integrity Protection
  const sipEnabled = security?.system_integrity_protection?.enabled === 1 || security?.system_integrity_protection?.enabled === true
  // Gatekeeper
  const gatekeeperEnabled = security?.gatekeeper?.enabled === 1 || security?.gatekeeper?.enabled === true
  // Secure Boot (Mac)
  const macSecureBootEnabled = security?.secure_boot?.secure_boot_enabled === 1 || security?.secure_boot?.secure_boot_enabled === true
  // Firmware Password
  const firmwarePasswordEnabled = security?.firmware_password?.enabled === 1 || security?.firmware_password?.enabled === true
  // SSH (Mac) - note: enabled means it's ON, which could be a security concern
  const macSshEnabled = security?.ssh?.enabled === 1 || security?.ssh?.enabled === true

  // === Windows Security Status ===
  // Windows Hello (snake_case from API)
  const windowsHelloEnabled = security?.windows_hello?.status_display !== 'Disabled' && (
    security?.windows_hello?.credential_providers?.pin_enabled || 
    security?.windows_hello?.credential_providers?.face_recognition_enabled ||
    security?.windows_hello?.credential_providers?.fingerprint_enabled
  )
  // TPM (snake_case from API)
  const tpmActive = security?.tpm?.is_present && security?.tpm?.is_enabled && security?.tpm?.is_activated
  // SSH (Windows) (snake_case from API)
  const sshConfigured = secureShell?.is_configured || secureShell?.is_service_running

  // === Common Security Status ===
  // Firewall - handle both Mac and Windows formats (snake_case from API)
  const firewallEnabled = security?.firewall?.is_enabled || 
                          security?.firewall?.enabled === 1 || 
                          security?.firewall?.enabled === true ||
                          security?.firewall?.global_state === 'on'

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
        {(security?.antivirus?.last_scan || security?.last_security_scan) && (
          <div className="text-right mr-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Scan</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(security?.antivirus?.last_scan || security?.last_security_scan)}
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
              enabled={isMac ? fileVaultEnabled : security?.encryption?.bit_locker?.is_enabled} 
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
                <DetailRow label="Status" value={security?.file_vault?.status || (fileVaultEnabled ? 'Enabled' : 'Disabled')} />
                <DetailRow label="Encrypted Volumes" value={
                  security?.file_vault?.encrypted_volumes?.length > 0 
                    ? security.file_vault.encrypted_volumes.map((v: any) => v.volume_name || v).join(', ')
                    : fileVaultEnabled ? 'System Volume' : 'None'
                } />
              </>
            ) : (
              // Windows BitLocker (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  BitLocker Drive Encryption
                </div>
                {security?.encryption?.bit_locker?.encrypted_drives && security.encryption.bit_locker.encrypted_drives.length > 0 ? (
                  <DetailRow label="Drives" value={security.encryption.bit_locker.encrypted_drives.join(', ')} />
                ) : (
                  <DetailRow label="Drives" value="None encrypted" />
                )}
                <DetailRow label="Method" value={security?.encryption?.bit_locker?.encryption_method || 'XTS-AES'} />
                <DetailRow label="Status" value={security?.encryption?.bit_locker?.status || (security?.encryption?.bit_locker?.is_enabled ? 'Enabled' : 'Disabled')} />
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
                  value={security?.system_integrity_protection?.details?.split('\n')[0] || (sipEnabled ? 'Protected' : 'Disabled')} 
                />
              </>
            ) : (
              // Windows Hello (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Windows Hello
                </div>
                <DetailRow 
                  label="PIN" 
                  isStatus 
                  enabled={security?.windows_hello?.credential_providers?.pin_enabled} 
                />
                <DetailRow 
                  label="Face Recognition" 
                  isStatus 
                  enabled={security?.windows_hello?.credential_providers?.face_recognition_enabled} 
                />
                <DetailRow 
                  label="Fingerprint" 
                  isStatus 
                  enabled={security?.windows_hello?.credential_providers?.fingerprint_enabled} 
                />
                <DetailRow 
                  label="Domain PIN Logon" 
                  isStatus 
                  enabled={security?.windows_hello?.policies?.allow_domain_pin_logon} 
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
            <StatusBadge enabled={isMac ? gatekeeperEnabled : security?.antivirus?.is_enabled} />
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
                  enabled={security?.gatekeeper?.assessments_enabled === 1 || security?.gatekeeper?.assessments_enabled === true} 
                />
                <DetailRow 
                  label="Developer ID" 
                  isStatus 
                  enabled={security?.gatekeeper?.developer_id_enabled === 1 || security?.gatekeeper?.developer_id_enabled === true} 
                />
              </>
            ) : (
              // Windows Antivirus (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {security?.antivirus?.name || 'Windows Defender'}
                </div>
                <DetailRow label="Version" value={security?.antivirus?.version} />
                <DetailRow label="Definitions" value={security?.antivirus?.is_up_to_date ? 'Up to date' : 'Needs update'} />
                <DetailRow label="Last Update" value={formatDate(security?.antivirus?.last_update)} />
                <DetailRow label="Last Scan" value={`${formatDate(security?.antivirus?.last_scan)}${security?.antivirus?.scan_type ? ` (${security.antivirus.scan_type})` : ''}`} />
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
                  value={security?.secure_boot?.security_level || 'Unknown'} 
                />
                <DetailRow label="Firmware Password" isStatus enabled={firmwarePasswordEnabled} />
                <DetailRow 
                  label="Firmware Details" 
                  value={security?.firmware_password?.details?.split('\n')[0] || 'Not configured'} 
                />
              </>
            ) : (
              // Windows TPM (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Trusted Platform Module
                </div>
                <DetailRow label="Present" isStatus enabled={security?.tpm?.is_present} />
                <DetailRow label="Enabled" isStatus enabled={security?.tpm?.is_enabled} />
                <DetailRow label="Activated" isStatus enabled={security?.tpm?.is_activated} />
                <DetailRow label="Version" value={security?.tpm?.version} />
                <DetailRow label="Manufacturer" value={security?.tpm?.manufacturer} />
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
                  value={security?.firewall?.global_state || (firewallEnabled ? 'On' : 'Off')} 
                />
                <DetailRow 
                  label="Stealth Mode" 
                  isStatus 
                  enabled={security?.firewall?.stealth_mode === 1 || security?.firewall?.stealth_mode === true} 
                />
                <DetailRow 
                  label="Logging" 
                  isStatus 
                  enabled={security?.firewall?.logging_enabled === 1 || security?.firewall?.logging_enabled === true} 
                />
                <DetailRow 
                  label="Signed Software" 
                  isStatus 
                  enabled={security?.firewall?.allow_signed_software === 1 || security?.firewall?.allow_signed_software === true} 
                />
              </>
            ) : (
              // Windows Firewall (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Windows Firewall
                </div>
                <DetailRow label="Profile" value={security?.firewall?.profile || 'Domain/Private/Public'} />
                <DetailRow label="Inbound Rules" value={security?.firewall?.inbound_rules?.toString() || 'Active'} />
                <DetailRow label="Outbound Rules" value={security?.firewall?.outbound_rules?.toString() || 'Active'} />
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
                activeLabel={secureShell?.status_display || 'Configured'} 
                inactiveLabel={secureShell?.status_display || 'Not Configured'} 
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
              // Windows OpenSSH (snake_case from API)
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  OpenSSH Server
                </div>
                <DetailRow label="Installed" isStatus enabled={secureShell?.is_installed} />
                <DetailRow label="Service Running" isStatus enabled={secureShell?.is_service_running} />
                <DetailRow label="Firewall Rule" isStatus enabled={secureShell?.is_firewall_rule_present} />
                <DetailRow label="Keys Deployed" isStatus enabled={secureShell?.is_key_deployed} />
                <DetailRow label="Service Status" value={secureShell?.service_status || 'Unknown'} />
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