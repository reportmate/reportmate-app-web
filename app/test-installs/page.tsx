'use client'

import React, { useState, useEffect } from 'react'
import { InstallsTab } from '../../src/components/tabs/InstallsTab'

export default function TestInstallsPage() {
  const [deviceData, setDeviceData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('🟦🟦🟦 TEST PAGE USEEFFECT RUNNING! 🟦🟦🟦')
    
    fetch('/api/device/0F33V9G25083HJ')
      .then(response => {
        console.log('[TEST PAGE] API response status:', response.status)
        return response.json()
      })
      .then(data => {
        console.log('[TEST PAGE] Device data received:', {
          hasData: !!data,
          hasModules: !!data?.modules,
          hasInstalls: !!data?.modules?.installs,
          hasCimian: !!data?.modules?.installs?.cimian,
          cimianItemsCount: data?.modules?.installs?.cimian?.items?.length || 0,
          pendingPackagesCount: data?.modules?.installs?.cimian?.pendingPackages?.length || 0
        })
        setDeviceData(data)
      })
      .catch(error => {
        console.error('[TEST PAGE] Error fetching device:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8">Loading test data...</div>
  }

  if (!deviceData) {
    return <div className="p-8">Failed to load device data</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">InstallsTab Component Test</h1>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Test Debug Info:</h2>
        <div className="text-sm space-y-1">
          <div>Has Device Data: {deviceData ? 'Yes' : 'No'}</div>
          <div>Has Modules: {deviceData?.modules ? 'Yes' : 'No'}</div>
          <div>Has Installs: {deviceData?.modules?.installs ? 'Yes' : 'No'}</div>
          <div>Has Cimian: {deviceData?.modules?.installs?.cimian ? 'Yes' : 'No'}</div>
          <div>Cimian Items: {deviceData?.modules?.installs?.cimian?.items?.length || 0}</div>
          <div>Pending Packages: {deviceData?.modules?.installs?.cimian?.pendingPackages?.length || 0}</div>
        </div>
      </div>
      
      <InstallsTab device={deviceData} />
    </div>
  )
}
