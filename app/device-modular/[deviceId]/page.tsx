"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useModules } from "../../../src/lib/modules/ModuleRegistry"
import { initializeModules, getModuleSourcesFromConfig } from "../../../src/lib/modules/ModuleInit"
import { formatRelativeTime } from "../../../src/lib/time"

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
}

export default function ModularDeviceDetailPage() {
  const params = useParams()
  const deviceId = params.deviceId as string
  const { deviceTabs } = useModules()
  const [activeTab, setActiveTab] = useState<string>('')
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize modules
  useEffect(() => {
    const init = async () => {
      try {
        const customSources = getModuleSourcesFromConfig()
        await initializeModules(customSources)
        setInitialized(true)
      } catch (error) {
        console.error('Failed to initialize modules:', error)
      }
    }

    init()
  }, [])

  // Set active tab to first available when modules are loaded
  useEffect(() => {
    if (initialized && deviceTabs.length > 0 && !activeTab) {
      setActiveTab(deviceTabs[0].id)
    }
  }, [initialized, deviceTabs, activeTab])

  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash && deviceTabs.some(tab => tab.id === hash)) {
        setActiveTab(hash)
      }
    }
    
    // Set initial tab from URL hash
    handleHashChange()
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [deviceTabs])

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab && typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${activeTab}`)
    }
  }, [activeTab])

  // Fetch device info
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.device) {
            setDeviceInfo(data.device)
          } else {
            setError('Device not found')
          }
        } else {
          setError('Failed to load device')
        }
      } catch (error) {
        console.error('Error fetching device:', error)
        setError('Failed to load device')
      } finally {
        setLoading(false)
      }
    }

    if (deviceId) {
      fetchDeviceInfo()
    }
  }, [deviceId])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Initializing modules...</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error || !deviceInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">
              {error || 'Device not found'}
            </div>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (deviceTabs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
              No device modules available
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Install modules that provide device tabs to view device details.
            </p>
            <Link
              href="/modules"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Manage Modules
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const activeTabConfig = deviceTabs.find(tab => tab.id === activeTab)

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
              </div>
            </div>
          </div>
        </div>

        {/* Device Info Bar */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(deviceInfo.status)} flex-shrink-0`}></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {deviceInfo.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{deviceInfo.model}</span>
                  <span>•</span>
                  <span>{deviceInfo.os}</span>
                  <span>•</span>
                  <span>Last seen {formatRelativeTime(deviceInfo.lastSeen)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {deviceTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTabConfig && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {activeTabConfig.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Powered by modular architecture
              </p>
            </div>
            
            {/* Render the active tab component */}
            <activeTabConfig.component deviceId={deviceId} />
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Debug: Loaded Device Tabs
            </h3>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {deviceTabs.map((tab) => (
                <div key={tab.id} className="p-3 bg-white dark:bg-gray-700 rounded border">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {tab.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {tab.id} | Order: {tab.order || 999}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
