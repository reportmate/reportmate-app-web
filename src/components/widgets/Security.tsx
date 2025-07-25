import React from 'react'
import { StatBlock, StatusBadge, EmptyState, Icons, WidgetColors } from './shared'

interface SecurityFeatures {
  // Mac-specific
  filevault?: { enabled: boolean; status: string }
  firewall?: { enabled: boolean; status: string }
  gatekeeper?: { enabled: boolean; status: string }
  sip?: { enabled: boolean; status: string }
  xprotect?: { enabled: boolean; status: string }
  automaticUpdates?: { enabled: boolean; status: string }
  // Windows-specific
  bitlocker?: { enabled: boolean; status: string }
  windowsDefender?: { enabled: boolean; status: string }
  uac?: { enabled: boolean; status: string }
  windowsUpdates?: { enabled: boolean; status: string }
  smartScreen?: { enabled: boolean; status: string }
  tpm?: { enabled: boolean; status: string; version?: string }
  // Cross-platform
  edr?: { installed: boolean; name: string | null; status: string; version: string | null }
}

interface SecurityWidgetProps {
  platform?: string
  securityFeatures?: SecurityFeatures
  // Support for device object with security data
  device?: {
    platform?: string
    security?: SecurityFeatures
    securityFeatures?: SecurityFeatures
  }
}

export const SecurityWidget: React.FC<SecurityWidgetProps> = ({ platform, securityFeatures, device }) => {
  // Access security data from props or device object
  const actualPlatform = platform || device?.platform
  const actualSecurityFeatures = securityFeatures || device?.securityFeatures || device?.security
  
  const isWindows = actualPlatform?.toLowerCase().includes('windows')
  const isMac = actualPlatform?.toLowerCase().includes('mac')

  const getStatusType = (enabled?: boolean, status?: string): 'success' | 'error' | 'warning' => {
    if (enabled === true || status === 'Enabled' || status === 'Up to date') {
      return 'success'
    } else if (enabled === false || status === 'Disabled') {
      return 'error'
    } else {
      return 'warning'
    }
  }

  if (!actualSecurityFeatures || Object.keys(actualSecurityFeatures).length === 0) {
    return (
      <StatBlock 
        title="Security" 
        subtitle="Security settings and status"
        icon={Icons.security}
        iconColor={WidgetColors.red}
      >
        <EmptyState message="Security information not available" />
      </StatBlock>
    )
  }

  const renderSecurityItem = (label: string, info: any) => (
    <StatusBadge
      key={label}
      label={label}
      status={info?.status || 'Unknown'}
      type={getStatusType(info?.enabled, info?.status)}
    />
  )

  return (
    <StatBlock 
      title="Security" 
      subtitle="Security settings and status"
      icon={Icons.security}
      iconColor={WidgetColors.red}
    >
      <div className="space-y-4">
        {isWindows ? (
          <>
            {actualSecurityFeatures.bitlocker && renderSecurityItem('BitLocker', actualSecurityFeatures.bitlocker)}
            {actualSecurityFeatures.windowsDefender && renderSecurityItem('Windows Defender', actualSecurityFeatures.windowsDefender)}
            {actualSecurityFeatures.uac && renderSecurityItem('UAC', actualSecurityFeatures.uac)}
            {actualSecurityFeatures.tpm && (
              <StatusBadge
                label="TPM"
                status={`${actualSecurityFeatures.tpm.status || 'Unknown'}${actualSecurityFeatures.tpm.version ? ` (${actualSecurityFeatures.tpm.version})` : ''}`}
                type={getStatusType(actualSecurityFeatures.tpm.enabled, actualSecurityFeatures.tpm.status)}
              />
            )}
            {actualSecurityFeatures.windowsUpdates && renderSecurityItem('Windows Updates', actualSecurityFeatures.windowsUpdates)}
            {actualSecurityFeatures.firewall && renderSecurityItem('Windows Firewall', actualSecurityFeatures.firewall)}
          </>
        ) : isMac ? (
          <>
            {actualSecurityFeatures.filevault && renderSecurityItem('FileVault', actualSecurityFeatures.filevault)}
            {actualSecurityFeatures.gatekeeper && renderSecurityItem('Gatekeeper', actualSecurityFeatures.gatekeeper)}
            {actualSecurityFeatures.sip && renderSecurityItem('SIP', actualSecurityFeatures.sip)}
            {actualSecurityFeatures.xprotect && renderSecurityItem('XProtect', actualSecurityFeatures.xprotect)}
            {actualSecurityFeatures.firewall && renderSecurityItem('macOS Firewall', actualSecurityFeatures.firewall)}
          </>
        ) : (
          <>
            {Object.entries(actualSecurityFeatures).filter(([key]) => key !== 'edr').map(([feature, info]) => {
              const enabled = (info && typeof info === 'object' && 'enabled' in info && info.enabled) || 
                            (info && typeof info === 'object' && 'installed' in info && info.installed)
              const status = (info && typeof info === 'object' && 'status' in info && info.status?.toString()) || 
                           (info && typeof info === 'object' && 'installed' in info && !info.installed && 'Not Installed') ||
                           'Unknown'
              return (
                <StatusBadge
                  key={feature}
                  label={feature.charAt(0).toUpperCase() + feature.slice(1)}
                  status={status}
                  type={enabled ? 'success' : 'error'}
                />
              )
            })}
          </>
        )}
        
        {actualSecurityFeatures.edr && (
          <StatusBadge
            label="EDR"
            status={actualSecurityFeatures.edr.installed 
              ? `${actualSecurityFeatures.edr.name} (${actualSecurityFeatures.edr.status})`
              : 'Not Installed'
            }
            type={actualSecurityFeatures.edr.installed ? 'success' : 'error'}
          />
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
