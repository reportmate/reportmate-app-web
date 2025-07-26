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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {text}
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
      return new Date(dateStr).toLocaleDateString('en-US', {
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
          <div className="flex items-center gap-3 mb-6">
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

          {/* Top Row - 3 equal columns (1/3 each) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Antivirus Protection - 1/3 */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Antivirus Protection
                </h3>
                
                {security.antivirus ? (
                  <>
                    <div className="flex justify-center">
                      <StatusPill 
                        status={security.antivirus.isEnabled && security.antivirus.isUpToDate ? 'success' : security.antivirus.isEnabled ? 'warning' : 'error'} 
                        text={security.antivirus.isEnabled && security.antivirus.isUpToDate ? 'UP-TO-DATE' : security.antivirus.isEnabled ? 'NEEDS UPDATE' : 'INACTIVE'} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">Product Details</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Product:</span> {security.antivirus.name || 'Unknown'}</div>
                          <div><span className="font-medium">Version:</span> {security.antivirus.version || 'Unknown'}</div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Status:</span>
                            <span className={`px-2 py-1 rounded text-xs ${security.antivirus.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {security.antivirus.isEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Up to Date:</span>
                            <span className={`px-2 py-1 rounded text-xs ${security.antivirus.isUpToDate ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {security.antivirus.isUpToDate ? 'Yes' : 'No'}
                            </span>
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
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <StatusPill status="error" text="UNKNOWN" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">No antivirus information available</div>
                  </>
                )}
              </div>
            </div>

            {/* Disk Encryption - 1/3 */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {isWindows ? 'BitLocker Encryption' : isMacOS ? 'FileVault' : 'Disk Encryption'}
                </h3>
                
                {security.encryption ? (
                  <>
                    {isWindows && security.encryption.bitLocker && (
                      <>
                        <div className="flex justify-center">
                          <StatusPill 
                            status={security.encryption.bitLocker.isEnabled ? 'success' : 'error'} 
                            text={security.encryption.bitLocker.isEnabled ? 'ENABLED' : 'DISABLED'} 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                            <div className="font-medium text-gray-900 dark:text-white mb-2">BitLocker Status</div>
                            <div className="space-y-1 text-xs">
                              <div><span className="font-medium">Overall Status:</span> {security.encryption.bitLocker.status || 'Unknown'}</div>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Device Encryption:</span>
                                <span className={`px-2 py-1 rounded text-xs ${security.encryption.deviceEncryption ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {security.encryption.deviceEncryption ? 'Enabled' : 'Disabled'}
                                </span>
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
                                {security.encryption.encryptedVolumes.map((volume: any, index: number) => (
                                  <div key={index} className="bg-gray-100 dark:bg-gray-500 p-2 rounded text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div><span className="font-medium">Drive:</span> {volume.driveLetter}</div>
                                      <div><span className="font-medium">Status:</span> {volume.status}</div>
                                      <div><span className="font-medium">Method:</span> {volume.encryptionMethod}</div>
                                      <div><span className="font-medium">Progress:</span> {volume.encryptionPercentage}%</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {isMacOS && (
                      <>
                        <div className="flex justify-center">
                          <StatusPill status="warning" text="FILEVAULT" />
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          FileVault encryption information would be displayed here for macOS devices
                        </div>
                      </>
                    )}
                    {isLinux && (
                      <>
                        <div className="flex justify-center">
                          <StatusPill status="warning" text="LUKS" />
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          LUKS encryption information would be displayed here for Linux devices
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <StatusPill status="error" text="DISABLED" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">No encryption information available</div>
                  </>
                )}
              </div>
            </div>

            {/* Tamper Protection / TPM - 1/3 */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  {isWindows ? 'Tamper Protection' : isMacOS ? 'Secure Enclave' : 'Hardware Security'}
                </h3>
                
                {isWindows && security.tpm ? (
                  <>
                    <div className="flex justify-center">
                      <StatusPill 
                        status={security.tpm.isPresent && security.tpm.isEnabled && security.tpm.isActivated ? 'success' : 'error'} 
                        text={security.tpm.isPresent && security.tpm.isEnabled && security.tpm.isActivated ? 'ENABLED' : 'DISABLED'} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">TPM Information</div>
                        <div className="space-y-1 text-xs">
                          <div><span className="font-medium">Version:</span> {security.tpm.version || 'Unknown'}</div>
                          <div><span className="font-medium">Manufacturer:</span> {security.tpm.manufacturer || 'Unknown'}</div>
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-600 p-3 rounded border">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">TPM State</div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Present:</span>
                            <span className={`flex items-center ${security.tpm.isPresent ? 'text-green-600' : 'text-red-600'}`}>
                              {security.tpm.isPresent ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              {security.tpm.isPresent ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Enabled:</span>
                            <span className={`flex items-center ${security.tpm.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                              {security.tpm.isEnabled ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              {security.tpm.isEnabled ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Activated:</span>
                            <span className={`flex items-center ${security.tpm.isActivated ? 'text-green-600' : 'text-red-600'}`}>
                              {security.tpm.isActivated ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              {security.tpm.isActivated ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : isMacOS ? (
                  <>
                    <div className="flex justify-center">
                      <StatusPill status="warning" text="SECURE ENCLAVE" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      Secure Enclave information would be displayed here for macOS devices
                    </div>
                  </>
                ) : isLinux ? (
                  <>
                    <div className="flex justify-center">
                      <StatusPill status="warning" text="TPM" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      TPM information would be displayed here for Linux devices
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <StatusPill status="error" text="UNKNOWN" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">No TPM information available</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Security Information - Moved above Security Updates */}
      {security && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Additional Security Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firewall Details */}
            {security.firewall && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {isWindows ? 'Windows Firewall' : isMacOS ? 'macOS Firewall' : 'System Firewall'}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <StatusPill 
                      status={security.firewall.isEnabled ? 'success' : 'error'} 
                      text={security.firewall.isEnabled ? 'Active' : 'Inactive'} 
                    />
                  </div>
                  <div className="text-sm space-y-2">
                    <div><span className="font-medium">Profile:</span> {security.firewall.profile || 'Not specified'}</div>
                    <div><span className="font-medium">Rules:</span> {security.firewall.rules?.length || 0} configured</div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Monitoring */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Security Monitoring
              </h4>
              <div className="space-y-3">
                {security.lastSecurityScan && (
                  <div className="text-sm">
                    <span className="font-medium">Last Security Scan:</span> {formatDate(security.lastSecurityScan)}
                  </div>
                )}
                {security.collectedAt && (
                  <div className="text-sm">
                    <span className="font-medium">Data Collection:</span> {formatDate(security.collectedAt)}
                  </div>
                )}
                {security.version && (
                  <div className="text-sm">
                    <span className="font-medium">Security Module:</span> v{security.version}
                  </div>
                )}
                {security.deviceId && (
                  <div className="text-sm">
                    <span className="font-medium">Device ID:</span> 
                    <span className="font-mono text-xs ml-1">{security.deviceId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Events Table */}
      {security && (
        <SecurityEventsTable data={{ securityEvents: security.securityEvents || [] }} />
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
    </div>
  )
}

export default SecurityTab
