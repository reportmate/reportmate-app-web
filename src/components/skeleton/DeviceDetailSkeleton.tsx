import React, { useEffect, useState, useMemo } from 'react'

interface DeviceDetailSkeletonProps {
  activeTab?: string
  isMac?: boolean // Optional: if true, show unified memory layout; if false, show Windows layout; if undefined, show generic
}

export function DeviceDetailSkeleton({ activeTab: initialActiveTab = 'info', isMac }: DeviceDetailSkeletonProps) {
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [loadingMessage, setLoadingMessage] = useState('Fetching device information...')
  const [deviceNameWidth, setDeviceNameWidth] = useState('w-48')

  const tabs = useMemo(() => [
    { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', accentColor: 'monochrome' },
    { id: 'installs', label: 'Installs', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', accentColor: 'emerald' },
    { id: 'applications', label: 'Applications', icon: 'M19 12.2H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V10.2a2 2 0 00-2-2M5 12.2V10.2a2 2 0 012-2m0 0V6.2a2 2 0 012-2h6a2 2 0 012 2v2M7 8.2h10', accentColor: 'blue' },
    { id: 'profiles', label: 'Profiles', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', accentColor: 'violet' },
    { id: 'management', label: 'Management', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', accentColor: 'yellow' },
    { id: 'hardware', label: 'Hardware', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', accentColor: 'orange' },
    { id: 'peripherals', label: 'Peripherals', icon: 'M8.8 3.2h6.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1zM8.8 7.2h6.4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zM10.4 17.2h3.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z', accentColor: 'cyan' },
    { id: 'system', label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', accentColor: 'purple' },
    { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', accentColor: 'red' },
    { id: 'network', label: 'Network', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', accentColor: 'teal' },
    { id: 'events', label: 'Events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', accentColor: 'monochrome' }
  ], [])

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
  }, [tabs])

  // Update loading message based on active tab
  useEffect(() => {
    const tabName = tabs.find(t => t.id === activeTab)?.label || 'information'
    setLoadingMessage(`Loading ${tabName.toLowerCase()} data...`)
  }, [activeTab, tabs])

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
      emerald: {
        active: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      violet: {
        active: 'border-violet-500 text-violet-600 dark:text-violet-400',
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
      cyan: {
        active: 'border-cyan-500 text-cyan-600 dark:text-cyan-400',
        inactive: 'border-transparent text-gray-500 dark:text-gray-400'
      },
      monochrome: {
        active: 'border-gray-500 text-black dark:text-white',
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
                {/* Breadcrumbs skeleton - Dashboard icon + chevron + Devices icon */}
                <div className="hidden sm:flex items-center gap-2">
                  {/* Dashboard clipboard icon */}
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  {/* Chevron */}
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.05s' }}></div>
                  {/* Devices desktop icon */}
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                </div>
                <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 pt-6 pb-6 sm:pt-0 sm:pb-0">
                  {/* Device name skeleton - varying width */}
                  <div className={`h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse transition-all duration-500 ${deviceNameWidth}`}></div>
                  
                  {/* Three pill skeletons - asset tag, serial, IP address */}
                  <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></div>
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
              
              {/* Right side: Last seen + Remote button + Shell button */}
              <div className="hidden sm:flex items-center gap-4 pr-4">
                {/* Last seen text skeleton */}
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.25s' }}></div>
                {/* Remote button skeleton */}
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                {/* Shell button skeleton */}
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.35s' }}></div>
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
        {activeTab === 'installs' && <InstallsTabSkeleton />}
        {activeTab === 'profiles' && <ProfilesTabSkeleton />}
        {activeTab === 'applications' && <ApplicationsTabSkeleton />}
        {activeTab === 'management' && <ManagementTabSkeleton />}
        {activeTab === 'system' && <SystemTabSkeleton />}
        {activeTab === 'hardware' && <HardwareTabSkeleton isMac={isMac} />}
        {activeTab === 'peripherals' && <PeripheralsTabSkeleton />}
        {activeTab === 'network' && <NetworkTabSkeleton />}
        {activeTab === 'security' && <SecurityTabSkeleton />}
        {activeTab === 'events' && <EventsTabSkeleton />}
      </div>
    </div>
  )
}

// Individual tab skeletons - exported for use in ModuleLoadingState

export function InfoTabSkeleton() {
  const fieldWidths = ['w-20', 'w-24', 'w-28', 'w-32', 'w-36', 'w-40']
  const valueWidths = ['w-24', 'w-28', 'w-32', 'w-36', 'w-40', 'w-44']
  
  // Widget data matching the exact InfoTab structure
  const widgets = [
    { 
      title: 'Inventory', 
      subtitle: 'Device identity and assignment details',
      icon: 'information',
      iconColor: 'bg-blue-100 dark:bg-blue-900',
      rows: 4, // Device Name, Asset Tag, Serial, Registration Date
      twoColumn: true
    },
    { 
      title: 'System', 
      subtitle: 'Operating system information',
      icon: 'desktop',
      iconColor: 'bg-purple-100 dark:bg-purple-900',
      rows: 6, // OS Name, Version, Edition, Build, Architecture, Install Date
      twoColumn: false
    },
    { 
      title: 'Hardware', 
      subtitle: 'Hardware specifications',
      icon: 'chip',
      iconColor: 'bg-orange-100 dark:bg-orange-900',
      rows: 6, // Model, Processor, Memory, Storage, Graphics, Display
      twoColumn: false
    },
    { 
      title: 'Management', 
      subtitle: 'Device management status',
      icon: 'shield',
      iconColor: 'bg-yellow-100 dark:bg-yellow-900',
      rows: 5, // MDM Status, Enrollment, Server, Profiles, Organization
      twoColumn: false
    },
    { 
      title: 'Security', 
      subtitle: 'Security and compliance status',
      icon: 'lock',
      iconColor: 'bg-red-100 dark:bg-red-900',
      rows: 6, // Firewall, Encryption, Updates, Antivirus, Gatekeeper, SIP
      twoColumn: false
    },
    { 
      title: 'Network', 
      subtitle: 'Network connectivity information',
      icon: 'wifi',
      iconColor: 'bg-teal-100 dark:bg-teal-900',
      rows: 6, // IP Address, MAC, WiFi, Connection Type, DNS, Gateway
      twoColumn: false
    }
  ]
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {widgets.map((widget, widgetIndex) => (
        <div key={widgetIndex} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Widget Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`w-10 h-10 ${widget.iconColor} rounded-lg flex items-center justify-center animate-pulse`} 
                   style={{ animationDelay: `${widgetIndex * 0.1}s` }}>
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
              <div className="flex-1">
                {/* Title */}
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" 
                     style={{ animationDelay: `${widgetIndex * 0.1 + 0.05}s` }}></div>
                {/* Subtitle */}
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
                     style={{ animationDelay: `${widgetIndex * 0.1 + 0.1}s` }}></div>
              </div>
            </div>
          </div>
          
          {/* Widget Content */}
          <div className="px-6 py-4">
            <div className="space-y-4">
              {widget.twoColumn ? (
                // Two-column layout for Inventory widget
                <div className="grid grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-4">
                    {Array.from({ length: Math.ceil(widget.rows / 2) }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className={`h-3 ${fieldWidths[i % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                             style={{ animationDelay: `${widgetIndex * 0.1 + i * 0.05}s` }}></div>
                        <div className={`h-4 ${valueWidths[i % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                             style={{ animationDelay: `${widgetIndex * 0.1 + i * 0.05 + 0.025}s` }}></div>
                      </div>
                    ))}
                  </div>
                  {/* Right column */}
                  <div className="space-y-4">
                    {Array.from({ length: Math.floor(widget.rows / 2) }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className={`h-3 ${fieldWidths[(i + 3) % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                             style={{ animationDelay: `${widgetIndex * 0.1 + (i + 3) * 0.05}s` }}></div>
                        <div className={`h-4 ${valueWidths[(i + 3) % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                             style={{ animationDelay: `${widgetIndex * 0.1 + (i + 3) * 0.05 + 0.025}s` }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Single column layout for other widgets
                <div className="space-y-4">
                  {Array.from({ length: widget.rows }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className={`h-3 ${fieldWidths[i % fieldWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                           style={{ animationDelay: `${widgetIndex * 0.1 + i * 0.05}s` }}></div>
                      <div className={`h-4 ${valueWidths[i % valueWidths.length]} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} 
                           style={{ animationDelay: `${widgetIndex * 0.1 + i * 0.05 + 0.025}s` }}></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function HardwareTabSkeleton({ isMac }: { isMac?: boolean }) {
  // If isMac is undefined, show unified layout (default to Mac-like for modern hardware)
  const showUnified = isMac !== false
  
  return (
    <div className="space-y-6">
      {/* System info skeleton */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-gray-500 dark:text-gray-400">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="text-gray-300 dark:text-gray-600">›</div>
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="text-gray-300 dark:text-gray-600">›</div>
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>

      {showUnified ? (
        /* Unified Memory Architecture Layout (Mac) */
        <>
          {/* Chip title */}
          <div className="mb-3 ml-8 flex items-baseline gap-2">
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* 50/50 split layout */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Left side - Unified chip container with dashed border */}
            <div className="col-span-2 bg-gray-100 dark:bg-gray-900/50 rounded-2xl p-4 border-2 border-gray-200 dark:border-gray-700 border-dashed">
              <div className="grid grid-cols-2 gap-4">
                {/* CPU Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-red-200 dark:bg-red-900 rounded animate-pulse"></div>
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Memory Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-yellow-200 dark:bg-yellow-900 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* GPU Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-green-200 dark:bg-green-900 rounded animate-pulse"></div>
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* NPU Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-pink-200 dark:bg-pink-900 rounded animate-pulse"></div>
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Right side - Other cards without border */}
            <div className="col-span-2 p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Storage Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-blue-200 dark:bg-blue-900 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Battery Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-green-200 dark:bg-green-900 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Wireless Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-cyan-200 dark:bg-cyan-900 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Bluetooth Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-indigo-200 dark:bg-indigo-900 rounded animate-pulse"></div>
                    <div className="h-4 w-18 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Non-Unified Layout (Windows) */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Processor', 'Memory', 'Storage', 'Graphics', 'Battery', 'Wireless', 'Bluetooth', 'Network'].map((title, i) => (
            <div key={title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-5 h-5 rounded animate-pulse ${
                  i === 0 ? 'bg-red-200 dark:bg-red-900' :
                  i === 1 ? 'bg-yellow-200 dark:bg-yellow-900' :
                  i === 2 ? 'bg-blue-200 dark:bg-blue-900' :
                  i === 3 ? 'bg-green-200 dark:bg-green-900' :
                  i === 4 ? 'bg-green-200 dark:bg-green-900' :
                  i === 5 ? 'bg-cyan-200 dark:bg-cyan-900' :
                  i === 6 ? 'bg-indigo-200 dark:bg-indigo-900' :
                  'bg-purple-200 dark:bg-purple-900'
                }`}></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      )}

      {/* Display cards skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-purple-200 dark:bg-purple-900 rounded animate-pulse"></div>
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-end gap-12 mb-3">
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-blue-200 dark:bg-blue-900 rounded-full animate-pulse"></div>
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storage Analysis skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Battery Information table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Cycle Count', 'Health', 'Charge Status', 'Runtime', 'Temperature'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800">
              <tr>
                {[1, 2, 3, 4, 5].map((i) => (
                  <td key={i} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Memory Modules table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Location', 'Type', 'Capacity', 'Speed', 'Manufacturer'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2].map((i) => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function SystemTabSkeleton() {
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

export function ManagementTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with Icon and Provider - matches actual layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Shield icon skeleton */}
          <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-800 rounded-lg animate-pulse"></div>
          <div>
            {/* Title */}
            <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            {/* Subtitle */}
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        {/* Provider - Top Right */}
        <div className="text-right mr-8">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Top Row - Split 60/40 between Enrollment and Certificate */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Card - Enrollment (60% - 3 columns) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Enrollment header */}
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6"></div>
          
          {/* Enrollment Status pills */}
          <div className="space-y-4 mb-6">
            {/* Enrollment Status */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-7 w-20 bg-green-100 dark:bg-green-900 rounded-full animate-pulse"></div>
            </div>
            {/* Enrollment Type */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-7 w-40 bg-green-100 dark:bg-green-900 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Device Details */}
          <div className="mb-6">
            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
            <div className="space-y-4">
              {/* Organization */}
              <div className="flex items-start">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-3"></div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Enrollment Details */}
          <div>
            <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
            {/* Grid of status pills */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {['ADE Enrolled', 'User Approved', 'ADE Capable', 'SCEP Certificate'].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-green-100 dark:bg-green-900 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
                </div>
              ))}
            </div>
            
            {/* Server URLs */}
            <div className="space-y-4 pt-2">
              {/* Server URL */}
              <div className="flex flex-col gap-1">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-8 w-full bg-gray-50 dark:bg-gray-900 rounded animate-pulse"></div>
              </div>
              {/* Check-in URL */}
              <div className="flex flex-col gap-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-8 w-full bg-gray-50 dark:bg-gray-900 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* Push Notification */}
          <div>
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
            <div className="flex flex-col gap-1">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-full bg-gray-50 dark:bg-gray-900 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Right Card - Certificate (40% - 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Certificate Header with Seal Icon */}
          <div className="flex items-start gap-4 mb-6">
            {/* Large Seal Icon */}
            <div className="w-12 h-12 text-yellow-500 dark:text-yellow-400">
              <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-800 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="space-y-4">
            {/* Certificate Name */}
            <div>
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Subject */}
            <div>
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-4 w-52 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Issued By */}
            <div>
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Expires */}
            <div>
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-4 w-32 bg-green-200 dark:bg-green-900 rounded animate-pulse"></div>
            </div>

            {/* SCEP Server */}
            <div>
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-4 w-full bg-gray-50 dark:bg-gray-900 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InstallsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        {/* Last Run - Top Right */}
        <div className="text-right mr-8">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Configuration Card - Single large card with 6 items in 3 columns */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex gap-8 items-end">
          {/* Column 1 - 45% - Manifest & Repo */}
          <div className="flex-[0_0_45%] space-y-4">
            <div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded border animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            </div>
            <div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded border animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>

          {/* Column 2 - 25% - Run Type & Version - Center Aligned */}
          <div className="flex-[0_0_25%] space-y-4 text-center">
            <div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 mx-auto"></div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto" style={{ animationDelay: '0.3s' }}></div>
            </div>
            <div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 mx-auto"></div>
              <div className="h-10 w-32 bg-gray-100 dark:bg-gray-700 rounded border animate-pulse mx-auto" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>

          {/* Column 3 - 25% - Duration & Last Seen - Right Aligned */}
          <div className="flex-[0_0_25%] space-y-4 text-right pr-[2%]">
            <div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 ml-auto"></div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1 ml-auto"></div>
              <div className="h-10 w-40 bg-gray-100 dark:bg-gray-700 rounded border animate-pulse ml-auto" style={{ animationDelay: '0.6s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Managed Installs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Managed Items: X Cache: Y MB */}
              <div className="flex items-center gap-2">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-5 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Status Filters */}
            <div className="flex items-center gap-2">
              {['All', 'Installed', 'Pending', 'Warning', 'Error', 'Removed'].map((filter, i) => (
                <div key={filter} className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" 
                     style={{ animationDelay: `${i * 0.05}s` }}></div>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Package', 'Version', 'Status', 'Last Update'].map((header, i) => (
                  <th key={header} className="px-6 py-3 text-left">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
                         style={{ animationDelay: `${i * 0.05}s` }}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
                         style={{ animationDelay: `${i * 0.1}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
                         style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" 
                         style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" 
                         style={{ animationDelay: `${i * 0.1 + 0.3}s` }}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function ProfilesTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Total Profiles', 'Configuration', 'Device Restrictions'].map((stat, i) => (
          <div key={stat} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" style={{ animationDelay: `${i * 0.1}s` }}></div>
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.2}s` }}></div>
          </div>
        ))}
      </div>

      {/* Profile list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" style={{ animationDelay: `${i * 0.05}s` }}></div>
                  <div className="h-3 w-60 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.05 + 0.025}s` }}></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.05 + 0.05}s` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ApplicationsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with icon and total count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="text-right">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
          <div className="h-8 w-16 bg-blue-200 dark:bg-blue-900 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Usage Summary Cards - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
              <div className="flex-1">
                <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" style={{ animationDelay: `${i * 0.1 + 0.05}s` }}></div>
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Apps by Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="flex gap-4 mt-1">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Name', 'Version', 'Publisher', 'Usage'].map((header, i) => (
                  <th key={header} className="px-6 py-3 text-left">
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.05}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.1}s` }}></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.1 + 0.15}s` }}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function SecurityTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="text-right mr-8">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>

      {/* 3x2 Grid of Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Protection', 'Firewall', 'Encryption', 'Authentication', 'TPM', 'Secure Shell'].map((feature) => (
          <div key={feature} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-1">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NetworkTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg animate-pulse"></div>
          <div>
            <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="text-right mr-8">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
          <div className="h-8 w-24 bg-teal-200 dark:bg-teal-900 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Hostname Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 pl-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="text-right">
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* 70/30 Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - 70% - Active Connections */}
        <div className="lg:w-[70%] space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              {/* Connection Header */}
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  <div>
                    <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-7 w-24 bg-green-100 dark:bg-green-900/30 rounded-full animate-pulse"></div>
              </div>
              {/* Connection Body */}
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - 30% - Secondary Info */}
        <div className="lg:w-[30%] space-y-4">
          {/* VPN Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg animate-pulse"></div>
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-9 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Network Quality Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg animate-pulse"></div>
              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved WiFi Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 px-4 flex items-center border-b border-gray-100 dark:border-gray-700">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EventsTabSkeleton() {
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

export function PeripheralsTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Horizontal Category Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-md bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${i * 0.05 + 0.025}s` }}></div>
              </div>
              <div className="h-5 w-6 bg-gray-200 dark:bg-gray-600 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.05 + 0.05}s` }}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-8">
        {/* Section Header */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-blue-200 dark:bg-blue-900 rounded animate-pulse"></div>
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Device Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Card Header */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              {/* Card Body */}
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
