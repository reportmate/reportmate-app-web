"use client"

// Force dynamic rendering and disable caching for dynamic device page
export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatRelativeTime, formatExactTime } from "../../../src/lib/time"
import { ManagedInstallsTable, ApplicationsTable, NetworkTable, SecurityCard } from "../../../src/components/tables"
import DeviceEventsSimple from "../../../src/components/DeviceEventsSimple"
import { SystemWidget } from "../../../src/components/widgets/System"
import { SecurityWidget } from "../../../src/components/widgets/Security"
import { HardwareWidget } from "../../../src/components/widgets/Hardware"
import { NetworkWidget } from "../../../src/components/widgets/Network"
import { ApplicationsWidget } from "../../../src/components/widgets/Applications"
import { ManagementWidget } from "../../../src/components/widgets/Management"

interface FleetEvent {
  id: string
  device: string
  kind: string
  ts: string
  payload: Record<string, unknown>
}

interface ApplicationInfo {
  id: string
  name: string
  displayName?: string
  path?: string
  version: string
  bundle_version?: string
  last_modified?: number
  obtained_from?: string
  runtime_environment?: string
  info?: string
  has64bit?: boolean
  signed_by?: string
  publisher?: string
  category?: string
  installDate?: string  // Windows install date format (YYYYMMDD)
  size?: string
  bundleId?: string
}

