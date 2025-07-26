/**
 * Enhanced Security Widget
 * Displays comprehensive security status including encryption, TPM, antivirus, firewall, and updates
 */

import React from 'react'
import { StatBlock, Stat, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

// Based on actual API response structure from your sample data
interface SecurityData {
  moduleId?: string
  deviceId?: string
  collectedAt?: string
  lastSecurityScan?: string
  tpm?: {
    version?: string
    isEnabled?: boolean
    isPresent?: boolean
    isActivated?: boolean
    manufacturer?: string
  }
  firewall?: {
    rules?: any[]
    profile?: string
    isEnabled?: boolean
  }
  antivirus?: {
    name?: string
    version?: string
    lastScan?: string
    scanType?: string
    isEnabled?: boolean
    isUpToDate?: boolean
    lastUpdate?: string
  }
  encryption?: {
    bitLocker?: {
      status?: string
      isEnabled?: boolean
      recoveryKeyId?: string
      encryptedDrives?: string[]
    }
    deviceEncryption?: boolean
    encryptedVolumes?: Array<{
      status?: string
      driveLetter?: string
      encryptionMethod?: string
      encryptionPercentage?: number
    }>
  }
  securityEvents?: any[]
  securityUpdates?: Array<{
    id?: string
    title?: string
    status?: string
    severity?: string
    installDate?: string
  }>
}

interface Device {
  id: string
  name: string
  platform?: string
  security?: SecurityData
  securityFeatures?: SecurityData
  // Modular security data - this is the correct structure
  modules?: {
    security?: SecurityData
  }
}

interface SecurityWidgetProps {
  device: Device
}

export const SecurityWidget: React.FC<SecurityWidgetProps> = ({ device }) => {
  // Access security data from device object, prioritizing the modules structure
  const actualPlatform = device?.platform
  const actualSecurityData = device?.modules?.security || device?.security || device?.securityFeatures
  
  const isWindows = actualPlatform?.toLowerCase().includes('windows')
  const isMac = actualPlatform?.toLowerCase().includes('mac')

  const getStatusType = (enabled?: boolean, status?: string): 'success' | 'error' | 'warning' => {
    if (enabled === true || status === 'Enabled' || status === 'Up to date' || status === 'Protected' || status === 'Active') {
      return 'success'
    } else if (enabled === false || status === 'Disabled' || status === 'Not Protected' || status === 'Inactive') {
      return 'error'
    } else {
      return 'warning'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getTPMStatusText = (tpm?: SecurityData['tpm']) => {
    if (!tpm) return 'Not Available'
    if (tpm.isPresent && tpm.isEnabled && tpm.isActivated) {
      return `Ready (v${tpm.version || 'Unknown'})`
    } else if (tpm.isPresent) {
      return 'Present but not activated'
    }
    return 'Not Present'
  }

  if (!actualSecurityData) {
    return (
      <StatBlock 
        title="Security" 
        subtitle="Protection and compliance status"
        icon={Icons.security}
        iconColor={WidgetColors.red}
      >
        <EmptyState message="Security information not available" />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="Security" 
      subtitle="Protection and compliance status"
      icon={Icons.security}
      iconColor={WidgetColors.red}
    >
      <div className="space-y-4">
        {/* Antivirus Protection */}
        {actualSecurityData.antivirus && (
          <>
            <StatusBadge
              label="Antivirus"
              status={actualSecurityData.antivirus.isEnabled ? 
                `${actualSecurityData.antivirus.name || 'Unknown'} (Active)` : 
                'Disabled'
              }
              type={getStatusType(actualSecurityData.antivirus.isEnabled)}
            />
            
            {actualSecurityData.antivirus.isEnabled && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Stat 
                  label="Version" 
                  value={actualSecurityData.antivirus.version || 'Unknown'} 
                  isMono 
                />
                <Stat 
                  label="Last Scan" 
                  value={actualSecurityData.antivirus.lastScan ? 
                    formatDate(actualSecurityData.antivirus.lastScan) : 'Unknown'
                  }
                />
                <Stat 
                  label="Scan Type" 
                  value={actualSecurityData.antivirus.scanType || 'Unknown'} 
                />
                <Stat 
                  label="Signatures" 
                  value={actualSecurityData.antivirus.isUpToDate ? 'Up to date' : 'Outdated'} 
                />
              </div>
            )}
          </>
        )}

        {/* Firewall Protection */}
        {actualSecurityData.firewall && (
          <StatusBadge
            label="Windows Firewall"
            status={actualSecurityData.firewall.isEnabled ? 
              `Enabled${actualSecurityData.firewall.profile ? ` (${actualSecurityData.firewall.profile})` : ''}` : 
              'Disabled'
            }
            type={getStatusType(actualSecurityData.firewall.isEnabled)}
          />
        )}

        {/* Disk Encryption */}
        {actualSecurityData.encryption?.bitLocker && (
          <>
            <StatusBadge
              label="BitLocker Encryption"
              status={actualSecurityData.encryption.bitLocker.isEnabled ? 
                `Enabled (${actualSecurityData.encryption.bitLocker.encryptedDrives?.length || 0} drives)` : 
                'Disabled'
              }
              type={getStatusType(actualSecurityData.encryption.bitLocker.isEnabled)}
            />
            
            {actualSecurityData.encryption.bitLocker.isEnabled && actualSecurityData.encryption.bitLocker.encryptedDrives && (
              <div className="mt-2">
                <Stat 
                  label="Encrypted Drives" 
                  value={actualSecurityData.encryption.bitLocker.encryptedDrives.join(', ')} 
                  isMono 
                />
              </div>
            )}
          </>
        )}

        {/* TPM Status */}
        {actualSecurityData.tpm && (
          <StatusBadge
            label="TPM (Trusted Platform Module)"
            status={getTPMStatusText(actualSecurityData.tpm)}
            type={actualSecurityData.tpm.isPresent && actualSecurityData.tpm.isEnabled ? 'success' : 'warning'}
          />
        )}

        {/* Security Updates */}
        {actualSecurityData.securityUpdates && actualSecurityData.securityUpdates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Security Updates
            </div>
            <Stat 
              label="Pending Updates" 
              value={`${actualSecurityData.securityUpdates.length} updates available`} 
            />
          </div>
        )}

        {/* Encrypted Volumes Details */}
        {actualSecurityData.encryption?.encryptedVolumes && actualSecurityData.encryption.encryptedVolumes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Volume Encryption Details
            </div>
            <div className="space-y-2">
              {actualSecurityData.encryption.encryptedVolumes.slice(0, 3).map((volume, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Drive {volume.driveLetter}:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {volume.encryptionPercentage === 100 ? 'Fully Encrypted' : 
                     volume.encryptionPercentage ? `${volume.encryptionPercentage}% Encrypted` : 
                     volume.status || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Security Scan */}
        {actualSecurityData.lastSecurityScan && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Stat 
              label="Last Security Scan" 
              value={formatDate(actualSecurityData.lastSecurityScan)} 
            />
          </div>
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
