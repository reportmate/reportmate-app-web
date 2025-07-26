'use client';

import { DeviceData } from '@/types/device';
i  const encryption = getEncryptionStatus(security?.encryption);
  const tpm = getTpmStatus(security?.tpm);
  const antivirus = getAntivirusStatus(security?.antivirus);rt StatBlock from '../ui/StatBlock';
import Stat from '../ui/Stat';
import StatusBadge from '../ui/StatusBadge';

interface SecurityProps {
  device: DeviceData;
}

const Security = ({ device }: SecurityProps) => {
  const security = device.modules?.security;

  // Helper functions
  const formatLastUpdated = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getEncryptionStatus = (encryption: any) => {
    if (!encryption) return { status: 'Unknown', drives: [] };
    return {
      status: encryption.bitlocker?.enabled ? 'Enabled' : 'Disabled',
      drives: encryption.bitlocker?.drives || []
    };
  };

  const getTpmStatus = (tpm: any) => {
    if (!tpm) return { status: 'Unknown', version: '', manufacturer: '' };
    return {
      status: tpm.enabled ? 'Enabled' : 'Disabled',
      version: tpm.version || '',
      manufacturer: tpm.manufacturer || ''
    };
  };

  const getAntivirusStatus = (antivirus: any) => {
    if (!antivirus) return { status: 'Unknown', product: '', version: '', lastScan: '' };
    return {
      status: antivirus.enabled ? 'Active' : 'Inactive',
      product: antivirus.product_name || 'Unknown',
      version: antivirus.version || '',
      lastScan: antivirus.last_scan || ''
    };
  };

  const getFirewallStatus = (firewall: any) => {
    if (!firewall) return { status: 'Unknown', profiles: {} };
    return {
      status: firewall.enabled ? 'Enabled' : 'Disabled',
      profiles: firewall.profiles || {}
    };
  };

  const getSecurityUpdates = (updates: any) => {
    if (!updates || !Array.isArray(updates)) return { count: 0, lastInstalled: '' };
    return {
      count: updates.length,
      lastInstalled: updates.length > 0 ? updates[0].installed_date || '' : ''
    };
  };

  const encryption = getEncryptionStatus(security?.encryption);
  const tpm = getTmpStatus(security?.tpm);
  const antivirus = getAntivirusStatus(security?.antivirus);
  const firewall = getFirewallStatus(security?.firewall);
  const securityUpdates = getSecurityUpdates(security?.security_updates);

  return (
    <StatBlock title="Security">
      <Stat
        label="Disk Encryption"
        value={encryption.status}
        badge={
          <StatusBadge 
            status={encryption.status === 'Enabled' ? 'success' : 'error'} 
            text={encryption.status}
          />
        }
      />
      
      {encryption.drives.length > 0 && (
        <div className="ml-4 text-sm text-gray-600">
          {encryption.drives.map((drive: any, index: number) => (
            <div key={index}>
              Drive {drive.letter}: {drive.status}
            </div>
          ))}
        </div>
      )}

      <Stat
        label="TPM"
        value={tpm.status}
        badge={
          <StatusBadge 
            status={tpm.status === 'Enabled' ? 'success' : 'error'} 
            text={tpm.status}
          />
        }
      />
      
      {tpm.version && (
        <div className="ml-4 text-sm text-gray-600">
          Version: {tpm.version}
          {tpm.manufacturer && <span> ({tpm.manufacturer})</span>}
        </div>
      )}

      <Stat
        label="Antivirus"
        value={antivirus.product}
        badge={
          <StatusBadge 
            status={antivirus.status === 'Active' ? 'success' : 'error'} 
            text={antivirus.status}
          />
        }
      />
      
      {antivirus.version && (
        <div className="ml-4 text-sm text-gray-600">
          Version: {antivirus.version}
          {antivirus.lastScan && (
            <div>Last Scan: {formatLastUpdated(antivirus.lastScan)}</div>
          )}
        </div>
      )}

      <Stat
        label="Windows Firewall"
        value={firewall.status}
        badge={
          <StatusBadge 
            status={firewall.status === 'Enabled' ? 'success' : 'error'} 
            text={firewall.status}
          />
        }
      />
      
      {Object.keys(firewall.profiles).length > 0 && (
        <div className="ml-4 text-sm text-gray-600">
          {Object.entries(firewall.profiles).map(([profile, enabled]) => (
            <div key={profile}>
              {profile.charAt(0).toUpperCase() + profile.slice(1)}: {enabled ? 'Enabled' : 'Disabled'}
            </div>
          ))}
        </div>
      )}

      <Stat
        label="Security Updates"
        value={`${securityUpdates.count} installed`}
        badge={
          <StatusBadge 
            status={securityUpdates.count > 0 ? 'success' : 'warning'} 
            text={securityUpdates.count > 0 ? 'Up to Date' : 'Check Required'}
          />
        }
      />
      
      {securityUpdates.lastInstalled && (
        <div className="ml-4 text-sm text-gray-600">
          Last Update: {formatLastUpdated(securityUpdates.lastInstalled)}
        </div>
      )}

      <Stat
        label="File Encryption"
        value="EFS Available"
        badge={
          <StatusBadge 
            status="info" 
            text="Available"
          />
        }
      />
    </StatBlock>
  );
};

export default Security;