interface DeviceInfo {
  id: string
  deviceId?: string
  name: string
  model?: string
  os?: string
  platform?: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
  uptime?: string
  location?: string
  serialNumber?: string
  assetTag?: string
  ipAddress?: string
  macAddress?: string
  totalEvents: number
  lastEventTime: string
  // Hardware properties (direct properties, not nested)
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  architecture?: string
  diskUtilization?: number
  memoryUtilization?: number
  cpuUtilization?: number
  temperature?: number
  batteryLevel?: number
  bootTime?: string
  network?: {
    hostname: string
    connectionType: string
    ssid?: string | null
    signalStrength?: string | null
    service?: string
    status?: number
    ethernet?: string
    clientid?: string
    ipv4conf?: string
    ipv4ip?: string
    ipv4mask?: string
    ipv4router?: string
    ipv6conf?: string
    ipv6ip?: string
    ipv6prefixlen?: number
    ipv6router?: string
    ipv4dns?: string
    vlans?: string
    activemtu?: number
    validmturange?: string
    currentmedia?: string
    activemedia?: string
    searchdomain?: string
    externalip?: string
    location?: string
    airdrop_channel?: string
    airdrop_supported?: boolean
    wow_supported?: boolean
    supported_channels?: string
    supported_phymodes?: string
    wireless_card_type?: string
    country_code?: string
    firmware_version?: string
    wireless_locale?: string
  }
  software?: {
    buildVersion: string
    bootROMVersion: string
    smartStatus: string
    encryptionStatus: string
  }
  security?: {
    gatekeeper?: string
    sip?: string
    ssh_groups?: string
    ssh_users?: string
    ard_groups?: string
    root_user?: string
    ard_users?: string
    firmwarepw?: string
    firewall_state?: string
    skel_state?: string
    t2_secureboot?: string
    t2_externalboot?: string
    activation_lock?: string
    filevault_status?: boolean
    filevault_users?: string
    as_security_mode?: string
  }
  // Platform-specific security features (from API)
  securityFeatures?: {
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
  applications?: {
    totalApps: number
    installedApps: ApplicationInfo[]
  }
  management?: {
    enrolled: boolean
    enrolled_via_dep: boolean
    server_url?: string | null
    user_approved?: boolean
    organization?: string | null
    department?: string | null
    vendor?: string | null
    profiles?: Array<{
      id: string
      name: string
      description: string
      type: string
      status: string
      lastModified: string
    }>
    restrictions?: {
      app_installation?: string
      camera_disabled?: boolean
      screen_recording_disabled?: boolean
      system_preferences_disabled?: boolean
      touch_id_disabled?: boolean
      siri_disabled?: boolean
    }
    apps?: Array<{
      id: string
      name: string
      bundleId: string
      status: string
      source: string
      lastUpdate: string
    }>
  }
  managedInstalls?: {
    totalPackages: number
    installed: number
    pending: number
    failed: number
    lastUpdate: string
    config?: {
      type: 'munki' | 'cimian'
      version: string
      softwareRepoURL: string
      appleCatalogURL?: string | null
      manifest: string
      localOnlyManifest?: string | null
      runType: string
      lastRun: string
      duration: string
    }
    messages?: {
      errors: Array<{
        id: string
        timestamp: string
        package: string
        message: string
        details: string
      }>
      warnings: Array<{
        id: string
        timestamp: string
        package: string
        message: string
        details: string
      }>
    }
    packages: ManagedPackage[]
  }
}

interface ManagedPackage {
  id: string
  name: string
  displayName: string
  version: string
  installedVersion?: string
  size?: number
  type: 'munki' | 'cimian'
  status: 'installed' | 'pending_install' | 'pending_removal' | 'install_failed' | 'install_succeeded' | 'uninstalled' | 'uninstall_failed' | 'removed' | 'Pending Update' | 'Installed' | 'Failed'
  lastUpdate: string
  description?: string
  publisher?: string
  category?: string
}

type TabType = 'info' | 'managed-installs' | 'applications' | 'network' | 'security' | 'events'

const tabs: { id: TabType; label: string; icon: string; description: string }[] = [
  { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Device information, management status, and system details' },
  { id: 'managed-installs', label: 'Managed Installs', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10', description: 'Managed software installations and updates' },
  { id: 'applications', label: 'Applications', icon: 'M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z', description: 'Installed applications and packages' },
  { id: 'network', label: 'Network', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', description: 'Network connectivity and settings' },
  { id: 'security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', description: 'Security status and compliance' },
  { id: 'events', label: 'Events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Event history and activity log' }
]

export default function DeviceDetailPage() {
  const params = useParams()
  const deviceId = params.deviceId as string
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [events, setEvents] = useState<FleetEvent[]>([])
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabType
      if (hash && tabs.some(tab => tab.id === hash)) {
        setActiveTab(hash)
      }
    }
    
    // Set initial tab from URL hash
    handleHashChange()
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  
  // Update URL when tab changes
  const renderConfigurationFields = (config: any) => {
    // Define the core fields to display in order
    const coreFields = [
      {
        key: 'manifest',
        label: 'Manifest',
        value: config.ClientIdentifier || config.manifest,
        fullWidth: true // Display on its own line
      },
      {
        key: 'repo',
        label: 'Repo',
        value: config.SoftwareRepoURL || config.softwareRepoURL,
        fullWidth: true // Display on its own line
      },
      {
        key: 'lastRun',
        label: 'Last Run',
        value: formatRelativeTime(config.lastRun || config.LastCheckDate),
        subValue: `Duration: ${config.duration}`,
        fullWidth: false
      },
      {
        key: 'runType',
        label: 'Run type',
        value: config.runType,
        fullWidth: false,
        capitalize: true
      },
      {
        key: 'version',
        label: 'Version',
        value: config.version,
        fullWidth: false
      }
    ]
    
    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {coreFields.map((field) => {
          if (!field.value) return null
          
          if (field.fullWidth) {
            return (
              <div key={field.key} className="px-4 py-2">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{field.label}</div>
                <div className="text-sm text-gray-900 dark:text-white break-all">
                  {field.value}
                </div>
              </div>
            )
          } else {
            return (
              <div key={field.key} className="flex justify-between items-center px-4 py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{field.label}</span>
                <div className="text-right">
                  <div className={`text-sm text-gray-900 dark:text-white font-semibold ${field.capitalize ? 'capitalize' : ''}`}>
                    {field.value}
                  </div>
                  {field.subValue && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">{field.subValue}</div>
                  )}
                </div>
              </div>
            )
          }
        })}
      </div>
    )
  }

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    window.history.pushState(null, '', `#${tabId}`)
  }
  
  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setLoading(true)
        
        // Fetch device info from Next.js API route
        const deviceResponse = await fetch(`/api/device/${encodeURIComponent(deviceId)}`)
        if (!deviceResponse.ok) {
          if (deviceResponse.status === 404) {
            setError('Device not found')
            return
          }
          throw new Error('Failed to fetch device information')
        }
        
