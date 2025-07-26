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
      return {
        status: isEnabled ? 'Enabled' : 'Disabled',
        details: isEnabled ? 'Enabled' : 'Disabled'
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
    
    return {
      status: isEnabled ? 'Enabled' : 'Disabled',
      details: isEnabled ? 'Enabled' : 'Disabled'
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
        <StatusBadge
          label="Antivirus"
          status={security.antivirus?.statusDisplay || antivirusInfo.status}
          type={getStatusType(security.antivirus?.isEnabled, antivirusInfo.status)}
        />

        {/* Firewall Protection */}
        <StatusBadge
          label="Firewall"
          status={security.firewall?.statusDisplay || firewallInfo.status}
          type={getStatusType(security.firewall?.isEnabled, firewallInfo.status)}
        />

        {/* Disk Encryption */}
        <StatusBadge
          label="Encryption"
          status={security.encryption?.statusDisplay || encryptionInfo.status}
          type={getStatusType(
            isWindows ? security.encryption?.bitLocker?.isEnabled :
            isMacOS ? security.encryption?.fileVault?.isEnabled :
            isLinux ? security.encryption?.luks?.isEnabled :
            false,
            encryptionInfo.status
          )}
        />

        {/* TPM Security (Windows only) */}
        {tpmInfo && (
          <StatusBadge
            label="Tamper Protection"
            status={security.tpm?.statusDisplay || tpmInfo.status}
            type={getStatusType(security.tpm?.isPresent && security.tpm?.isEnabled && security.tpm?.isActivated, tpmInfo.status)}
          />
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
