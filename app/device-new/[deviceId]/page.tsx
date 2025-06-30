"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { initializeModules, getModuleSourcesFromConfig } from "../../../src/lib/modules/ModuleInit"
import { formatRelativeTime } from "../../../src/lib/time"
import { ModularDeviceLayout } from "../../../src/lib/modules/ModularDeviceLayout"

interface DeviceInfo {
  id: string
  name: string
  model: string
  os: string
  lastSeen: string
  status: 'online' | 'offline' | 'warning' | 'error'
  serialNumber?: string
  architecture?: string
  uptime?: string
}

export default function NewModularDeviceDetailPage() {
  const params = useParams()
  const deviceId = params.deviceId as string
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
        setError('Failed to initialize module system')
      }
    }

    init()
  }, [])

  // Fetch device data
  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDeviceInfo(data.device)
          } else {
            setError(data.error || 'Device not found')
          }
        } else {
          setError('Failed to fetch device')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    if (initialized) {
      fetchDevice()
    }
  }, [deviceId, initialized])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-500 dark:text-gray-400">
              {!initialized ? 'Initializing modules...' : 'Loading device...'}
            </div>
          </div>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Device Details
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                href="/modules"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
              >
                Manage Modules
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Device Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(deviceInfo.status)} flex-shrink-0`}></div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {deviceInfo.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span>{deviceInfo.model}</span>
                <span>•</span>
                <span>{deviceInfo.os}</span>
                <span>•</span>
                <span>Last seen {formatRelativeTime(deviceInfo.lastSeen)}</span>
                {deviceInfo.serialNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{deviceInfo.serialNumber}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modular Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModularDeviceLayout deviceId={deviceId} />
      </main>

      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              🔧 Development Info
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Device ID:</strong> {deviceId}</p>
              <p><strong>Modules Initialized:</strong> ✅</p>
              <p><strong>Page Type:</strong> Modular Widget-Based Layout</p>
              <p><strong>Architecture:</strong> Plugin-based with dynamic widgets</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
