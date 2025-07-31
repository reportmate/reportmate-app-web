/**
 * Security Widget - Platform-Aware with Simplified Status
 * Displays security information with simple status messages
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  platform?: string
  os?: string
  osName?: string
  security?: any
  securityFeatures?: any
  modules?: {
    security?: any
  }
}

interface SecurityWidgetProps {
  device: Device
}

export const SecurityWidget: React.FC<SecurityWidgetProps> = ({ device }) => {
  // Access security data from device object, prioritizing the modules structure
  const security = device?.modules?.security || device?.security || device?.securityFeatures
  
  // Detect platform for platform-aware display
  const platform = device?.platform?.toLowerCase() || 
                  device?.os?.toLowerCase() || 
                  device?.osName?.toLowerCase() || 
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
    
    const isActive = security.antivirus.isEnabled
    const isUpToDate = security.antivirus.isUpToDate
    
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
    
    if (isWindows && security.encryption.bitLocker) {
      const isEnabled = security.encryption.bitLocker.isEnabled
      const status = security.encryption.bitLocker.status || (isEnabled ? 'Enabled' : 'Disabled')
      return {
        status: status,
        details: status
      }
    } else if (isMacOS && security.encryption.fileVault) {
      const fileVault = security.encryption.fileVault
      return {
        status: fileVault.isEnabled ? 'Enabled' : 'Disabled',
        details: fileVault.isEnabled ? 'Enabled' : 'Disabled'
      }
    } else if (isLinux && security.encryption.luks) {
      const luks = security.encryption.luks
      return {
        status: luks.isEnabled ? 'Enabled' : 'Disabled',
        details: luks.isEnabled ? 'Enabled' : 'Disabled'
      }
    }
    
    return { status: 'Unknown', details: 'Unknown' }
  }

  const getTPMDetails = () => {
    if (!isWindows || !security?.tpm) return null
    
    const isPresent = security.tpm.isPresent
    const isEnabled = security.tpm.isEnabled
    const isActivated = security.tpm.isActivated
    
    const isActive = isPresent && isEnabled && isActivated
    
    return {
      status: isActive ? 'Enabled' : 'Disabled',
      details: isActive ? 'Enabled' : 'Disabled'
    }
  }

  const getFirewallDetails = () => {
    if (!security?.firewall) return { status: 'Unknown', details: 'Unknown' }
    
    const isEnabled = security.firewall.isEnabled
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
  const tpmInfo = getTPMDetails()
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
            status={security.antivirus?.statusDisplay || antivirusInfo.status}
            type={getStatusType(security.antivirus?.isEnabled, antivirusInfo.status)}
          />
          {security.antivirus && (
            <div className="ml-4 mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="text-gray-900 dark:text-white">
                {security.antivirus.name || 'Unknown Antivirus'}
              </div>
              {security.antivirus.version && (
                <div>Version: {security.antivirus.version}</div>
              )}
              {security.antivirus.lastUpdate && (
                <div>Updated: {formatDate(security.antivirus.lastUpdate)}</div>
              )}
              {security.antivirus.lastScan && (
                <div>
                  Last Scan: {formatDate(security.antivirus.lastScan)}
                  {security.antivirus.scanType && ` (${security.antivirus.scanType})`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Firewall Protection */}
        <StatusBadge
          label="Firewall"
          status={security.firewall?.statusDisplay || firewallInfo.status}
          type={getStatusType(security.firewall?.isEnabled, firewallInfo.status)}
        />

        {/* Disk Encryption */}
        <StatusBadge
          label={isWindows ? "BitLocker" : isMacOS ? "FileVault" : "Encryption"}
          status={security.encryption?.statusDisplay || encryptionInfo.status}
          type={getStatusType(
            isWindows ? security.encryption?.bitLocker?.isEnabled :
            isMacOS ? security.encryption?.fileVault?.isEnabled :
            isLinux ? security.encryption?.luks?.isEnabled :
            false,
            encryptionInfo.status
          )}
        />

        {/* Windows Hello Authentication (Windows only) */}
        {isWindows && security?.windowsHello && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Windows Hello</div>
            <div className="ml-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">PIN Status:</span>
                <StatusBadge
                  label=""
                  status={security.windowsHello.credentialProviders?.pinEnabled ? 'Enabled' : 'Disabled'}
                  type={getStatusType(security.windowsHello.credentialProviders?.pinEnabled)}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Biometric Status:</span>
                <StatusBadge
                  label=""
                  status={(security.windowsHello.credentialProviders?.faceRecognitionEnabled || 
                           security.windowsHello.credentialProviders?.fingerprintEnabled) ? 'Enabled' : 'Disabled'}
                  type={getStatusType(
                    security.windowsHello.credentialProviders?.faceRecognitionEnabled || 
                    security.windowsHello.credentialProviders?.fingerprintEnabled
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
