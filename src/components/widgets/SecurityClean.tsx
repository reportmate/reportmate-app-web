import React from 'react'
import { StatBlock, Stat, StatusBadge } from './shared'

const Security = ({ device }: { device: any }) => {
  const security = device?.modules?.security

  if (!security) {
    return (
      <StatBlock title="Security">
        <Stat
          label="Disk Encryption"
          value="Unknown"
          badge={<StatusBadge status="error" text="Unknown" />}
        />
        <Stat
          label="File Encryption"
          value="EFS Available"
          badge={<StatusBadge status="info" text="Available" />}
        />
      </StatBlock>
    )
  }

  return (
    <StatBlock title="Security">
      <Stat
        label="Disk Encryption"
        value={security.encryption?.bitlocker?.enabled ? 'Enabled' : 'Disabled'}
        badge={
          <StatusBadge 
            status={security.encryption?.bitlocker?.enabled ? 'success' : 'error'} 
            text={security.encryption?.bitlocker?.enabled ? 'Enabled' : 'Disabled'}
          />
        }
      />

      <Stat
        label="TPM"
        value={security.tmp?.enabled ? 'Enabled' : 'Disabled'}
        badge={
          <StatusBadge 
            status={security.tpm?.enabled ? 'success' : 'error'} 
            text={security.tpm?.enabled ? 'Enabled' : 'Disabled'}
          />
        }
      />

      <Stat
        label="Antivirus"
        value={security.antivirus?.product_name || 'Unknown'}
        badge={
          <StatusBadge 
            status={security.antivirus?.enabled ? 'success' : 'error'} 
            text={security.antivirus?.enabled ? 'Active' : 'Inactive'}
          />
        }
      />

      <Stat
        label="Windows Firewall"
        value={security.firewall?.enabled ? 'Enabled' : 'Disabled'}
        badge={
          <StatusBadge 
            status={security.firewall?.enabled ? 'success' : 'error'} 
            text={security.firewall?.enabled ? 'Enabled' : 'Disabled'}
          />
        }
      />

      <Stat
        label="Security Updates"
        value={`${security.security_updates?.length || 0} installed`}
        badge={
          <StatusBadge 
            status={security.security_updates?.length > 0 ? 'success' : 'warning'} 
            text={security.security_updates?.length > 0 ? 'Up to Date' : 'Check Required'}
          />
        }
      />

      <Stat
        label="File Encryption"
        value="EFS Available"
        badge={<StatusBadge status="info" text="Available" />}
      />
    </StatBlock>
  )
}

export default Security
