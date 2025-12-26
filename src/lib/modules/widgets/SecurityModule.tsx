import React from 'react';
import { ExtendedModuleManifest, DeviceWidget, DeviceWidgetProps, ModuleConfigSchema } from '../EnhancedModule';
import { formatRelativeTime } from '../../time';

interface SecurityUpdate {
  id: string;
  title: string;
  status: string;
  severity: string;
  installDate?: string;
}

interface SecurityEvent {
  eventId: number;
  source: string;
  level: string;
  message: string;
  timestamp: string;
}

interface EncryptedVolume {
  driveLetter: string;
  encryptionMethod: string;
  status: string;
  encryptionPercentage: number;
}

interface SecurityData {
  tpm: {
    version: string;
    isEnabled: boolean;
    isPresent: boolean;
    isActivated: boolean;
    manufacturer: string;
  };
  version: string;
  deviceId: string;
  firewall: {
    rules: any[];
    profile: string;
    isEnabled: boolean;
  };
  moduleId: string;
  antivirus: {
    name: string;
    version: string;
    lastScan: string;
    scanType: string;
    isEnabled: boolean;
    isUpToDate: boolean;
    lastUpdate: string;
  };
  encryption: {
    bitLocker: {
      status: string;
      isEnabled: boolean;
      recoveryKeyId: string;
      encryptedDrives: string[];
    };
    deviceEncryption: boolean;
    encryptedVolumes: EncryptedVolume[];
  };
  collectedAt: string;
  securityEvents: SecurityEvent[];
  securityUpdates: SecurityUpdate[];
  lastSecurityScan: string;
}

// Legacy interface for backward compatibility
interface SecurityInfo {
  // macOS security features (legacy)
  gatekeeper?: string;
  sip?: string;
  ssh_groups?: string;
  ssh_users?: string;
  ard_groups?: string;
  root_user?: string;
  ard_users?: string;
  firmwarepw?: string;
  firewall_state?: string;
  skel_state?: string;
  t2_secureboot?: string;
  t2_externalboot?: string;
  activation_lock?: string;
  filevault_status?: boolean;
  filevault_users?: string;
  as_security_mode?: string;
  
  // Windows security features (legacy)
  antivirus?: {
    enabled: boolean;
    status: string;
  };
  firewall?: {
    enabled: boolean;
    status: string;
  };
  bitlocker?: {
    enabled: boolean;
    status: string;
  };
  tpm?: {
    enabled: boolean;
    status: string;
  };
}

