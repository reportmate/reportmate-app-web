/**
 * Security Tab Component  
 * Security features and compliance information with card-based design
 */

import React from 'react'
import { Shield, Lock, Fingerprint, Cpu } from 'lucide-react'

interface SecurityTabProps {
  device: any
  data?: any
}

const StatusIndicator = ({ enabled, label }: { enabled: boolean | undefined, label: string }) => {
  if (enabled === undefined) {
    return (
      <div className="text-left">
        <div className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3">{label}</div>
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          Status Unknown
        </div>
      </div>
    )
  }
  
  return (
    <div className="text-left">
      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{label}</div>
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        enabled 
          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      }`}>
        {enabled ? 'Enabled' : 'Disabled'}
      </div>
    </div>
  )
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ device, data }) => {
  // Get security data from the new modular structure
  const security = device?.modules?.security || device?.security

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

  if (!security) {
    return (
      <div className="text-left py-16">
        <div className="w-16 h-16 mb-4 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Last Scan */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Overview</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">Device protection and compliance status</p>
          </div>
        </div>
        {(security.antivirus?.lastScan || security.lastSecurityScan) && (
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Last Scan</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(security.antivirus?.lastScan || security.lastSecurityScan)}
            </div>
          </div>
        )}
      </div>

      {/* Protection Category - Big Card with 3 Columns */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Protection</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-8 divide-x divide-gray-200 dark:divide-gray-700">
          {/* Antivirus */}
          <div className="px-4 first:pl-0">
            <StatusIndicator enabled={security.antivirus?.isEnabled} label="Antivirus" />
            {security.antivirus && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {security.antivirus.name || 'Unknown Antivirus'}
                </div>
                {security.antivirus.version && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Version: {security.antivirus.version}
                  </div>
                )}
                {security.antivirus.isUpToDate !== undefined && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Status: {security.antivirus.isUpToDate ? 'Up to date' : 'Needs update'}
                  </div>
                )}
                {security.antivirus.lastUpdate && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Updated: {formatDate(security.antivirus.lastUpdate)}
                  </div>
                )}
                {security.antivirus.lastScan && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last Scan: {formatDate(security.antivirus.lastScan)} 
                    {security.antivirus.scanType && ` (${security.antivirus.scanType})`}
                  </div>
                )}
                {security.antivirus.realTimeProtection !== undefined && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Real-time Protection: {security.antivirus.realTimeProtection ? 'Enabled' : 'Disabled'}
                  </div>
                )}
                {security.antivirus.definitionsVersion && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Definitions: {security.antivirus.definitionsVersion}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Firewall */}
          <div className="px-4">
            <StatusIndicator enabled={security.firewall?.isEnabled} label="Firewall" />
            {security.firewall && (
              <div className="mt-3 space-y-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Windows Firewall
                </div>
                {security.firewall.profile && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Profile: {security.firewall.profile}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BitLocker */}
          <div className="px-4 last:pr-0">
            <StatusIndicator enabled={security.encryption?.bitLocker?.isEnabled} label="BitLocker" />
            {security.encryption?.bitLocker && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {security.encryption.bitLocker.isEnabled ? 'Encrypted' : 'Not Encrypted'}
                </div>
                {security.encryption.bitLocker.encryptedDrives?.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {security.encryption.bitLocker.encryptedDrives.length} drive(s): {security.encryption.bitLocker.encryptedDrives.join(', ')}
                  </div>
                )}
                {security.encryption.bitLocker.encryptionMethod && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Method: {security.encryption.bitLocker.encryptionMethod}
                  </div>
                )}
                {security.encryption.bitLocker.status && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Status: {security.encryption.bitLocker.status}
                  </div>
                )}
                {security.encryption.bitLocker.protectionStatus && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Protection: {security.encryption.bitLocker.protectionStatus}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Authentication Card - 50% Left */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Authentication</h2>
          </div>

          {security.windowsHello ? (
            <div className="space-y-6">
              <div className="text-left">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Windows Hello</div>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  Enabled
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">PIN Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    security.windowsHello.credentialProviders?.pinEnabled 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {security.windowsHello.credentialProviders?.pinEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Biometric Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (security.windowsHello.credentialProviders?.faceRecognitionEnabled || 
                     security.windowsHello.credentialProviders?.fingerprintEnabled)
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {(security.windowsHello.credentialProviders?.faceRecognitionEnabled || 
                      security.windowsHello.credentialProviders?.fingerprintEnabled) ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {/* Policy Information */}
                {security.windowsHello.policies && (
                  <>
                                        <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Domain PIN Logon:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        security.windowsHello.policies.allowDomainPinLogon
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {security.windowsHello.policies.allowDomainPinLogon ? 'Allowed' : 'Not Allowed'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Biometric Logon:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        security.windowsHello.policies.biometricLogonEnabled
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {security.windowsHello.policies.biometricLogonEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {/* Passport Policies */}
                    {security.windowsHello.policies.passportPolicies && security.windowsHello.policies.passportPolicies.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">Passport Policies:</span>
                        <div className="space-y-2">
                          {security.windowsHello.policies.passportPolicies.map((policy: any, index: number) => (
                            <div key={index} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                              {typeof policy === 'string' ? policy : JSON.stringify(policy)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
                        <div className="text-left py-8">
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Windows Hello</div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mb-2">
                Not Available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Windows Hello is not configured on this device
              </div>
            </div>
          )}
        </div>

        {/* Hardware Card - 50% Right */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hardware</h2>
          </div>

          {security.tpm ? (
            <div className="space-y-6">
              <div className="text-left">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Trusted Platform Module</div>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  (security.tpm.isPresent && security.tpm.isEnabled && security.tpm.isActivated)
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {(security.tpm.isPresent && security.tpm.isEnabled && security.tpm.isActivated) ? 'Active' : 'Inactive'}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Present:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    security.tpm.isPresent 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {security.tpm.isPresent ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Enabled:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    security.tpm.isEnabled 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {security.tpm.isEnabled ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Activated:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    security.tpm.isActivated 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {security.tpm.isActivated ? 'Yes' : 'No'}
                  </span>
                </div>

                {security.tpm.version && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Version:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{security.tpm.version}</span>
                  </div>
                )}

                {security.tpm.manufacturer && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Manufacturer:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{security.tpm.manufacturer}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-left py-8">
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Trusted Platform Module</div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mb-2">
                Not Available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                TPM information is not available for this device
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SecurityTab