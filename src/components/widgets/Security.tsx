import React from 'react'

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

  const getStatusColor = (enabled?: boolean, status?: string) => {
    if (enabled === true || status === 'Enabled' || status === 'Up to date') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    } else if (enabled === false || status === 'Disabled') {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    } else {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Security settings and status</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {securityFeatures && Object.keys(securityFeatures).length > 0 ? (
          <div className="space-y-4">
            {isWindows ? (
              <>
                {securityFeatures.bitlocker && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">BitLocker</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.bitlocker.enabled, securityFeatures.bitlocker.status)}`}>
                      {securityFeatures.bitlocker.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.windowsDefender && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Defender</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.windowsDefender.enabled, securityFeatures.windowsDefender.status)}`}>
                      {securityFeatures.windowsDefender.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.uac && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">UAC</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.uac.enabled, securityFeatures.uac.status)}`}>
                      {securityFeatures.uac.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.tpm && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">TPM</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.tpm.enabled, securityFeatures.tpm.status)}`}>
                      {securityFeatures.tpm.status || 'Unknown'} {securityFeatures.tpm.version && `(${securityFeatures.tpm.version})`}
                    </span>
                  </div>
                )}
                {securityFeatures.windowsUpdates && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Updates</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.windowsUpdates.enabled, securityFeatures.windowsUpdates.status)}`}>
                      {securityFeatures.windowsUpdates.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.firewall && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Firewall</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.firewall.enabled, securityFeatures.firewall.status)}`}>
                      {securityFeatures.firewall.status || 'Unknown'}
                    </span>
                  </div>
                )}
              </>
            ) : isMac ? (
              <>
                {securityFeatures.filevault && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">FileVault</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.filevault.enabled, securityFeatures.filevault.status)}`}>
                      {securityFeatures.filevault.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.gatekeeper && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gatekeeper</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.gatekeeper.enabled, securityFeatures.gatekeeper.status)}`}>
                      {securityFeatures.gatekeeper.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.sip && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SIP</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.sip.enabled, securityFeatures.sip.status)}`}>
                      {securityFeatures.sip.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.xprotect && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">XProtect</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(undefined, securityFeatures.xprotect.status)}`}>
                      {securityFeatures.xprotect.status || 'Unknown'}
                    </span>
                  </div>
                )}
                {securityFeatures.firewall && (
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">macOS Firewall</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(securityFeatures.firewall.enabled, securityFeatures.firewall.status)}`}>
                      {securityFeatures.firewall.status || 'Unknown'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {Object.entries(securityFeatures).map(([feature, info]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{feature}</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (info && typeof info === 'object' && 'enabled' in info && info.enabled) || 
                      (info && typeof info === 'object' && 'installed' in info && info.installed)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {(info && typeof info === 'object' && 'status' in info && info.status?.toString()) || 
                       (info && typeof info === 'object' && 'installed' in info && !info.installed && 'Not Installed') ||
                       'Unknown'}
                    </span>
                  </div>
                ))}
              </>
            )}
            
            {securityFeatures.edr && (
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">EDR</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  securityFeatures.edr.installed 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {securityFeatures.edr.installed 
                    ? `${securityFeatures.edr.name} (${securityFeatures.edr.status})`
                    : 'Not Installed'
                  }
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Security information not available</p>
        )}
      </div>
    </div>
  )
}

export default SecurityWidget
