"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatRelativeTime, formatExactTime } from "../../../src/lib/time"

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
  path: string
  version: string
  bundle_version?: string
  last_modified: number
  obtained_from?: string
  runtime_environment?: string
  info?: string
  has64bit?: boolean
  signed_by?: string
  publisher?: string
  category?: string
}

interface DeviceInfo {
  id: string
  name: string
  model?: string
  os?: string
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
  mdm?: {
    enrolled: boolean
    enrolled_via_dep: boolean
    server_url?: string | null
    user_approved?: boolean
    organization?: string | null
    department?: string | null
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
  { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Device information, MDM status, and system details' },
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
        
        // Fetch device info
        const deviceResponse = await fetch(`/api/device/${encodeURIComponent(deviceId)}`)
        if (!deviceResponse.ok) {
          if (deviceResponse.status === 404) {
            setError('Device not found')
            return
          }
          throw new Error('Failed to fetch device information')
        }
        
        const deviceData = await deviceResponse.json()
        if (deviceData.deviceInfo) {
          setDeviceInfo(deviceData.deviceInfo)
          // Use events directly from the device API response
          if (deviceData.events) {
            setEvents(deviceData.events)
          }
        } else {
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {deviceInfo.assetTag}
                      </span>
                    )}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
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
            {/* Basic Information Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Device identity and details</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Device Name</label>
                    <p className="text-gray-900 dark:text-white">{deviceInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Serial Number</label>
                    <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.serialNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Model</label>
                    <p className="text-gray-900 dark:text-white">{deviceInfo.model}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Asset Tag</label>
                    <p className="text-gray-900 dark:text-white">{deviceInfo.assetTag || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MDM Enrollment Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">MDM Enrollment</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Management enrollment status</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrollment</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      deviceInfo.mdm?.enrolled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {deviceInfo.mdm?.enrolled ? 'Enrolled' : 'Not Enrolled'}
                    </span>
                  </div>
                  {deviceInfo.mdm?.enrolled && (
                    <>
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DEP Enrollment</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          deviceInfo.mdm.enrolled_via_dep 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {deviceInfo.mdm.enrolled_via_dep ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">User Approved</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          deviceInfo.mdm.user_approved 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {deviceInfo.mdm.user_approved ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {deviceInfo.mdm.organization && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</label>
                          <p className="text-gray-900 dark:text-white text-sm">{deviceInfo.mdm.organization}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Operating System Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Operating System</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">System version and details</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Operating System</label>
                    <p className="text-gray-900 dark:text-white">{deviceInfo.os}</p>
                  </div>
                  {deviceInfo.software && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Build Version</label>
                        <p className="text-gray-900 dark:text-white">{deviceInfo.software.buildVersion}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Boot ROM Version</label>
                        <p className="text-gray-900 dark:text-white">{deviceInfo.software.bootROMVersion}</p>
                      </div>
                    </>
                  )}
                  {deviceInfo.uptime && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</label>
                      <p className="text-gray-900 dark:text-white">{deviceInfo.uptime}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hardware Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">System specifications</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {deviceInfo.processor ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Processor</label>
                      <p className="text-gray-900 dark:text-white">{deviceInfo.processor}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</label>
                      <p className="text-gray-900 dark:text-white">{deviceInfo.memory}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage</label>
                      <p className="text-gray-900 dark:text-white">{deviceInfo.storage}</p>
                    </div>
                    {deviceInfo.graphics && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Graphics</label>
                        <p className="text-gray-900 dark:text-white">{deviceInfo.graphics}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Architecture</label>
                      <p className="text-gray-900 dark:text-white">{deviceInfo.architecture}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">Hardware information not available</p>
                )}
              </div>
            </div>

            {/* Security Widget */}
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
                {deviceInfo.securityFeatures ? (
                  <div className="space-y-4">
                    {/* Platform-specific security features */}
                    {deviceInfo.os?.toLowerCase().includes('mac') ? (
                      <>
                        {/* Mac Security Features */}
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">FileVault</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.filevault?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.filevault?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gatekeeper</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.gatekeeper?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.gatekeeper?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SIP</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.sip?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.sip?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">XProtect</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.xprotect?.status === 'Up to date' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {deviceInfo.securityFeatures.xprotect?.status || 'Unknown'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Windows Security Features */}
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">BitLocker</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.bitlocker?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.bitlocker?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Windows Defender</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.windowsDefender?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.windowsDefender?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">UAC</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.uac?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.uac?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">TPM</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            deviceInfo.securityFeatures.tpm?.enabled 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {deviceInfo.securityFeatures.tpm?.status || 'Unknown'} {deviceInfo.securityFeatures.tpm?.version && `(${deviceInfo.securityFeatures.tpm.version})`}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Universal Security Features */}
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Firewall</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        deviceInfo.securityFeatures.firewall?.enabled 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {deviceInfo.securityFeatures.firewall?.status || 'Unknown'}
                      </span>
                    </div>
                    
                    {/* EDR Status */}
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">EDR</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        deviceInfo.securityFeatures.edr?.installed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {deviceInfo.securityFeatures.edr?.installed 
                          ? `${deviceInfo.securityFeatures.edr.name} (${deviceInfo.securityFeatures.edr.status})`
                          : 'Not Installed'
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">Security information not available</p>
                )}
              </div>
            </div>

            {/* Network Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Network configuration</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                    <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.ipAddress}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</label>
                    <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.macAddress}</p>
                  </div>
                  {deviceInfo.network && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</label>
                        <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.hostname}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection Type</label>
                        <p className="text-gray-900 dark:text-white">{deviceInfo.network.connectionType}</p>
                      </div>
                      {deviceInfo.network.ssid && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">SSID</label>
                          <p className="text-gray-900 dark:text-white">{deviceInfo.network.ssid}</p>
                        </div>
                      )}
                      {deviceInfo.network.signalStrength && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal Strength</label>
                          <p className="text-gray-900 dark:text-white">{deviceInfo.network.signalStrength}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Managed Installs Tab */}
        {activeTab === 'managed-installs' && (
          <div className="space-y-6">
            {deviceInfo.managedInstalls ? (
              <>
                {/* Installation Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {deviceInfo.managedInstalls.installed}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Installed</div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      {deviceInfo.managedInstalls.pending}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {deviceInfo.managedInstalls.failed}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  </div>
                </div>

                {/* Two-column layout: 33% for Errors/Warnings/Configuration, 67% for Managed Packages */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column A (33%): Errors/Warnings and Configuration */}
                  <div className="space-y-4">
                    {/* Show Configuration first if no errors or warnings exist */}
                    {(!deviceInfo.managedInstalls.messages?.errors || deviceInfo.managedInstalls.messages.errors.length === 0) &&
                     (!deviceInfo.managedInstalls.messages?.warnings || deviceInfo.managedInstalls.messages.warnings.length === 0) &&
                     deviceInfo.managedInstalls.config && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {deviceInfo.os?.includes('macOS') || deviceInfo.os?.includes('Mac') ? 'Munki' : 
                               deviceInfo.os?.includes('Windows') ? 'Cimian' : 
                               deviceInfo.managedInstalls.config.type === 'munki' ? 'Munki' : 'Cimian'} Configuration
                            </h3>
                          </div>
                        </div>
                        <div className="p-0">
                          {renderConfigurationFields(deviceInfo.managedInstalls.config)}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {deviceInfo.managedInstalls.messages?.errors && deviceInfo.managedInstalls.messages.errors.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              Errors ({deviceInfo.managedInstalls.messages.errors.length})
                            </h3>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="space-y-3">
                            {deviceInfo.managedInstalls.messages.errors.map((error) => (
                              <div key={error.id} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                    {error.package}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatRelativeTime(error.timestamp)}
                                  </span>
                                </div>
                                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                                  {error.message}
                                </div>
                                <div className="text-xs text-red-700 dark:text-red-300 font-mono bg-red-100 dark:bg-red-800/20 rounded p-2 whitespace-pre-wrap">
                                  {error.details}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Warnings */}
                    {deviceInfo.managedInstalls.messages?.warnings && deviceInfo.managedInstalls.messages.warnings.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              Warnings ({deviceInfo.managedInstalls.messages.warnings.length})
                            </h3>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="space-y-3">
                            {deviceInfo.managedInstalls.messages.warnings.map((warning) => (
                              <div key={warning.id} className="border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-900/20">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    {warning.package}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatRelativeTime(warning.timestamp)}
                                  </span>
                                </div>
                                <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                  {warning.message}
                                </div>
                                <div className="text-xs text-yellow-700 dark:text-yellow-300 font-mono bg-yellow-100 dark:bg-yellow-800/20 rounded p-2 whitespace-pre-wrap">
                                  {warning.details}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Configuration (shown below errors/warnings when they exist) */}
                    {((deviceInfo.managedInstalls.messages?.errors && deviceInfo.managedInstalls.messages.errors.length > 0) ||
                      (deviceInfo.managedInstalls.messages?.warnings && deviceInfo.managedInstalls.messages.warnings.length > 0)) &&
                     deviceInfo.managedInstalls.config && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {deviceInfo.os?.includes('macOS') || deviceInfo.os?.includes('Mac') ? 'Munki' : 
                               deviceInfo.os?.includes('Windows') ? 'Cimian' : 
                               deviceInfo.managedInstalls.config.type === 'munki' ? 'Munki' : 'Cimian'} Configuration
                            </h3>
                          </div>
                        </div>
                        <div className="p-0">
                          {renderConfigurationFields(deviceInfo.managedInstalls.config)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column B (67%): Managed Packages Table */}
                  <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Managed Packages</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Software managed by {
                                deviceInfo.os?.includes('macOS') || deviceInfo.os?.includes('Mac') ? 'Munki' : 
                                deviceInfo.os?.includes('Windows') ? 'Cimian' : 
                                deviceInfo.managedInstalls.config?.type === 'munki' ? 'Munki' : 
                                deviceInfo.managedInstalls.config?.type === 'cimian' ? 'Cimian' : 
                                'management system'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto hide-scrollbar">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Update</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {[...deviceInfo.managedInstalls.packages].sort((a, b) => 
                              (a.displayName || a.name).localeCompare(b.displayName || b.name)
                            ).map((pkg) => (
                              <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{pkg.displayName}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{pkg.name}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {pkg.version}
                                    {pkg.installedVersion && pkg.installedVersion !== pkg.version && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        (installed: {pkg.installedVersion})
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    pkg.status === 'installed' || pkg.status === 'Installed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    pkg.status === 'pending_install' || pkg.status === 'Pending Update' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' :
                                    pkg.status === 'pending_removal' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    pkg.status.includes('failed') || pkg.status === 'Failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    pkg.status === 'install_succeeded' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                  }`}>
                                    {pkg.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {formatRelativeTime(pkg.lastUpdate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Managed Installs</h3>
                <p className="text-gray-600 dark:text-gray-400">This device does not have managed software installations configured.</p>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-8">
            {deviceInfo.applications && deviceInfo.applications.installedApps && Array.isArray(deviceInfo.applications.installedApps) && deviceInfo.applications.installedApps.length > 0 ? (
              <>
                {/* Applications List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Installed Applications</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Applications currently installed on this device</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bundle ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Publisher</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Modified</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {deviceInfo.applications.installedApps.map((app, index) => (
                          <tr key={app.id || app.name || `app-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{app.displayName || app.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{app.path}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {app.version}
                                {app.bundle_version && app.bundle_version !== app.version && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Build: {app.bundle_version}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white font-mono">{app.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">{app.publisher || app.signed_by || 'Unknown'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {app.last_modified ? formatRelativeTime(new Date(app.last_modified * 1000).toISOString()) : 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Applications Data</h3>
                <p className="text-gray-600 dark:text-gray-400">Application information is not available for this device.</p>
              </div>
            )}
          </div>
        )}

        {/* Network Tab */}
        {activeTab === 'network' && (
          <div className="space-y-8">
            {deviceInfo.network ? (
              <>
                {/* Network Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Network Configuration</h2>
                      <p className="text-gray-600 dark:text-gray-400">Network connectivity and configuration details</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        {deviceInfo.network.connectionType}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Connection Type</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
                        {deviceInfo.ipAddress}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">IP Address</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1 font-mono">
                        {deviceInfo.macAddress}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">MAC Address</div>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Network Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Network Info */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Hostname</label>
                        <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.hostname}</p>
                      </div>
                      {deviceInfo.network.service && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Service</label>
                          <p className="text-gray-900 dark:text-white">{deviceInfo.network.service}</p>
                        </div>
                      )}
                      {deviceInfo.network.ethernet && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Interface</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.ethernet}</p>
                        </div>
                      )}
                      {deviceInfo.network.clientid && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Client ID</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.clientid}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* IPv4 Configuration */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IPv4 Configuration</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {deviceInfo.network.ipv4conf && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Configuration</label>
                          <p className="text-gray-900 dark:text-white">{deviceInfo.network.ipv4conf}</p>
                        </div>
                      )}
                      {deviceInfo.network.ipv4ip && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.ipv4ip}</p>
                        </div>
                      )}
                      {deviceInfo.network.ipv4mask && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Subnet Mask</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.ipv4mask}</p>
                        </div>
                      )}
                      {deviceInfo.network.ipv4router && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Router</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.ipv4router}</p>
                        </div>
                      )}
                      {deviceInfo.network.ipv4dns && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNS Servers</label>
                          <p className="text-gray-900 dark:text-white font-mono">{deviceInfo.network.ipv4dns}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Network Data</h3>
                <p className="text-gray-600 dark:text-gray-400">Network information is not available for this device.</p>
              </div>
            )}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {events.map((event) => {
                      const statusConfig = getEventStatusConfig(event.kind)
                      return (
                        <div key={event.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={`w-3 h-3 rounded-full mt-2 ${statusConfig.bg}`}></div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                                    {event.kind}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatRelativeTime(event.ts)}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                  {event.id}
                                </span>
                              </div>
                              <div className="text-sm text-gray-900 dark:text-white mb-2">
                                Device: {event.device}
                              </div>
                              {event.payload && Object.keys(event.payload).length > 0 && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2 font-mono">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(event.payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
