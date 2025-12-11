'use client'

import React, { useState, useEffect } from 'react'

interface Package {
  name: string
  status: string
  version: string
  installedVersion?: string
  lastUpdate: string
}

export default function LiveInstallsPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const fetchLiveData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/live-installs', {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        setPackages(data.data)
        setLastRefresh(new Date().toLocaleString())
        console.log('Live installs data loaded:', data.data)
      } else {
        throw new Error(data.error || 'Invalid data format')
      }
    } catch (err) {
      console.error('Failed to fetch live installs:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveData()
    
    // Auto-refresh every 60 seconds (increased from 30 to reduce server load)
    const interval = setInterval(fetchLiveData, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'installed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const statusCounts = packages.reduce((acc, pkg) => {
    const status = pkg.status.toLowerCase()
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading && packages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live installs data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Package Status</h1>
              <p className="text-gray-600 mt-2">Real-time data directly from ReportMate</p>
            </div>
            <button
              onClick={fetchLiveData}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
          
          {lastRefresh && (
            <p className="text-sm text-gray-500 mt-2">Last updated: {lastRefresh}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error loading data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Status Summary */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Status Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{packages.length}</div>
              <div className="text-sm text-gray-600">Total Packages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statusCounts.installed || 0}</div>
              <div className="text-sm text-gray-600">Installed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statusCounts.pending || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.warning || 0}</div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statusCounts.error || 0}</div>
              <div className="text-sm text-gray-600">Error</div>
            </div>
          </div>
        </div>

        {/* Packages Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Package Details</h2>
          </div>
          
          {packages.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No package data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Installed Version</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {packages.map((pkg, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{pkg.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pkg.status)}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pkg.version}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pkg.installedVersion || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(pkg.lastUpdate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