// Security Overview Widget
const SecurityOverviewWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  // First try to get the new structured security data
  const security = device?.modules?.security as SecurityData | undefined;
  // Fallback to legacy format
  const legacySecurity = device?.security as SecurityInfo | undefined;

  if (!security && !legacySecurity) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Security Data</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Security information not available</p>
      </div>
    );
  }

  // Handle new structured data format
  if (security) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Antivirus Status */}
          <div className="text-center">
            <div className={`text-sm font-bold mb-1 ${
              security.antivirus?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {security.antivirus?.isEnabled ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {security.antivirus?.name || 'Antivirus'}
            </div>
          </div>
          
          {/* Firewall Status */}
          <div className="text-center">
            <div className={`text-sm font-bold mb-1 ${
              security.firewall?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {security.firewall?.isEnabled ? 'ENABLED' : 'DISABLED'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Windows Firewall</div>
          </div>
          
          {/* BitLocker Status */}
          <div className="text-center">
            <div className={`text-sm font-bold mb-1 ${
              security.encryption?.bitLocker?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {security.encryption?.bitLocker?.isEnabled ? 'ENABLED' : 'DISABLED'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">BitLocker</div>
          </div>
          
          {/* TPM Status */}
          <div className="text-center">
            <div className={`text-sm font-bold mb-1 ${
              security.tpm?.isEnabled && security.tpm?.isPresent ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {security.tpm?.isEnabled && security.tpm?.isPresent ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">TPM {security.tpm?.version || ''}</div>
          </div>
        </div>
      </div>
    );
  }

  // Handle legacy format
  const isWindows = !!(legacySecurity?.antivirus || legacySecurity?.firewall || legacySecurity?.bitlocker || legacySecurity?.tpm);
  const isMacOS = !!(legacySecurity?.gatekeeper || legacySecurity?.sip || legacySecurity?.filevault_status !== undefined);

  if (isWindows) {
    // Windows Security Overview (legacy)
    const getSecurityStatus = (feature: any) => {
      if (!feature) return { color: 'text-gray-600 dark:text-gray-400', status: 'Unknown' };
      if (feature.enabled) return { color: 'text-green-600 dark:text-green-400', status: 'Enabled' };
      return { color: 'text-red-600 dark:text-red-400', status: 'Disabled' };
    };

    return (
      <div className="p-6">
        <div className="space-y-4">
          {legacySecurity?.antivirus && (
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${getSecurityStatus(legacySecurity.antivirus).color}`}>
                {getSecurityStatus(legacySecurity.antivirus).status.toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Antivirus Protection</div>
            </div>
          )}
          
          {legacySecurity?.firewall && (
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${getSecurityStatus(legacySecurity.firewall).color}`}>
                {getSecurityStatus(legacySecurity.firewall).status.toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Windows Firewall</div>
            </div>
          )}
          
          {legacySecurity?.bitlocker && (
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${getSecurityStatus(legacySecurity.bitlocker).color}`}>
                {getSecurityStatus(legacySecurity.bitlocker).status.toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">BitLocker Encryption</div>
            </div>
          )}
          
          {legacySecurity?.tpm && (
            <div className="text-center">
              <div className={`text-sm font-bold mb-1 ${getSecurityStatus(legacySecurity.tpm).color}`}>
                {getSecurityStatus(legacySecurity.tpm).status.toUpperCase()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">TPM Security</div>
            </div>
          )}
        </div>
      </div>
    );
  } else if (isMacOS) {
    // macOS Security Overview (existing implementation)
    return (
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-lg font-bold mb-1 ${
              legacySecurity?.filevault_status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {legacySecurity?.filevault_status ? 'ON' : 'OFF'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">FileVault</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold mb-1 ${
              legacySecurity?.firewall_state === 'On' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {legacySecurity?.firewall_state === 'On' ? 'ON' : 'OFF'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Firewall</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold mb-1 ${
              legacySecurity?.gatekeeper === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {legacySecurity?.gatekeeper === 'Enabled' ? 'ON' : 'OFF'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Gatekeeper</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback for unknown platform
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Unknown Platform</h3>
    <p className="text-xs text-gray-600 dark:text-gray-400">Security information format not recognized</p>
    </div>
  );
};// Security Tab - Comprehensive security view
const SecurityTab: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const [device, setDevice] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDevice(data.device);
          }
        }
      } catch (error) {
        console.error('Failed to fetch device:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading security information...</div>
      </div>
    );
  }

  const security = device?.modules?.security as SecurityData | undefined;

  if (!security) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'important':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Security Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security Status</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Overall security posture and protection status</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Antivirus */}
          <div className="text-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`text-2xl font-bold mb-1 ${
              security.antivirus?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.antivirus?.isEnabled ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Antivirus Protection</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{security.antivirus?.name}</div>
          </div>
          
          {/* Firewall */}
          <div className="text-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`text-2xl font-bold mb-1 ${
              security.firewall?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.firewall?.isEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Windows Firewall</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{security.firewall?.profile || 'No Profile'}</div>
          </div>
          
          {/* BitLocker */}
          <div className="text-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`text-2xl font-bold mb-1 ${
              security.encryption?.bitLocker?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.encryption?.bitLocker?.isEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">BitLocker Encryption</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {security.encryption?.bitLocker?.encryptedDrives?.length || 0} drive(s)
            </div>
          </div>
          
          {/* TPM */}
          <div className="text-center p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className={`text-2xl font-bold mb-1 ${
              security.tpm?.isEnabled && security.tpm?.isPresent ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.tpm?.isEnabled && security.tpm?.isPresent ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">TPM Security</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {security.tpm?.version || 'Unknown'} ({security.tpm?.manufacturer || 'Unknown'})
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Antivirus Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Antivirus Protection</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Product:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{security.antivirus?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Version:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{security.antivirus?.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`text-sm font-medium ${
                security.antivirus?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.antivirus?.isEnabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Up to Date:</span>
              <span className={`text-sm font-medium ${
                security.antivirus?.isUpToDate ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {security.antivirus?.isUpToDate ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Update:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {security.antivirus?.lastUpdate ? formatRelativeTime(security.antivirus.lastUpdate) : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Scan:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {security.antivirus?.lastScan ? formatRelativeTime(security.antivirus.lastScan) : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Scan Type:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{security.antivirus?.scanType || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Encryption Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Disk Encryption</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">BitLocker Status:</span>
              <span className={`text-sm font-medium ${
                security.encryption?.bitLocker?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.encryption?.bitLocker?.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Device Encryption:</span>
              <span className={`text-sm font-medium ${
                security.encryption?.deviceEncryption ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.encryption?.deviceEncryption ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {security.encryption?.bitLocker?.encryptedDrives && security.encryption.bitLocker.encryptedDrives.length > 0 && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Encrypted Drives:</span>
                <div className="space-y-1">
                  {security.encryption.bitLocker.encryptedDrives.map((drive, index) => (
                    <div key={index} className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                      {drive}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {security.encryption?.encryptedVolumes && security.encryption.encryptedVolumes.length > 0 && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Volume Details:</span>
                <div className="space-y-2">
                  {security.encryption.encryptedVolumes.map((volume, index) => (
                    <div key={index} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{volume.driveLetter}</span>
                        <span>{volume.encryptionMethod}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        Status: {volume.status} | Progress: {volume.encryptionPercentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TPM Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TPM Security</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Present:</span>
              <span className={`text-sm font-medium ${
                security.tpm?.isPresent ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.tpm?.isPresent ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Enabled:</span>
              <span className={`text-sm font-medium ${
                security.tpm?.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.tpm?.isEnabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Activated:</span>
              <span className={`text-sm font-medium ${
                security.tpm?.isActivated ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {security.tpm?.isActivated ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Version:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{security.tpm?.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Manufacturer:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{security.tpm?.manufacturer}</span>
            </div>
          </div>
        </div>

        {/* Security Updates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Updates</h3>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto overlay-scrollbar">
            {security.securityUpdates && security.securityUpdates.length > 0 ? (
              security.securityUpdates.map((update, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{update.id}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(update.severity)}`}>
                          {update.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{update.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Status: {update.status} Installed: {update.installDate ? new Date(update.installDate).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">No security updates found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Events */}
      {security.securityEvents && security.securityEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Security Events</h3>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto overlay-scrollbar">
            {security.securityEvents.map((event, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Event {event.eventId}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{event.source}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.message}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Level: {event.level} {formatRelativeTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Legacy widgets - keeping for backward compatibility
// System Security Widget
const SystemSecurityWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No system security data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {security.sip && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Integrity Protection</label>
          <p className={`text-sm font-semibold ${
            security.sip === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.sip}
          </p>
        </div>
      )}
      {security.t2_secureboot && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Secure Boot</label>
          <p className="text-sm text-gray-900 dark:text-white">{security.t2_secureboot}</p>
        </div>
      )}
      {security.as_security_mode && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Mode</label>
          <p className="text-sm text-gray-900 dark:text-white">{security.as_security_mode}</p>
        </div>
      )}
      {security.activation_lock && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Activation Lock</label>
          <p className={`text-sm font-semibold ${
            security.activation_lock === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.activation_lock}
          </p>
        </div>
      )}
      {security.firmwarepw && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Password</label>
          <p className={`text-sm font-semibold ${
            security.firmwarepw === 'Set' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {security.firmwarepw}
          </p>
        </div>
      )}
    </div>
  );
};

// User Access Widget
const UserAccessWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 dark:text-gray-400">No user access data available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {security.root_user && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Root User</label>
          <p className={`text-sm font-semibold ${
            security.root_user === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
          }`}>
            {security.root_user}
          </p>
        </div>
      )}
      {security.ssh_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ssh_users}</p>
        </div>
      )}
      {security.ssh_groups && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Groups</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ssh_groups}</p>
        </div>
      )}
      {security.ard_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ard_users}</p>
        </div>
      )}
      {security.ard_groups && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Groups</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.ard_groups}</p>
        </div>
      )}
      {security.filevault_users && (
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">FileVault Users</label>
          <p className="text-sm text-gray-900 dark:text-white font-mono">{security.filevault_users}</p>
        </div>
      )}
    </div>
  );
};

// Security Details Widget
const SecurityDetailsWidget: React.FC<DeviceWidgetProps> = ({ device }) => {
  const security = device?.security as SecurityInfo | undefined;

  if (!security) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security Status</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Security features and compliance status</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.filevault_status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.filevault_status ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">FileVault</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.firewall_state === 'On' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.firewall_state || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Firewall</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              security.gatekeeper === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
            }`}>
              {security.gatekeeper || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Gatekeeper</div>
          </div>
        </div>
      </div>
      
      {/* Detailed Security Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemSecurityWidget deviceId={device?.id || ''} device={device} />
        <UserAccessWidget deviceId={device?.id || ''} device={device} />
      </div>
    </div>
  );
};

// Module Definition
const SecurityModule = {
  manifest: {
    id: 'security',
    name: 'Security',
    version: '1.0.0',
    description: 'Display security status and compliance information',
    author: 'ReportMate',
    enabled: true,
    category: 'security',
    tags: ['security', 'compliance', 'antivirus', 'firewall', 'bitlocker', 'tpm'],
    dependencies: [],
    documentation: 'Shows security status including antivirus, firewall, BitLocker encryption, and TPM security features.',
  } as ExtendedModuleManifest,

  configSchema: {
    title: 'Security Module Configuration',
    description: 'Configure how security information is displayed',
    properties: {
      showAdvancedSecurity: {
        type: 'boolean' as const,
        title: 'Show Advanced Security',
        description: 'Display advanced security features and settings',
        default: true,
      },
      highlightRisks: {
        type: 'boolean' as const,
        title: 'Highlight Security Risks',
        description: 'Use color coding to highlight security risks',
        default: true,
      },
      showSecurityEvents: {
        type: 'boolean' as const,
        title: 'Show Security Events',
        description: 'Display recent security events and alerts',
        default: true,
      },
      showSecurityUpdates: {
        type: 'boolean' as const,
        title: 'Show Security Updates',
        description: 'Display installed security updates',
        default: true,
      },
    },
  } as ModuleConfigSchema,

  defaultConfig: {
    showAdvancedSecurity: true,
    highlightRisks: true,
    showSecurityEvents: true,
    showSecurityUpdates: true,
  },

  deviceTabs: [
    {
      id: 'security',
      name: 'Security',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      component: SecurityTab,
      order: 5,
      conditions: [{
        type: 'has_data' as const,
        field: 'modules.security',
        operator: 'exists' as const,
        value: true,
      }],
    },
  ],

  deviceWidgets: [
    {
      id: 'security-overview',
      name: 'Security Overview',
      description: 'Quick overview of key security features including antivirus, firewall, BitLocker, and TPM status',
      component: SecurityOverviewWidget,
      category: 'security' as const,
      size: 'small' as const,
      order: 1,
      conditions: [{
        type: 'has_data' as const,
        field: 'modules.security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
      supportsExport: true,
      supportsPrint: true,
      configurable: false,
    },
    {
      id: 'system-security',
      name: 'System Security',
      description: 'System-level security features and settings',
      component: SystemSecurityWidget,
      category: 'security' as const,
      size: 'medium' as const,
      order: 2,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'user-access',
      name: 'User Access',
      description: 'User access and permissions information',
      component: UserAccessWidget,
      category: 'security' as const,
      size: 'medium' as const,
      order: 3,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
    {
      id: 'security-details',
      name: 'Security Details',
      description: 'Comprehensive security status and compliance information',
      component: SecurityDetailsWidget,
      category: 'security' as const,
      size: 'full' as const,
      order: 4,
      conditions: [{
        type: 'has_data' as const,
        field: 'security',
        operator: 'exists' as const,
        value: true,
      }],
      refreshInterval: 300000, // 5 minutes
    },
  ] as DeviceWidget[],

  // Lifecycle hooks
  async onInstall() {
    console.log('Security module installed');
  },

  async onUninstall() {
    console.log('Security module uninstalled');
  },

  async onEnable() {
    console.log('Security module enabled');
  },

  async onDisable() {
    console.log('Security module disabled');
  },

  async onConfigChange(config: any) {
    console.log('Security module configuration changed:', config);
  },
};

export default SecurityModule;
