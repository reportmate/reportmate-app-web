/**
 * Security Widget - Platform-Aware with Simplified Status
 * Displays security information with simple status messages
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

import React from 'react'
import { StatBlock, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  platform?: string
  os?: string
  osName?: string
  // Modular security data - snake_case from API
  modules?: {
    security?: {
      tpm?: {
        version?: string
        is_enabled?: boolean
        is_present?: boolean
        is_activated?: boolean
        manufacturer?: string
        status_display?: string
      }
      firewall?: {
        rules?: any[]
        profile?: string
        is_enabled?: boolean
        status_display?: string
      }
      antivirus?: {
        name?: string
        version?: string
        last_scan?: string
        scan_type?: string
        is_enabled?: boolean
        last_update?: string
        is_up_to_date?: boolean
        status_display?: string
      }
      encryption?: {
        bit_locker?: {
          status?: string
          is_enabled?: boolean
          status_display?: string
          recovery_key_id?: string
          encrypted_drives?: string[]
        }
        file_vault?: {
          is_enabled?: boolean
          status_display?: string
        }
        luks?: {
          is_enabled?: boolean
          status_display?: string
        }
        status_display?: string
        device_encryption?: boolean
        encrypted_volumes?: Array<{
          status?: string
          drive_letter?: string
          encryption_method?: string
          encryption_percentage?: number
        }>
      }
      secure_shell?: {
        is_installed?: boolean
        config_status?: string
        is_configured?: boolean
        service_status?: string
        status_display?: string
        is_key_deployed?: boolean
        is_service_running?: boolean
        are_permissions_correct?: boolean
        is_firewall_rule_present?: boolean
      }
      windows_hello?: {
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
        hello_events?: any[]
      }
      collected_at?: string
      device_id?: string
      module_id?: string
    }
  }
}

interface SecurityWidgetProps {
  device: Device
}

export const SecurityWidget: React.FC<SecurityWidgetProps> = ({ device }) => {
  // Access security data from modules - snake_case from API
  const security = device?.modules?.security
  
  console.log('SecurityWidget DEBUG:', {
    deviceName: device?.name,
    hasModules: !!device?.modules,
    hasModulesSecurity: !!security,
    securityKeys: security ? Object.keys(security) : []
  })
  
  // Detect platform for platform-aware display
  const platform = device?.platform?.toLowerCase() || 
                  device?.os?.toLowerCase() || 
                  'windows'
  
  const isWindows = platform.includes('windows')
  const isMacOS = platform.includes('mac') || platform.includes('darwin')
  const isLinux = platform.includes('linux')

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const getStatusType = (enabled?: boolean, status?: string): 'success' | 'error' | 'warning' => {
    if (enabled === true || status === 'Enabled' || status === 'Current' || status === 'Protected' || status === 'Active') {
      return 'success'
    } else if (enabled === false || status === 'Disabled' || status === 'Not Protected' || status === 'Inactive') {
      return 'error'
    } else {
      return 'warning'
    }
  }

  const getAntivirusDetails = () => {
    if (!security?.antivirus) return { status: 'Unknown', details: 'Unknown' }
    
    const isActive = security.antivirus.is_enabled
    const isUpToDate = security.antivirus.is_up_to_date
    
    if (isActive && isUpToDate) {
      return { status: 'Current', details: 'Current' }
    } else if (isActive && !isUpToDate) {
      return { status: 'Enabled', details: 'Enabled' }
    } else {
      return { status: 'Disabled', details: 'Disabled' }
    }
  }

  const getEncryptionDetails = () => {
    if (!security?.encryption) return { status: 'Unknown', details: 'Unknown' }
    
    if (isWindows && security.encryption.bit_locker) {
      const isEnabled = security.encryption.bit_locker.is_enabled
      const status = security.encryption.bit_locker.status || (isEnabled ? 'Enabled' : 'Disabled')
      return {
        status: status,
        details: status
      }
    } else if (isMacOS && security.encryption.file_vault) {
      const fileVault = security.encryption.file_vault
      return {
        status: fileVault.is_enabled ? 'Enabled' : 'Disabled',
        details: fileVault.is_enabled ? 'Enabled' : 'Disabled'
      }
    } else if (isLinux && security.encryption.luks) {
      const luks = security.encryption.luks
      return {
        status: luks.is_enabled ? 'Enabled' : 'Disabled',
        details: luks.is_enabled ? 'Enabled' : 'Disabled'
      }
    }
    
    return { status: 'Unknown', details: 'Unknown' }
  }

  const getFirewallDetails = () => {
    if (!security?.firewall) return { status: 'Unknown', details: 'Unknown' }
    
    const isEnabled = security.firewall.is_enabled
    const profile = security.firewall.profile || 'Not specified'
    
    return {
      status: isEnabled ? 'Enabled' : 'Disabled',
      details: isEnabled ? 'Enabled' : 'Disabled',
      profile: profile
    }
  }

  if (!security) {
    return (
      <StatBlock 
        title="Security" 
        subtitle="Protection status"
        icon={Icons.security}
        iconColor={WidgetColors.red}
      >
        <EmptyState message="Security information not available" />
      </StatBlock>
    )
  }

  const antivirusInfo = getAntivirusDetails()
  const encryptionInfo = getEncryptionDetails()
  const firewallInfo = getFirewallDetails()

  return (
    <StatBlock 
      title="Security" 
      subtitle={`${isWindows ? 'Windows' : isMacOS ? 'macOS' : isLinux ? 'Linux' : 'Device'} protection status`}
      icon={Icons.security}
      iconColor={WidgetColors.red}
    >
      <div className="space-y-4">
        {/* Antivirus Protection */}
        <div>
          <StatusBadge
            label="Antivirus"
            status={security.antivirus?.status_display || antivirusInfo.status}
            type={getStatusType(security.antivirus?.is_enabled, antivirusInfo.status)}
          />
          {security.antivirus && (
            <div className="ml-4 mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="text-gray-900 dark:text-white">
                {security.antivirus.name || 'Unknown Antivirus'}
              </div>
              {security.antivirus.version && (
                <div>Version: {security.antivirus.version}</div>
              )}
              {security.antivirus.last_update && (
                <div>Updated: {formatDate(security.antivirus.last_update)}</div>
              )}
              {security.antivirus.last_scan && (
                <div>
                  Last Scan: {formatDate(security.antivirus.last_scan)}
                  {security.antivirus.scan_type && ` (${security.antivirus.scan_type})`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Firewall Protection */}
        <StatusBadge
          label="Firewall"
          status={security.firewall?.status_display || firewallInfo.status}
          type={getStatusType(security.firewall?.is_enabled, firewallInfo.status)}
        />

        {/* Disk Encryption */}
        <StatusBadge
          label={isWindows ? "BitLocker" : isMacOS ? "FileVault" : "Encryption"}
          status={security.encryption?.status_display || encryptionInfo.status}
          type={getStatusType(
            isWindows ? security.encryption?.bit_locker?.is_enabled :
            isMacOS ? security.encryption?.file_vault?.is_enabled :
            isLinux ? security.encryption?.luks?.is_enabled :
            false,
            encryptionInfo.status
          )}
        />

        {/* TPM Status (Windows only) */}
        {isWindows && security?.tpm && (
          <StatusBadge
            label="TPM"
            status={security.tpm.is_enabled ? 'Enabled' : 'Disabled'}
            type={getStatusType(security.tpm.is_enabled)}
          />
        )}

        {/* Windows Hello Authentication (Windows only) */}
        {isWindows && security?.windows_hello && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Windows Hello</div>
            <div className="ml-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Biometric:</span>
                <StatusBadge
                  label=""
                  status={security.windows_hello.policies?.biometric_logon_enabled ? 'Enabled' : 'Disabled'}
                  type={getStatusType(security.windows_hello.policies?.biometric_logon_enabled)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Secure Shell Status */}
        {security?.secure_shell && (
          <StatusBadge
            label="SSH"
            status={security.secure_shell.status_display || (security.secure_shell.is_service_running ? 'Running' : 'Stopped')}
            type={getStatusType(security.secure_shell.is_service_running)}
          />
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
