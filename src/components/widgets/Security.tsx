/**
 * Security Widget - Platform-Aware with Simplified Status
 * Displays security information with simple status messages
 */

import React from 'react'
import { StatBlock, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'
import { convertPowerShellObjects, normalizeKeys } from '../../lib/utils/powershell-parser'

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
  const rawSecurity = device?.modules?.security || device?.security || device?.securityFeatures
  
  // Parse PowerShell objects and normalize keys to camelCase
  const parsedSecurity = convertPowerShellObjects(rawSecurity)
  const security = parsedSecurity ? normalizeKeys(parsedSecurity) as any : null
  
  // Detect platform for platform-aware display - check multiple locations
  const operatingSystem = device?.modules?.system?.operatingSystem || device?.modules?.system?.operating_system
  const platform = device?.platform?.toLowerCase() || 
                  device?.modules?.metadata?.platform?.toLowerCase() ||
                  device?.metadata?.platform?.toLowerCase() ||
                  operatingSystem?.platform?.toLowerCase() ||
                  operatingSystem?.name?.toLowerCase() ||
                  device?.os?.toLowerCase() || 
                  device?.osName?.toLowerCase() || 
                  ''
  
  const isWindows = platform.includes('windows')
  const isMacOS = platform.includes('mac') || platform.includes('darwin')
  const isLinux = platform.includes('linux')
  
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
    if (isMacOS) {
      // Mac uses top-level fileVault field (not nested in encryption)
      const fileVault = security?.fileVault
      if (fileVault) {
        const isEnabled = fileVault.enabled === true || fileVault.enabled === 1 || fileVault.status?.toLowerCase() === 'on'
        return {
          status: fileVault.status || (isEnabled ? 'Enabled' : 'Disabled'),
          details: fileVault.status || (isEnabled ? 'Enabled' : 'Disabled')
        }
      }
    } else if (isWindows && security?.encryption?.bitLocker) {
      const isEnabled = security.encryption.bitLocker.isEnabled
      const status = security.encryption.bitLocker.status || (isEnabled ? 'Enabled' : 'Disabled')
      return {
        status: status,
        details: status
      }
    } else if (isLinux && security?.encryption?.luks) {
      const luks = security.encryption.luks
      return {
        status: luks.isEnabled ? 'Enabled' : 'Disabled',
        details: luks.isEnabled ? 'Enabled' : 'Disabled'
      }
    }
    
    return { status: 'Unknown', details: 'Unknown' }
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
  const firewallInfo = getFirewallDetails()

  return (
    <StatBlock 
      title="Security" 
      subtitle={`${isWindows ? 'Windows' : isMacOS ? 'macOS' : isLinux ? 'Linux' : 'Device'} protection status`}
      icon={Icons.security}
      iconColor={WidgetColors.red}
    >
      <div className="space-y-4">
        {isMacOS ? (
          // macOS Security Display
          <>
            {/* FileVault Encryption */}
            <StatusBadge
              label="FileVault"
              status={encryptionInfo.status}
              type={getStatusType(
                security?.fileVault?.enabled === true || security?.fileVault?.enabled === 1,
                encryptionInfo.status
              )}
            />
            
            {/* Bootstrap Token (under FileVault) */}
            {security?.bootstrapToken !== undefined && (
              <div className="ml-4">
                <StatusBadge
                  label="Bootstrap Token"
                  status={security.bootstrapToken.escrowed ? 'Escrowed' : 'Not Escrowed'}
                  type={security.bootstrapToken.escrowed ? 'success' : 'error'}
                />
              </div>
            )}
            
            {/* Personal Recovery Key (under FileVault) */}
            {security?.fileVault?.recoveryKeyEscrowed !== undefined && (
              <div className="ml-4">
                <StatusBadge
                  label="Personal Recovery Key"
                  status={security.fileVault.recoveryKeyEscrowed ? 'Escrowed' : 'Not Escrowed'}
                  type={security.fileVault.recoveryKeyEscrowed ? 'success' : 'error'}
                />
              </div>
            )}

            {/* Platform SSO - at the bottom, formatted like Windows Hello */}
            {security?.platformSSO && (
              <div className="space-y-2 mt-3">
                <StatusBadge
                  label="Platform SSO"
                  status={(security.platformSSO.registered === true || security.platformSSO.registered === 1) ? 'Registered' : 'Not Registered'}
                  type={getStatusType(security.platformSSO.registered === true || security.platformSSO.registered === 1)}
                />
                <div className="ml-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Token:</span>
                    <StatusBadge
                      label=""
                      status={security.platformSSO.users?.[0]?.tokensPresent === true || security.platformSSO.users?.[0]?.tokensPresent === 1 ? 'Present' : 'Missing'}
                      type={getStatusType(security.platformSSO.users?.[0]?.tokensPresent === true || security.platformSSO.users?.[0]?.tokensPresent === 1)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Method:</span>
                    <span className="text-gray-900 dark:text-white">{security.platformSSO.method || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gatekeeper (Protection) */}
            {security?.gatekeeper && (
              <StatusBadge
                label="Gatekeeper"
                status={security.gatekeeper.enabled ? 'Enabled' : 'Disabled'}
                type={security.gatekeeper.enabled ? 'success' : 'error'}
              />
            )}

            {/* System Integrity Protection (Full Name) */}
            {security?.systemIntegrityProtection && (
              <StatusBadge
                label="System Integrity Protection"
                status={security.systemIntegrityProtection.enabled ? 'Enabled' : 'Disabled'}
                type={security.systemIntegrityProtection.enabled ? 'success' : 'error'}
              />
            )}
            
            {/* Activation Lock - Disabled is good (green), Enabled is problematic (red) */}
            {security?.activationLock !== undefined && (
              <StatusBadge
                label="Activation Lock"
                status={security.activationLock?.enabled ? 'Enabled' : 'Disabled'}
                type={security.activationLock?.enabled ? 'error' : 'success'}
              />
            )}

            {/* Firewall */}
            <StatusBadge
              label="Firewall"
              status={firewallInfo.status}
              type="info"
            />
            
            {/* Screen Sharing (Remote Management) */}
            {remoteManagement?.screenSharing !== undefined && (
              <StatusBadge
                label="Screen Sharing"
                status={remoteManagement.screenSharing ? 'Enabled' : 'Disabled'}
                type={remoteManagement.screenSharing ? 'warning' : 'success'}
              />
            )}
          </>
        ) : (
          // Windows/Linux Security Display
          <>
            {/* Antivirus Protection */}
            <div>
              <StatusBadge
                label="Antivirus"
                status={security?.antivirus?.statusDisplay || antivirusInfo.status}
                type={getStatusType(security?.antivirus?.isEnabled, antivirusInfo.status)}
              />
              {security?.antivirus && (
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

            {/* Disk Encryption */}
            <StatusBadge
              label={isWindows ? "BitLocker" : "Encryption"}
              status={security?.encryption?.statusDisplay || encryptionInfo.status}
              type={getStatusType(
                isWindows ? security?.encryption?.bitLocker?.isEnabled :
                isLinux ? security?.encryption?.luks?.isEnabled :
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

            {/* Firewall Protection */}
            <StatusBadge
              label="Firewall"
              status={security?.firewall?.statusDisplay || firewallInfo.status}
              type="info"
            />
          </>
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
