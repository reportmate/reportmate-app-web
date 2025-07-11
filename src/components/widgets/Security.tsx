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
}

export const SecurityWidget: React.FC<SecurityWidgetProps> = ({ platform, securityFeatures }) => {
  const isWindows = platform?.toLowerCase().includes('windows')
  const isMac = platform?.toLowerCase().includes('mac')

  const getStatusType = (enabled?: boolean, status?: string): 'success' | 'error' | 'warning' => {
    if (enabled === true || status === 'Enabled' || status === 'Up to date') {
      return 'success'
    } else if (enabled === false || status === 'Disabled') {
      return 'error'
    } else {
      return 'warning'
    }
  }

  if (!securityFeatures || Object.keys(securityFeatures).length === 0) {
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
            {securityFeatures.bitlocker && renderSecurityItem('BitLocker', securityFeatures.bitlocker)}
            {securityFeatures.windowsDefender && renderSecurityItem('Windows Defender', securityFeatures.windowsDefender)}
            {securityFeatures.uac && renderSecurityItem('UAC', securityFeatures.uac)}
            {securityFeatures.tpm && (
              <StatusBadge
                label="TPM"
                status={`${securityFeatures.tpm.status || 'Unknown'}${securityFeatures.tpm.version ? ` (${securityFeatures.tpm.version})` : ''}`}
                type={getStatusType(securityFeatures.tpm.enabled, securityFeatures.tpm.status)}
              />
            )}
            {securityFeatures.windowsUpdates && renderSecurityItem('Windows Updates', securityFeatures.windowsUpdates)}
            {securityFeatures.firewall && renderSecurityItem('Windows Firewall', securityFeatures.firewall)}
          </>
        ) : isMac ? (
          <>
            {securityFeatures.filevault && renderSecurityItem('FileVault', securityFeatures.filevault)}
            {securityFeatures.gatekeeper && renderSecurityItem('Gatekeeper', securityFeatures.gatekeeper)}
            {securityFeatures.sip && renderSecurityItem('SIP', securityFeatures.sip)}
            {securityFeatures.xprotect && renderSecurityItem('XProtect', securityFeatures.xprotect)}
            {securityFeatures.firewall && renderSecurityItem('macOS Firewall', securityFeatures.firewall)}
          </>
        ) : (
          <>
            {Object.entries(securityFeatures).filter(([key]) => key !== 'edr').map(([feature, info]) => {
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
        
        {securityFeatures.edr && (
          <StatusBadge
            label="EDR"
            status={securityFeatures.edr.installed 
              ? `${securityFeatures.edr.name} (${securityFeatures.edr.status})`
              : 'Not Installed'
            }
            type={securityFeatures.edr.installed ? 'success' : 'error'}
          />
        )}
      </div>
    </StatBlock>
  )
}

export default SecurityWidget
