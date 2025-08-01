import React, { useEffect, useState } from 'react'

interface DeviceDetailSkeletonProps {
  activeTab?: string
}

export function DeviceDetailSkeleton({ activeTab: initialActiveTab = 'info' }: DeviceDetailSkeletonProps) {
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [loadingMessage, setLoadingMessage] = useState('Fetching device information...')
  const [deviceNameWidth, setDeviceNameWidth] = useState('w-48')

  // Listen for URL hash changes to update the active tab during loading
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
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

  // Update loading message based on active tab
  useEffect(() => {
    const tabName = tabs.find(t => t.id === activeTab)?.label || 'information'
    setLoadingMessage(`Loading ${tabName.toLowerCase()} data...`)
  }, [activeTab])

  // Animate device name width to simulate loading different device names
  useEffect(() => {
    const widths = ['w-40', 'w-48', 'w-56', 'w-64']
    let currentIndex = 0
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % widths.length
      setDeviceNameWidth(widths[currentIndex])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    window.history.pushState(null, '', `#${tabId}`)
  }
  const tabs = [
    { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accentColor: 'blue' },
    { id: 'hardware', label: 'Hardware', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', accentColor: 'orange' },
    { id: 'system', label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', accentColor: 'purple' },
    { id: 'management', label: 'Management', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', accentColor: 'yellow' },
    { id: 'installs', label: 'Installs', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10', accentColor: 'blue' },
    { id: 'applications', label: 'Applications', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', accentColor: 'blue' },
    { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', accentColor: 'red' },
    { id: 'network', label: 'Network', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', accentColor: 'teal' },
    { id: 'events', label: 'Events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', accentColor: 'gray' }
  ]

  const getTabAccentColors = (accentColor: string, isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'border-blue-500 text-blue-600 dark:text-blue-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      orange: {
        active: 'border-orange-500 text-orange-600 dark:text-orange-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      purple: {
        active: 'border-purple-500 text-purple-600 dark:text-purple-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      yellow: {
        active: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      red: {
        active: 'border-red-500 text-red-600 dark:text-red-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      teal: {
        active: 'border-teal-500 text-teal-600 dark:text-teal-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      gray: {
        active: 'border-gray-500 text-gray-600 dark:text-gray-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      }
    }
    
    return colorMap[accentColor as keyof typeof colorMap]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive']
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Loading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-blue-200 dark:bg-blue-900 overflow-hidden">
          <div 
            className="h-full bg-blue-600 dark:bg-blue-400 w-full animate-pulse"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          ></div>
        </div>
      </div>

      {/* Sticky Header with Device Info and Tabs */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Header Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                {/* Dashboard back button skeleton */}
                <div className="hidden sm:flex items-center">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 pt-6 pb-6 sm:pt-0 sm:pb-0">
                  {/* Device name skeleton - varying width */}
                  <div className={`h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse transition-all duration-500 ${deviceNameWidth}`}></div>
                  
                  {/* Asset tag and serial skeletons */}
                  <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
              
              {/* Last seen skeleton */}
              <div className="hidden sm:flex items-center gap-4 pr-4">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Desktop tabs */}
            <nav className="hidden sm:flex -mb-px space-x-2 md:space-x-4 lg:space-x-6 xl:space-x-8 justify-start">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                
                return (
                  <div key={tab.id} className="relative group">
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={`tab-button flex items-center justify-center p-3.5 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out flex-shrink-0 rounded-t-lg ${
                        isActive 
                          ? getTabAccentColors(tab.accentColor, true)
                          : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      title={`Loading ${tab.label} information...`}
                    >
                      <svg className="w-6 h-6 flex-shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                      {/* Text that appears on hover, but grayed out during loading */}
                      <span className="tab-label-transition overflow-hidden whitespace-nowrap max-w-0 opacity-0 ml-0 group-hover:max-w-32 group-hover:opacity-60 group-hover:ml-2 transition-all duration-200 text-gray-400">
                        {tab.label}
                      </span>
                    </button>
                  </div>
                )
              })}
            </nav>

            {/* Mobile dropdown skeleton */}
            <div className="sm:hidden pt-4 pb-4">
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => handleTabChange(e.target.value)}
                  className="appearance-none block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm cursor-pointer"
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-500 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading indicator */}
        <div className="mb-6 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span>{loadingMessage}</span>
        </div>

        {activeTab === 'info' && <InfoTabSkeleton />}
        {activeTab === 'hardware' && <HardwareTabSkeleton />}
        {activeTab === 'system' && <SystemTabSkeleton />}
        {activeTab === 'management' && <ManagementTabSkeleton />}
        {activeTab === 'installs' && <InstallsTabSkeleton />}
        {activeTab === 'applications' && <ApplicationsTabSkeleton />}
        {activeTab === 'security' && <SecurityTabSkeleton />}
        {activeTab === 'network' && <NetworkTabSkeleton />}
        {activeTab === 'events' && <EventsTabSkeleton />}
      </div>
    </div>
  )
}

// Individual tab skeletons that show the structure of each tab

function InfoTabSkeleton() {
  const fieldWidths = ['w-20', 'w-24', 'w-28', 'w-32', 'w-36', 'w-40']
  const valueWidths = ['w-24', 'w-28', 'w-32', 'w-36', 'w-40', 'w-44']
  
  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
              <div className="ml-4">
                <div className={`h-4 ${fieldWidths[i % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                <div className={`h-6 ${valueWidths[i % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Device details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic info card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className={`h-4 ${fieldWidths[i % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                <div className={`h-4 ${valueWidths[i % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardware summary card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className={`h-4 ${fieldWidths[i % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                <div className={`h-4 ${valueWidths[(i + 2) % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function HardwareTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hardware overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['Processor', 'Memory', 'Storage', 'Graphics'].map((title, i) => (
          <div key={title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" style={{ animationDelay: `${i * 0.1}s` }}></div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
          </div>
        ))}
      </div>

      {/* Detailed hardware info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((col) => (
              <div key={col} className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${(col - 1) * 0.1 + i * 0.05}s` }}></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* System info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['Operating System', 'System Information'].map((title) => (
          <div key={title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManagementTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Management status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Configuration details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InstallsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Install stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['Total', 'Installed', 'Pending', 'Failed'].map((status, i) => (
          <div key={status} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2" style={{ animationDelay: `${i * 0.1}s` }}></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
          </div>
        ))}
      </div>

      {/* Packages list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 flex justify-between items-center">
              <div className="flex-1">
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" style={{ animationDelay: `${i * 0.1}s` }}></div>
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ApplicationsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* App stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Total Apps', 'Recently Updated', 'System Apps'].map((stat) => (
          <div key={stat} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Applications list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SecurityTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Security status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Firewall', 'Antivirus', 'Encryption'].map((feature) => (
          <div key={feature} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Security details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetworkTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Network interfaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Wi-Fi', 'Ethernet'].map((interface_type) => (
          <div key={interface_type} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Event stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['Total', 'Today', 'Warnings', 'Errors'].map((stat) => (
          <div key={stat} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Events list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-6 flex gap-4">
              <div className="w-2 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
