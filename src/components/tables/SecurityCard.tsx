import React from 'react';

interface SecurityFeature {
  enabled: boolean;
  status: string;
}

interface SecurityData {
  // macOS security features
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
  
  // Windows security features
  antivirus?: SecurityFeature;
  firewall?: SecurityFeature;
  bitlocker?: SecurityFeature;
  tpm?: SecurityFeature;
}

interface SecurityCardProps {
  data: SecurityData;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
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

  // Detect platform based on available security features
  const isWindows = !!(data.antivirus || data.firewall || data.bitlocker || data.tpm);
  const isMacOS = !!(data.gatekeeper || data.sip || data.filevault_status !== undefined);

  const getSecurityStatus = (feature: SecurityFeature | undefined) => {
    if (!feature) return { color: 'text-gray-600 dark:text-gray-400', status: 'Unknown' };
    if (feature.enabled) return { color: 'text-green-600 dark:text-green-400', status: 'Enabled' };
    return { color: 'text-red-600 dark:text-red-400', status: 'Disabled' };
  };

  if (isWindows) {
    return (
      <div className="space-y-6">
        {/* Security Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Windows Security Status</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security features and protection status</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.antivirus && (
              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${getSecurityStatus(data.antivirus).color}`}>
                  {getSecurityStatus(data.antivirus).status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Antivirus Protection</div>
              </div>
            )}
            
            {data.firewall && (
              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${getSecurityStatus(data.firewall).color}`}>
                  {getSecurityStatus(data.firewall).status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Windows Firewall</div>
              </div>
            )}
            
            {data.bitlocker && (
              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${getSecurityStatus(data.bitlocker).color}`}>
                  {getSecurityStatus(data.bitlocker).status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">BitLocker Encryption</div>
              </div>
            )}
            
            {data.tpm && (
              <div className="text-center">
                <div className={`text-lg font-bold mb-1 ${getSecurityStatus(data.tpm).color}`}>
                  {getSecurityStatus(data.tpm).status.toUpperCase()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">TPM Security</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else if (isMacOS) {
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">macOS Security Status</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security features and compliance status</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${
                data.filevault_status ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {data.filevault_status ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">FileVault</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${
                data.firewall_state === 'On' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {data.firewall_state || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Firewall</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold mb-1 ${
                data.gatekeeper === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
              }`}>
                {data.gatekeeper || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gatekeeper</div>
            </div>
          </div>
        </div>
        
        {/* Detailed Security Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Security */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Security</h3>
            </div>
            <div className="p-6 space-y-4">
              {data.sip && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">System Integrity Protection</span>
                  <span className={`text-sm font-semibold ${
                    data.sip === 'Enabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
                  }`}>
                    {data.sip}
                  </span>
                </div>
              )}
              {data.t2_secureboot && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Secure Boot</span>
                  <span className="text-sm text-gray-900 dark:text-white">{data.t2_secureboot}</span>
                </div>
              )}
              {data.as_security_mode && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Mode</span>
                  <span className="text-sm text-gray-900 dark:text-white">{data.as_security_mode}</span>
                </div>
              )}
              {data.activation_lock && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Activation Lock</span>
                  <span className={`text-sm font-semibold ${
                    data.activation_lock === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
                  }`}>
                    {data.activation_lock}
                  </span>
                </div>
              )}
              {data.firmwarepw && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Firmware Password</span>
                  <span className={`text-sm font-semibold ${
                    data.firmwarepw === 'Set' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {data.firmwarepw}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User Access */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Access</h3>
            </div>
            <div className="p-6 space-y-4">
              {data.root_user && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Root User</span>
                  <span className={`text-sm font-semibold ${
                    data.root_user === 'Disabled' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-300'
                  }`}>
                    {data.root_user}
                  </span>
                </div>
              )}
              {data.ssh_users && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Users</span>
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ssh_users}</span>
                </div>
              )}
              {data.ssh_groups && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SSH Groups</span>
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ssh_groups}</span>
                </div>
              )}
              {data.ard_users && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Users</span>
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ard_users}</span>
                </div>
              )}
              {data.ard_groups && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ARD Groups</span>
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ard_groups}</span>
                </div>
              )}
              {data.filevault_users && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">FileVault Users</span>
                  <span className="text-sm text-gray-900 dark:text-white font-mono">{data.filevault_users}</span>
                </div>
              )}
            </div>
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
};
