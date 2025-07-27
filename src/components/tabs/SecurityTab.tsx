/**
 * Security Tab Component - Platform-Aware with Rich Details and Improved Layout
 * Comprehensive security status and compliance information with pill-shaped statuses
 */

import React from 'react'
import { Shield, Lock, Key, Download, Activity, CheckCircle, XCircle } from 'lucide-react'
import { SecurityEventsTable } from '../tables'

interface SecurityTabProps {
  device: any
  data?: any
}

const StatusPill = ({ status, text }: { status: 'success' | 'error' | 'warning', text: string }) => {
  const colors = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
  }
  
  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border ${colors[status]}`}>
      {text}
    </span>
  )
}

const InlineStatus = ({ enabled, enabledText = 'Yes', disabledText = 'No' }: { 
  enabled: boolean | undefined, 
  enabledText?: string, 
  disabledText?: string 
}) => {
  if (enabled === undefined) return <span className="text-gray-500">Unknown</span>
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
      enabled 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }`}>
      {enabled ? enabledText : disabledText}
    </span>
  )
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ device, data }) => {
  // Get security data from the new modular structure
  const security = device?.modules?.security || device?.security

  // Detect platform for platform-aware display
  const platform = device?.modules?.system?.operatingSystem?.osName?.toLowerCase() || 
                  device?.operatingSystem?.toLowerCase() || 
                  device?.platform?.toLowerCase() || 
                  'windows'
  
  const isWindows = platform.includes('windows')
  const isMacOS = platform.includes('mac') || platform.includes('darwin')
  const isLinux = platform.includes('linux')

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    try {
      const date = new Date(dateStr)
      // Check if date is valid
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

  return (
    <div className="space-y-8">
      {/* Security Overview - Platform-aware display */}
      {security && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            {/* Left side: Title and description */}
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-red-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Security Status
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isWindows ? 'Windows' : isMacOS ? 'macOS' : isLinux ? 'Linux' : 'Device'} security features and compliance
                </p>
              </div>
            </div>

            {/* Right side: Security Monitoring - compact box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 min-w-72">
              <div className="space-y-2 text-sm">
                {(security.antivirus?.lastScan || security.lastSecurityScan) && (
                  <div className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Last Scan:</span> {formatDate(security.antivirus?.lastScan || security.lastSecurityScan)}
                  </div>
                )}
                {security.collectedAt && (
                  <div className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Data Collection:</span> {formatDate(security.collectedAt)}
                  </div>
                )}
                {security.version && (
                  <div className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Module:</span> v{security.version}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Left: Disk Encryption */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {isWindows ? 'BitLocker Encryption' : isMacOS ? 'FileVault' : 'Disk Encryption'}
                  </h3>
                  {security.encryption ? (
                    <>
                      {isWindows && security.encryption.bitLocker && (
                        <StatusPill 
                          status={security.encryption.bitLocker.isEnabled ? 'success' : 'error'} 
                          text={security.encryption.bitLocker.isEnabled ? 'ENABLED' : 'DISABLED'} 
                        />
                      )}
                      {isMacOS && (
                        <StatusPill status="warning" text="FILEVAULT" />
                      )}
                      {isLinux && (
                        <StatusPill status="warning" text="LUKS" />
                      )}
                    </>
                  ) : (
                    <StatusPill status="error" text="DISABLED" />
                  )}
                </div>
                
                {security.encryption && isWindows && security.encryption.bitLocker ? (
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">BitLocker Status</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="font-medium">Overall Status:</span> {security.encryption.bitLocker.status || 'Unknown'}</div>
                        <div>
                          <div className="font-medium">Device Encryption:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus 
                              enabled={security.encryption.deviceEncryption} 
                              enabledText="Enabled" 
                              disabledText="Disabled" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {security.encryption.bitLocker.encryptedDrives && (
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">
                          Encrypted Drives ({Array.isArray(security.encryption.bitLocker.encryptedDrives) 
                            ? security.encryption.bitLocker.encryptedDrives.length 
                            : 1} drive(s))
                        </div>
                        <div className="space-y-1">
                          {Array.isArray(security.encryption.bitLocker.encryptedDrives) 
                            ? security.encryption.bitLocker.encryptedDrives.map((drive: string, index: number) => (
                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                  {drive}
                                </span>
                              ))
                            : <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {security.encryption.bitLocker.encryptedDrives}
                              </span>
                          }
                        </div>
                      </div>
                    )}

                    {security.encryption.encryptedVolumes && security.encryption.encryptedVolumes.length > 0 && (
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">Volume Details</div>
                        <div className="space-y-2">
                          {security.encryption.encryptedVolumes.map((volume: any, index: number) => {
                            // Map numeric status to meaningful text
                            const getVolumeStatus = (status: string | number) => {
                              if (status === "1" || status === 1) return "Fully Encrypted"
                              if (status === "0" || status === 0) return "Not Encrypted"
                              if (status === "2" || status === 2) return "Encryption In Progress"
                              if (status === "3" || status === 3) return "Decryption In Progress"
                              return status?.toString() || "Unknown"
                            }
                            
                            return (
                              <div key={index} className="bg-gray-100 dark:bg-gray-500 p-2 rounded text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                  <div><span className="font-medium">Drive:</span> {volume.driveLetter}</div>
                                  <div><span className="font-medium">Status:</span> {getVolumeStatus(volume.status)}</div>
                                  <div><span className="font-medium">Method:</span> {volume.encryptionMethod}</div>
                                  <div><span className="font-medium">Progress:</span> {volume.encryptionPercentage}%</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {isMacOS ? 'FileVault encryption information would be displayed here for macOS devices' :
                     isLinux ? 'LUKS encryption information would be displayed here for Linux devices' :
                     'No encryption information available'}
                  </div>
                )}
              </div>
            </div>

           {/* Top Right: Antivirus Protection */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Antivirus Protection
                  </h3>
                  {security.antivirus ? (
                    <StatusPill 
                      status={security.antivirus.isEnabled && security.antivirus.isUpToDate ? 'success' : security.antivirus.isEnabled ? 'warning' : 'error'} 
                      text={security.antivirus.isEnabled && security.antivirus.isUpToDate ? 'UP-TO-DATE' : security.antivirus.isEnabled ? 'NEEDS UPDATE' : 'INACTIVE'} 
                    />
                  ) : (
                    <StatusPill status="error" text="UNKNOWN" />
                  )}
                </div>
                
                {security.antivirus ? (
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">Product Details</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="font-medium">Product:</span> {security.antivirus.name || 'Unknown'}</div>
                        <div><span className="font-medium">Version:</span> {security.antivirus.version || 'Unknown'}</div>
                        <div>
                          <div className="font-medium">Status:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus 
                              enabled={security.antivirus.isEnabled} 
                              enabledText="Active" 
                              disabledText="Disabled" 
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Up to Date:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus 
                              enabled={security.antivirus.isUpToDate} 
                              enabledText="Yes" 
                              disabledText="No" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {security.antivirus.lastScan && (
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">Last Scan</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Date:</span> {formatDate(security.antivirus.lastScan)}</div>
                          <div><span className="font-medium">Type:</span> {security.antivirus.scanType || 'Unknown'}</div>
                        </div>
                      </div>
                    )}
                    
                    {security.antivirus.lastUpdate && (
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">Updates</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Last Update:</span> {formatDate(security.antivirus.lastUpdate)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">No antivirus information available</div>
                )}
              </div>
            </div>

            {/* Bottom Left: Tamper Protection / TPM */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {isWindows ? 'Tamper Protection' : isMacOS ? 'Secure Enclave' : 'Hardware Security'}
                  </h3>
                  {isWindows && security.tpm ? (
                    <StatusPill 
                      status={security.tpm?.isPresent && security.tpm?.isEnabled && security.tpm?.isActivated ? 'success' : 'error'} 
                      text={security.tpm?.isPresent && security.tpm?.isEnabled && security.tpm?.isActivated ? 'ENABLED' : 'DISABLED'} 
                    />
                  ) : isMacOS ? (
                    <StatusPill status="warning" text="SECURE ENCLAVE" />
                  ) : isLinux ? (
                    <StatusPill status="warning" text="TPM" />
                  ) : (
                    <StatusPill status="error" text="UNKNOWN" />
                  )}
                </div>
                
                {isWindows && security.tpm ? (
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">TPM Information</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="font-medium">Version:</span> {security.tpm?.version || 'Unknown'}</div>
                        <div><span className="font-medium">Manufacturer:</span> {security.tpm?.manufacturer || 'Unknown'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">TPM State</div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div>
                          <div className="font-medium">Present:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus enabled={security.tpm?.isPresent} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Enabled:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus enabled={security.tpm?.isEnabled} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Activated:</div>
                          <div className="ml-2 mt-1">
                            <InlineStatus enabled={security.tpm?.isActivated} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    {isMacOS ? 'Secure Enclave information would be displayed here for macOS devices' :
                     isLinux ? 'TPM information would be displayed here for Linux devices' :
                     'No TPM information available'}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Right: Firewall Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {isWindows ? 'Windows Firewall' : isMacOS ? 'macOS Firewall' : 'System Firewall'}
                  </h3>
                  {security.firewall ? (
                    <StatusPill 
                      status={security.firewall.isEnabled ? 'success' : 'error'} 
                      text={security.firewall.isEnabled ? 'ACTIVE' : 'INACTIVE'} 
                    />
                  ) : (
                    <StatusPill status="error" text="UNKNOWN" />
                  )}
                </div>
                
                {security.firewall ? (
                  <div className="space-y-2">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">Firewall Details</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="font-medium">Profile:</span> {security.firewall.profile === 'Unknown' ? 'Not specified' : (security.firewall.profile || 'Not specified')}</div>
                        <div><span className="font-medium">Rules:</span> {security.firewall.rules?.length || 0} configured</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">No firewall information available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Windows Hello - Enterprise Authentication */}
      {isWindows && security?.windowsHello && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Windows Hello</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enterprise authentication and biometric security
              </p>
            </div>
            <div className="ml-auto">
              <StatusPill 
                status={security.windowsHello.statusDisplay?.includes('Enabled') ? 'success' : 'error'} 
                text={security.windowsHello.statusDisplay || 'UNKNOWN'} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Authentication Methods */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Authentication Methods</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">PIN</span>
                  <InlineStatus enabled={security.windowsHello.credentialProviders?.pinEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Face Recognition</span>
                  <InlineStatus enabled={security.windowsHello.credentialProviders?.faceRecognitionEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Fingerprint</span>
                  <InlineStatus enabled={security.windowsHello.credentialProviders?.fingerprintEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Smart Card</span>
                  <InlineStatus enabled={security.windowsHello.credentialProviders?.smartCardEnabled} />
                </div>
              </div>

              {/* Credential Providers */}
              {security.windowsHello.credentialProviders?.providers && security.windowsHello.credentialProviders.providers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Active Providers</div>
                  <div className="space-y-1">
                    {security.windowsHello.credentialProviders.providers.map((provider: any, index: number) => (
                      <div key={index} className="text-xs bg-white dark:bg-gray-600 p-2 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white">{provider.name}</div>
                        <div className="text-gray-500 dark:text-gray-400">{provider.type} • {provider.isEnabled ? 'Enabled' : 'Disabled'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Policies & Configuration */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Policies & Settings</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Domain PIN Logon</span>
                  <InlineStatus enabled={security.windowsHello.policies?.allowDomainPinLogon} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Biometric Logon</span>
                  <InlineStatus enabled={security.windowsHello.policies?.biometricLogonEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Credential Guard</span>
                  <InlineStatus enabled={security.windowsHello.credentialGuard?.isEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">WebAuthN</span>
                  <InlineStatus enabled={security.windowsHello.webAuthN?.isEnabled} />
                </div>
              </div>

              {/* Policy Details */}
              {(security.windowsHello.policies?.groupPolicies?.length > 0 || security.windowsHello.policies?.passportPolicies?.length > 0) && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Active Policies</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {security.windowsHello.policies.groupPolicies?.length || 0} Group Policies, {' '}
                    {security.windowsHello.policies.passportPolicies?.length || 0} Passport Policies
                  </div>
                </div>
              )}

              {/* Credential Guard Details */}
              {security.windowsHello.credentialGuard?.isEnabled && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Credential Guard</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {security.windowsHello.credentialGuard.configuration}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h4>
              
              {/* Biometric Service Status */}
              <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Biometric Service</span>
                  <InlineStatus 
                    enabled={security.windowsHello.biometricService?.isServiceRunning} 
                    enabledText="Running"
                    disabledText="Stopped"
                  />
                </div>
                {security.windowsHello.biometricService?.serviceStatus && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {security.windowsHello.biometricService.serviceStatus}
                  </div>
                )}
              </div>

              {/* Recent Hello Events */}
              {security.windowsHello.helloEvents && security.windowsHello.helloEvents.length > 0 ? (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Recent Authentication Events ({security.windowsHello.helloEvents.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {security.windowsHello.helloEvents.slice(0, 3).map((event: any, index: number) => (
                      <div key={index} className="text-xs bg-white dark:bg-gray-600 p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Event {event.eventId}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {event.eventType}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {event.description}
                        </div>
                        <div className="text-gray-500 dark:text-gray-500 mt-1">
                          {formatDate(event.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {security.windowsHello.helloEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      +{security.windowsHello.helloEvents.length - 3} more events
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent authentication events
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Updates - Prominent Table */}
      {security?.securityUpdates && security.securityUpdates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Recently installed security updates and patches
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{security.securityUpdates.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Updates Installed</div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Update ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Install Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {security.securityUpdates.map((update: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {update.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {update.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        update.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                        update.severity === 'Important' ? 'bg-orange-100 text-orange-800' :
                        update.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {update.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <StatusPill 
                        status={update.status === 'Installed' ? 'success' : 'warning'} 
                        text={update.status} 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(update.installDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Events Table */}
      {security && (
        <SecurityEventsTable data={{ securityEvents: security.securityEvents || [] }} />
      )}

    </div>
  )
}

export default SecurityTab