        const deviceData = await deviceResponse.json()
        console.log('Device API Response:', {
          hasSuccess: 'success' in deviceData,
          successValue: deviceData.success,
          hasDevice: 'device' in deviceData,
          deviceValue: !!deviceData.device,
          responseKeys: Object.keys(deviceData),
          responseSize: JSON.stringify(deviceData).length
        })
        
        if (deviceData.success && deviceData.device) {
          setDeviceInfo(deviceData.device)
          // Use events directly from the device API response
          if (deviceData.events) {
            setEvents(deviceData.events)
          }
        } else {
          console.error('Invalid device data structure:', deviceData)
          setError('Invalid device data received')
          return
        }
        
        // No need to fetch events separately since they come with device data
      } catch (error) {
        console.error('Failed to fetch device data:', error)
        setError((error as Error).message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDeviceData()
  }, [deviceId])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading device information...</p>
        </div>
      </div>
    )
  }
  
  if (error || !deviceInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error === 'Device not found' ? 'Device Not Found' : 'Error Loading Device'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error === 'Device not found' 
              ? `The device "${deviceId}" could not be found.` 
              : `Failed to load device information: ${error}`}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    }
  }

  const getEventStatusConfig = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'error': 
        return { bg: 'bg-red-500', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      case 'warning': 
        return { bg: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
      case 'success': 
        return { bg: 'bg-green-500', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
      case 'info': 
        return { bg: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
      case 'system': 
        return { bg: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
      default: 
        return { bg: 'bg-gray-500', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Sticky Header with Device Info and Tabs */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Header Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {deviceInfo.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    {deviceInfo.assetTag && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 min-w-[80px] justify-center">
                        {deviceInfo.assetTag}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 min-w-[80px] justify-center">
                      {deviceInfo.serialNumber}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Last seen {formatRelativeTime(deviceInfo.lastSeen)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                title={tab.description}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* System (Operating System) Widget */}
            <SystemWidget device={deviceInfo} />
            
            {/* Hardware Widget */}
            <HardwareWidget device={deviceInfo} />
            
            {/* Security Widget */}
            <SecurityWidget 
              platform={deviceInfo.platform || deviceInfo.os} 
              securityFeatures={deviceInfo.securityFeatures} 
            />
            
            {/* Network Widget */}
            <NetworkWidget device={deviceInfo} />
            
            {/* Applications Widget */}
            <ApplicationsWidget device={deviceInfo} />
            
            {/* Management Widget */}
            <ManagementWidget device={deviceInfo} />
          </div>
        )}

        {/* Managed Installs Tab */}
        {activeTab === 'managed-installs' && (
          <div className="space-y-8">
            <ManagedInstallsTable data={deviceInfo.managedInstalls || {
              totalPackages: 0,
              installed: 0,
              pending: 0,
              failed: 0,
              lastUpdate: '',
              packages: []
            }} />
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-8">
            <ApplicationsTable data={deviceInfo.applications || {
              totalApps: 0,
              installedApps: []
            }} />
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-8">
            <NetworkTable data={deviceInfo.network || {
              hostname: deviceInfo.name || '',
              connectionType: 'Unknown'
            }} />
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {deviceInfo.securityFeatures ? (
              <>
                {/* Security Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Status</h2>
                      <p className="text-gray-600 dark:text-gray-400">Security features and compliance status</p>
                    </div>
                  </div>
                  
                  {/* Platform-specific security overview */}
                  {deviceInfo.os?.toLowerCase().includes('mac') ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.filevault?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.filevault?.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">FileVault</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.firewall?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.firewall?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Firewall</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.gatekeeper?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.gatekeeper?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Gatekeeper</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.sip?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.sip?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">SIP</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.bitlocker?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.bitlocker?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">BitLocker</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.firewall?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.firewall?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Firewall</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.windowsDefender?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.windowsDefender?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Windows Defender</div>
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold mb-1 ${
                          deviceInfo.securityFeatures.tpm?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {deviceInfo.securityFeatures.tpm?.status || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">TPM {deviceInfo.securityFeatures.tpm?.version}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Detailed Security Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System Security */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {deviceInfo.os?.toLowerCase().includes('mac') ? 'macOS Security' : 'Windows Security'}
                      </h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {deviceInfo.os?.toLowerCase().includes('mac') ? (
                        <>
                          {/* Mac-specific security features */}
                          {deviceInfo.securityFeatures.sip && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">System Integrity Protection</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.sip.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {deviceInfo.securityFeatures.sip.status}
                              </span>
                            </div>
                          )}
                          {deviceInfo.securityFeatures.xprotect && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">XProtect</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.xprotect.status === 'Up to date' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {deviceInfo.securityFeatures.xprotect.status}
                              </span>
                            </div>
                          )}
                          {deviceInfo.securityFeatures.automaticUpdates && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Automatic Updates</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.automaticUpdates.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {deviceInfo.securityFeatures.automaticUpdates.status}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Windows-specific security features */}
                          {deviceInfo.securityFeatures.uac && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">User Account Control</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.uac.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {deviceInfo.securityFeatures.uac.status}
                              </span>
                            </div>
                          )}
                          {deviceInfo.securityFeatures.windowsUpdates && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Updates</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.windowsUpdates.status === 'Up to date' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {deviceInfo.securityFeatures.windowsUpdates.status}
                              </span>
                            </div>
                          )}
                          {deviceInfo.securityFeatures.smartScreen && (
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SmartScreen</label>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                deviceInfo.securityFeatures.smartScreen.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {deviceInfo.securityFeatures.smartScreen.status}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Endpoint Security */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Endpoint Security</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* EDR Status */}
                      <div className="flex justify-between items-start">
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Endpoint Detection & Response</label>
                          {deviceInfo.securityFeatures.edr?.installed && deviceInfo.securityFeatures.edr.version && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Version {deviceInfo.securityFeatures.edr.version}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.edr?.installed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.edr?.installed ? deviceInfo.securityFeatures.edr.status : 'Not Installed'}
                          </span>
                          {deviceInfo.securityFeatures.edr?.installed && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {deviceInfo.securityFeatures.edr.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Additional endpoint security info could go here */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        {deviceInfo.securityFeatures.edr?.installed ? (
                          <p>✓ Active EDR monitoring provides real-time threat detection and response capabilities.</p>
                        ) : (
                          <p>⚠ No EDR solution detected. Consider deploying endpoint protection for enhanced security monitoring.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
                <p className="text-gray-600 dark:text-gray-400">Security information is not available for this device.</p>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-8">
            {events.length > 0 ? (
              <>
                {/* Events List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Events</h3>
                  </div>
                  <div className="p-6">
                    <DeviceEventsSimple events={events.map(event => ({
                      id: event.id,
                      name: event.kind || 'Event', // Use event kind as fallback name
                      raw: event.payload,
                      kind: event.kind,
                      ts: event.ts
                    }))} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Events</h3>
                <p className="text-gray-600 dark:text-gray-400">No events have been recorded for this device yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Managed Installs Tab */}
        {activeTab === 'managed-installs' && (
          <div className="space-y-8">
            <ManagedInstallsTable data={deviceInfo.managedInstalls || {
              totalPackages: 0,
              installed: 0,
              pending: 0,
              failed: 0,
              lastUpdate: '',
              packages: []
            }} />
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-8">
            <ApplicationsTable data={deviceInfo.applications || {
              totalApps: 0,
              installedApps: []
            }} />
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-8">
            <NetworkTable data={deviceInfo.network || {
              hostname: deviceInfo.name || 'Unknown',
              connectionType: 'Unknown',
              ipv4ip: deviceInfo.ipAddress,
              ethernet: deviceInfo.macAddress
            }} />
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <SecurityCard data={deviceInfo.security || {}} />
          </div>
        )}

        {/* Placeholder for remaining tabs */}
        {!['info', 'managed-installs', 'applications', 'network', 'security', 'events'].includes(activeTab) && (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {tabs.find(t => t.id === activeTab)?.label} Tab Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              This tab content will be implemented next.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
