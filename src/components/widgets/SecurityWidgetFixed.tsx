import React from 'react'
import { StatBlock, Stat, StatusBadge, Icons, WidgetColors } from './shared'

const SecurityWidget = ({ device }: { device: any }) => {
  const security = device?.modules?.security

  if (!security) {
    return (
      <StatBlock 
        title="Security" 
        icon={Icons.security}
        iconColor={WidgetColors.red}
      >
        <StatusBadge 
          label="Disk Encryption" 
          status="Unknown" 
          type="error" 
        />
        <StatusBadge 
          label="File Encryption" 
          status="EFS Available" 
          type="info" 
        />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="Security"
      icon={Icons.security}
      iconColor={WidgetColors.red}
    >
      <StatusBadge
        label="Disk Encryption"
        status={security.encryption?.bitlocker?.enabled ? 'Enabled' : 'Disabled'}
        type={security.encryption?.bitlocker?.enabled ? 'success' : 'error'}
      />

      {security.encryption?.bitlocker?.drives && security.encryption.bitlocker.drives.length > 0 && (
        <div className="ml-4 mt-2 space-y-1">
          {security.encryption.bitlocker.drives.map((drive: any, index: number) => (
            <Stat 
              key={index}
              label={`Drive ${drive.letter}`}
              value={drive.status}
            />
          ))}
        </div>
      )}

      <StatusBadge
        label="TPM"
        status={security.tpm?.enabled ? 'Enabled' : 'Disabled'}
        type={security.tpm?.enabled ? 'success' : 'error'}
      />

      {security.tpm?.version && (
        <div className="ml-4 mt-1">
          <Stat
            label="TPM Version"
            value={`${security.tpm.version}${security.tpm.manufacturer ? ` (${security.tpm.manufacturer})` : ''}`}
          />
        </div>
      )}

      <StatusBadge
        label="Antivirus"
        status={security.antivirus?.enabled ? 'Active' : 'Inactive'}
        type={security.antivirus?.enabled ? 'success' : 'error'}
      />

      {security.antivirus?.product_name && (
        <div className="ml-4 mt-1 space-y-1">
          <Stat
            label="Antivirus Product"
            value={security.antivirus.product_name}
            sublabel={security.antivirus.version ? `Version: ${security.antivirus.version}` : undefined}
          />
          {security.antivirus.last_scan && (
            <Stat
              label="Last Scan"
              value={new Date(security.antivirus.last_scan).toLocaleDateString()}
            />
          )}
        </div>
      )}

      <StatusBadge
        label="Windows Firewall"
        status={security.firewall?.enabled ? 'Enabled' : 'Disabled'}
        type={security.firewall?.enabled ? 'success' : 'error'}
      />

      {security.firewall?.profiles && Object.keys(security.firewall.profiles).length > 0 && (
        <div className="ml-4 mt-2 space-y-1">
          {Object.entries(security.firewall.profiles).map(([profile, enabled]) => (
            <Stat 
              key={profile}
              label={`${profile.charAt(0).toUpperCase() + profile.slice(1)} Profile`}
              value={enabled ? 'Enabled' : 'Disabled'}
            />
          ))}
        </div>
      )}

      <StatusBadge
        label="Security Updates"
        status={security.security_updates?.length > 0 ? 'Up to Date' : 'Check Required'}
        type={security.security_updates?.length > 0 ? 'success' : 'warning'}
      />

      {security.security_updates?.length > 0 && (
        <div className="ml-4 mt-1">
          <Stat
            label="Updates Installed"
            value={`${security.security_updates.length} security updates`}
            sublabel={security.security_updates[0]?.installed_date 
              ? `Last: ${new Date(security.security_updates[0].installed_date).toLocaleDateString()}`
              : undefined
            }
          />
        </div>
      )}

      <StatusBadge 
        label="File Encryption" 
        status="EFS Available" 
        type="info" 
      />
    </StatBlock>
  )
}

export { SecurityWidget }
export default SecurityWidget
