"use client"

// Force dynamic rendering and disable caching for dynamic device page
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { formatRelativeTime } from "../../../src/lib/time"
import { identifyDeviceIdentifierType, resolveDeviceIdentifier } from "../../../src/lib/deviceResolver"
// Import SMART loading hook (V2 - parallel loading)
import { useSmartDeviceLoading } from "../../../src/hooks/useSmartDeviceLoading"
import { 
  InfoTab,
  InstallsTab,
  ProfilesTab,
  ApplicationsTab,
  ManagementTab,
  SystemTab,
  HardwareTab,
  NetworkTab,
  SecurityTab,
  EventsTab,
  PeripheralsTab
} from "../../../src/components/tabs"
import { DeviceDetailSkeleton } from "../../../src/components/skeleton/DeviceDetailSkeleton"
import { ModuleLoadingState } from "../../../src/components/ModuleLoadingState"

// Overflow Tabs Dropdown Component
interface OverflowTabsDropdownProps {
  tabs: { id: TabType; label: string; icon: string; description: string; accentColor: string }[]
  activeTab: string
  onTabChange: (tabId: TabType) => void
}

function OverflowTabsDropdown({ tabs, activeTab, onTabChange }: OverflowTabsDropdownProps) {
  const [showOverflow, setShowOverflow] = useState(false)
  const activeInOverflow = tabs.some(tab => tab.id === activeTab)
  
  // Find the active tab to get its accent color
  const activeTabInOverflow = tabs.find(tab => tab.id === activeTab)
  const activeAccentColor = activeTabInOverflow?.accentColor || 'blue'
  
  // Helper function to get overflow dropdown accent colors
  const getDropdownAccentColors = (accentColor: string, _isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      orange: {
        active: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      purple: {
        active: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      emerald: {
        active: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      red: {
        active: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      teal: {
        active: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      indigo: {
        active: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      cyan: {
        active: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      violet: {
        active: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      gray: {
        active: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      yellow: {
        active: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      },
      monochrome: {
        active: 'text-black dark:text-white bg-gray-50 dark:bg-gray-900/20',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }
    }
    
    return colorMap[accentColor as keyof typeof colorMap] || colorMap.blue
  }
  
  // Get accent colors for "More" button border
  const getMoreButtonAccentColors = (accentColor: string, isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'border-blue-500 text-blue-600 dark:text-blue-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      orange: {
        active: 'border-orange-500 text-orange-600 dark:text-orange-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      purple: {
        active: 'border-purple-500 text-purple-600 dark:text-purple-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      emerald: {
        active: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      red: {
        active: 'border-red-500 text-red-600 dark:text-red-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      teal: {
        active: 'border-teal-500 text-teal-600 dark:text-teal-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      indigo: {
        active: 'border-indigo-500 text-indigo-600 dark:text-indigo-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      cyan: {
        active: 'border-cyan-500 text-cyan-600 dark:text-cyan-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      violet: {
        active: 'border-violet-500 text-violet-600 dark:text-violet-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      gray: {
        active: 'border-gray-500 text-gray-600 dark:text-gray-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      monochrome: {
        active: 'border-gray-500 text-black dark:text-white',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      }
    }
    
    return colorMap[accentColor as keyof typeof colorMap]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive']
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowOverflow(!showOverflow)}
        className={`group relative flex items-center justify-center w-12 h-12 border-b-2 font-medium text-sm transition-all duration-200 ${
          getMoreButtonAccentColors(activeAccentColor, activeInOverflow)
        }`}
        title="More tabs"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        
        {/* Hover label */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          More
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      </button>

      {/* Dropdown menu */}
      {showOverflow && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowOverflow(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const colors = getDropdownAccentColors(tab.accentColor, isActive)
              
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id)
                    setShowOverflow(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    isActive
                      ? colors.active
                      : `text-gray-700 dark:text-gray-300 ${colors.hover}`
                  }`}
                  title={tab.description}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

type TabType = 'info' | 'installs' | 'profiles' | 'applications' | 'management' | 'system' | 'hardware' | 'network' | 'security' | 'peripherals' | 'events'

const tabs: { id: TabType; label: string; icon: string; description: string; accentColor: string }[] = [
  { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Device information, management status, and system details', accentColor: 'monochrome' },
  { id: 'installs', label: 'Installs', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', description: 'Managed software installations and updates', accentColor: 'emerald' },
  { id: 'applications', label: 'Applications', icon: 'M19 12.2H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V10.2a2 2 0 00-2-2M5 12.2V10.2a2 2 0 012-2m0 0V6.2a2 2 0 012-2h6a2 2 0 012 2v2M7 8.2h10', description: 'Installed applications and packages', accentColor: 'blue' },
  { id: 'profiles', label: 'Profiles', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', description: 'MDM configuration profiles and settings', accentColor: 'violet' },
  { id: 'management', label: 'Management', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', description: 'Device management and enrollment status', accentColor: 'yellow' },
  { id: 'hardware', label: 'Hardware', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', description: 'Hardware specifications and performance', accentColor: 'orange' },
  { id: 'peripherals', label: 'Peripherals', icon: 'M8.8 3.2h6.4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1zM8.8 7.2h6.4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2zM10.4 17.2h3.2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z', description: 'Displays, printers, and connected peripherals', accentColor: 'cyan' },
  { id: 'system', label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', description: 'Operating system and system information', accentColor: 'purple' },
  { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', description: 'Security status and compliance', accentColor: 'red' },
  { id: 'network', label: 'Network', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', description: 'Network connectivity and settings', accentColor: 'teal' },
  { id: 'events', label: 'Events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Event history and activity log', accentColor: 'monochrome' }
]

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.deviceId as string
  
  // 🚀 SMART DEVICE LOADING V2 - InfoTab fast, then parallel background loading
  const {
    deviceInfo,
    infoLoading,
    infoError,
    allModulesLoaded,
    requestModule,
    isModuleLoaded,
    isModuleLoading,
    isModuleError,
    getModuleData,
    getModuleError
  } = useSmartDeviceLoading(deviceId)
  
  // Get initial tab from hash
  const getInitialTab = (): TabType => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '') as TabType
      if (tabs.some(tab => tab.id === hash)) {
        return hash
      }
    }
    return 'info'
  }
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab())
  
  // UI State
  const [visibleTabsCount, setVisibleTabsCount] = useState(tabs.length)
  const tabsContainerRef = useRef<HTMLElement>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  
  // Helper function to get accent color classes for tabs
  const getTabAccentColors = (accentColor: string, isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'border-blue-500 text-blue-600 dark:text-blue-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      orange: {
        active: 'border-orange-500 text-orange-600 dark:text-orange-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      purple: {
        active: 'border-purple-500 text-purple-600 dark:text-purple-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      emerald: {
        active: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      red: {
        active: 'border-red-500 text-red-600 dark:text-red-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      teal: {
        active: 'border-teal-500 text-teal-600 dark:text-teal-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      indigo: {
        active: 'border-indigo-500 text-indigo-600 dark:text-indigo-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      cyan: {
        active: 'border-cyan-500 text-cyan-600 dark:text-cyan-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      violet: {
        active: 'border-violet-500 text-violet-600 dark:text-violet-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      gray: {
        active: 'border-gray-500 text-gray-600 dark:text-gray-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      yellow: {
        active: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      },
      monochrome: {
        active: 'border-gray-500 text-black dark:text-white',
        inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      }
    }
    
    return colorMap[accentColor as keyof typeof colorMap]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive']
  }

  // Helper function to get hover accent colors for tabs (colors appear on hover)
  const getHoverAccentColors = (accentColor: string) => {
    const hoverColorMap = {
      blue: 'hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600',
      orange: 'hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600',
      purple: 'hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600',
      emerald: 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600',
      red: 'hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600',
      teal: 'hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-300 dark:hover:border-teal-600',
      indigo: 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600',
      cyan: 'hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-300 dark:hover:border-cyan-600',
      violet: 'hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-600',
      gray: 'hover:text-gray-600 dark:hover:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
      yellow: 'hover:text-yellow-600 dark:hover:text-yellow-400 hover:border-yellow-300 dark:hover:border-yellow-600',
      monochrome: 'hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
    }
    
    return hoverColorMap[accentColor as keyof typeof hoverColorMap] || hoverColorMap.blue
  }
  
  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace('#', '') as TabType
        console.log('🧭 HASH NAVIGATION DEBUG:', {
          currentHash: hash,
          currentActiveTab: activeTab,
          validTabs: tabs.map(t => t.id),
          isValidHash: hash && tabs.some(tab => tab.id === hash)
        })
        if (hash && tabs.some(tab => tab.id === hash)) {
          console.log('🧭 Setting activeTab to:', hash)
          setActiveTab(hash)
        }
      }
    }
    
    // Set initial tab from URL hash
    handleHashChange()
    
    // Listen for hash changes
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [activeTab])

  // Dynamic overflow detection based on container width
  useEffect(() => {
    const calculateVisibleTabs = () => {
      if (!tabsContainerRef.current) return

      const container = tabsContainerRef.current
      const containerWidth = container.clientWidth
      
      // Only calculate if container has a width
      if (containerWidth === 0) return
      
      // Icon-only layout: fixed width calculations for larger tabs
      const tabWidth = 56 // p-3.5 = 14px padding * 2 + w-6 icon = 28px = 56px total approx
      const gapWidth = 8 // space-x-2 = 8px between tabs (based on nav spacing)
      const moreButtonWidth = 60 // approximate width of "More" button
      
      // Calculate total width needed for all tabs (without More button)
      const totalTabsWidth = (tabs.length * tabWidth) + ((tabs.length - 1) * gapWidth)
      
      // If all tabs fit without overflow, show them all
      if (totalTabsWidth <= containerWidth) {
        setVisibleTabsCount(tabs.length)
        return
      }
      
      // Only use overflow when tabs actually don't fit
      // Calculate how many tabs can fit with space for "More" button
      const availableWidth = containerWidth - moreButtonWidth - gapWidth
      
      let fittableTabs = 0
      for (let i = 0; i < tabs.length; i++) {
        const widthForTabs = (i + 1) * tabWidth + (i * gapWidth)
        if (widthForTabs <= availableWidth) {
          fittableTabs = i + 1
        } else {
          break
        }
      }
      
      // Ensure at least 3 tabs are visible for good UX
      const finalVisibleCount = Math.max(3, Math.min(fittableTabs, tabs.length))
      setVisibleTabsCount(finalVisibleCount)
    }

    // Initial calculation
    calculateVisibleTabs()
    
    // Recalculate on window resize
    const handleResize = () => {
      setTimeout(calculateVisibleTabs, 100) // Debounce slightly
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, []) // Remove visibleTabsCount dependency to avoid infinite loops
  
  // Update URL when tab changes
  const _renderConfigurationFields = (config: Record<string, unknown>) => {
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
        value: formatRelativeTime(String(config.lastRun || config.LastCheckDate || '')),
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
                  {String(field.value || 'N/A')}
                </div>
              </div>
            )
          } else {
            return (
              <div key={field.key} className="flex justify-between items-center px-4 py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{field.label}</span>
                <div className="text-right">
                  <div className={`text-sm text-gray-900 dark:text-white font-semibold ${field.capitalize ? 'capitalize' : ''}`}>
                    {String(field.value || 'N/A')}
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

  // 🎯 Tab change handler with on-demand module loading
  const handleTabChange = async (tabId: TabType) => {
    setActiveTab(tabId)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `#${tabId}`)
    }
    
    // Request module if not already loaded (on-demand loading)
    if (tabId !== 'info' && !isModuleLoaded(tabId)) {
      console.log(`[SMART LOAD] 🎯 On-demand loading for tab: ${tabId}`)
      try {
        await requestModule(tabId)
      } catch (error) {
        console.error(`[SMART LOAD] ❌ On-demand load failed for ${tabId}:`, error)
      }
    }
  }
  
  // Device identifier resolution effect
  useEffect(() => {
    const resolveAndRedirect = async () => {
      // Check if this is already a serial number
      const identifierType = identifyDeviceIdentifierType(deviceId)
      
      if (identifierType === 'serialNumber') {
        setIsResolving(false)
        return // This is already a serial number, no need to resolve
      }
      
      // This is a UUID or Asset Tag, we need to resolve it
      setIsResolving(true)
      
      try {
        const result = await resolveDeviceIdentifier(deviceId)
        
        if (result.found && result.serialNumber) {
          // Redirect to the serial number-based URL
          router.replace(`/device/${encodeURIComponent(result.serialNumber)}`)
          return
        } else {
          // Device not found
          setIsResolving(false)
          return
        }
      } catch (error) {
        console.error('[DEVICE DETAIL] Error resolving device identifier:', error)
        setIsResolving(false)
        return
      }
    }
    
    resolveAndRedirect()
  }, [deviceId, router])

  // NOTE: Old data fetching useEffect REMOVED
  // Progressive loading hook handles all data fetching now

  // Early returns AFTER all useEffects are defined
  if (infoLoading || isResolving) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <DeviceDetailSkeleton />
      </div>
    )
  }
  
  if (infoError || !deviceInfo) {
    // Show error if info fetch failed
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {infoError === 'Device not found' ? 'Device Not Found' : 'Error Loading Device'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {infoError === 'Device not found' 
              ? `The device "${deviceId}" could not be found.` 
              : `Failed to load device information: ${infoError}`}
          </p>
          <Link
            href="/devices"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← Back to Devices
          </Link>
        </div>
      </div>
    )
  }

  const _getEventStatusConfig = (kind: string) => {
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

  const handleCopyShareableLink = async () => {
    try {
      // Get the preferred identifier (asset tag first, then serial number)
      const assetTag = deviceInfo.assetTag || deviceInfo.modules?.inventory?.assetTag
      const serialNumber = deviceInfo.serialNumber || deviceInfo.modules?.inventory?.serialNumber
      const preferredIdentifier = assetTag || serialNumber
      
      if (!preferredIdentifier) {
        console.warn('No asset tag or serial number available for sharing')
        return
      }
      
      // Build the shareable URL using the current origin/domain
      const currentUrl = window.location
      const shareableUrl = `${currentUrl.protocol}//${currentUrl.host}/device/${encodeURIComponent(preferredIdentifier)}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl)
      
      // Show success feedback
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      
      console.log('Copied shareable link:', shareableUrl)
    } catch (error) {
      console.error('Failed to copy link:', error)
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
                {/* Devices back button - hidden on mobile */}
                <Link
                  href="/devices"
                  className="hidden sm:flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 pt-6 pb-6 sm:pt-0 sm:pb-0">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    {deviceInfo.name}
                  </h1>
                  
                  {/* Asset tag and serial - below device name on mobile, inline on desktop */}
                  <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    {(deviceInfo.assetTag || deviceInfo.modules?.inventory?.assetTag) && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 min-w-[80px] justify-center">
                        {deviceInfo.assetTag || deviceInfo.modules?.inventory?.assetTag}
                      </span>
                    )}
                    {(deviceInfo.serialNumber || deviceInfo.modules?.inventory?.serialNumber) && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 min-w-[80px] justify-center">
                        {deviceInfo.serialNumber || deviceInfo.modules?.inventory?.serialNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Last seen and action buttons - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-4 pr-4">
                <div className="flex items-center gap-2 text-2sm text-gray-600 dark:text-gray-400">
                  {/* Subtle version indicator dot */}
                  {deviceInfo.clientVersion && (
                    <div className="group relative">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 cursor-help" />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        ReportMate v{deviceInfo.clientVersion}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}
                  <span>Last seen {formatRelativeTime(deviceInfo.lastSeen)}</span>
                </div>
                
                {/* Remote access button */}
                {(() => {
                  // Get active network interface IP address
                  const getActiveIPAddress = () => {
                    // Check for active network interface first
                    if (deviceInfo.modules?.network?.interfaces) {
                      const activeInterface = deviceInfo.modules.network.interfaces.find((iface: any) => 
                        iface.isActive && iface.ipAddresses && iface.ipAddresses.length > 0
                      )
                      if (activeInterface) {
                        // Find IPv4 address (not IPv6)
                        const ipv4 = activeInterface.ipAddresses.find((ip: string) => 
                          /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
                        )
                        if (ipv4) return ipv4
                      }
                    }
                    
                    // Fallback to processed network data
                    return deviceInfo.network?.ipAddress || deviceInfo.ipAddress
                  }
                  
                  // Get OS platform for protocol selection
                  const getRemoteProtocol = () => {
                    // Try multiple paths for OS information
                    const os = deviceInfo.os || 
                              deviceInfo.system?.operatingSystem?.name || 
                              deviceInfo.modules?.system?.operatingSystem?.name || 
                              deviceInfo.modules?.system?.operatingSystem?.productName || ''
                    
                    const osLower = os.toLowerCase()
                    
                    if (osLower.includes('windows')) {
                      return 'rdp'
                    } else if (osLower.includes('mac') || osLower.includes('darwin') || osLower.includes('macos')) {
                      return 'vnc'
                    }
                    
                    // No fallback - return null for unknown platforms
                    return null
                  }
                  
                  const ipAddress = getActiveIPAddress()
                  const protocol = getRemoteProtocol()
                  
                  // Only show if we have both IP address and known platform
                  if (!ipAddress || !protocol) return null
                  
                  return (
                    <button
                      onClick={() => {
                        const remoteUrl = `${protocol}://${ipAddress}`
                        window.location.href = remoteUrl
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900 dark:hover:text-purple-300"
                      title={`Connect via ${protocol.toUpperCase()} to ${ipAddress}`}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10 10h4"/>
                        <path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3"/>
                        <path d="M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z"/>
                        <path d="M 22 16 L 2 16"/>
                        <path d="M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z"/>
                        <path d="M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3"/>
                      </svg>
                      <span>Remote</span>
                    </button>
                  )
                })()}
                
                {/* Copy shareable link button */}
                <button
                  onClick={handleCopyShareableLink}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    copySuccess 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900 dark:hover:text-yellow-300'
                  }`}
                  title={`Copy shareable link using ${(deviceInfo.assetTag || deviceInfo.modules?.inventory?.assetTag) ? 'asset tag' : 'serial number'}`}
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span>Link</span>
                    </>
                  )}
                </button>
                
                {/* Subtle loading indicator when background modules are loading */}
                {!allModulesLoaded && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading modules...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Desktop tabs - Icon + Hover Labels (always collapsed, expands on hover) */}
            <nav ref={tabsContainerRef} className="hidden sm:flex -mb-px space-x-2 md:space-x-4 lg:space-x-6 xl:space-x-8 justify-start">
              {/* Dynamically visible tabs based on container width */}
              {tabs.slice(0, visibleTabsCount).map((tab) => {
                const isActive = activeTab === tab.id
                
                return (
                  <div key={tab.id} className="relative group">
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={`tab-button flex items-center justify-center p-3.5 border-b-2 font-medium text-sm transition-all duration-200 ease-in-out flex-shrink-0 rounded-t-lg ${
                        isActive 
                          ? getTabAccentColors(tab.accentColor, true)
                          : `border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 ${getHoverAccentColors(tab.accentColor)}`
                      }`}
                      title={tab.description}
                    >
                      <svg className="w-6 h-6 flex-shrink-0 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                      </svg>
                      {/* Text that always starts collapsed but expands on hover */}
                      <span className="tab-label-transition overflow-hidden whitespace-nowrap max-w-0 opacity-0 ml-0 group-hover:max-w-32 group-hover:opacity-100 group-hover:ml-2 transition-all duration-200">
                        {tab.label}
                      </span>
                    </button>
                  </div>
                )
              })}

              {/* Overflow dropdown for remaining tabs */}
              {tabs.length > visibleTabsCount && (
                <OverflowTabsDropdown 
                  tabs={tabs.slice(visibleTabsCount)}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
              )}
            </nav>

            {/* Mobile dropdown */}
            <div className="sm:hidden pt-4 pb-4">
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => handleTabChange(e.target.value as TabType)}
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
        {/* Info Tab - Always loaded fast */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <InfoTab device={deviceInfo} />
        </div>

        {/* Installs Tab - Progressive loading */}
        <div className={activeTab === 'installs' ? 'block' : 'hidden'}>
          {isModuleLoading('installs') ? (
            <ModuleLoadingState 
              moduleName="installs" 
              state="loading" 
              icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
              accentColor="emerald"
            />
          ) : isModuleError('installs') ? (
            <ModuleLoadingState 
              moduleName="installs" 
              state="error" 
              error={getModuleError('installs')}
              icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
              accentColor="emerald"
              onRetry={() => requestModule('installs')}
            />
          ) : isModuleLoaded('installs') ? (
            <InstallsTab device={deviceInfo} data={getModuleData('installs')} />
          ) : (
            <ModuleLoadingState 
              moduleName="installs" 
              state="loading" 
              icon="M12 6v6m0 0v6m0-6h6m-6 0H6"
              accentColor="emerald"
            />
          )}
        </div>

        {/* Profiles Tab - Progressive loading */}
        <div className={activeTab === 'profiles' ? 'block' : 'hidden'}>
          {isModuleLoading('profiles') ? (
            <ModuleLoadingState 
              moduleName="profiles" 
              state="loading" 
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              accentColor="indigo"
            />
          ) : isModuleError('profiles') ? (
            <ModuleLoadingState 
              moduleName="profiles" 
              state="error" 
              error={getModuleError('profiles')}
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              accentColor="indigo"
              onRetry={() => requestModule('profiles')}
            />
          ) : isModuleLoaded('profiles') ? (
            <ProfilesTab device={deviceInfo} data={getModuleData('profiles')} />
          ) : (
            <ModuleLoadingState 
              moduleName="profiles" 
              state="loading" 
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              accentColor="indigo"
            />
          )}
        </div>

        {/* Applications Tab - Progressive loading */}
        <div className={activeTab === 'applications' ? 'block' : 'hidden'}>
          {isModuleLoading('applications') ? (
            <ModuleLoadingState 
              moduleName="applications" 
              state="loading" 
              icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              accentColor="blue"
            />
          ) : isModuleError('applications') ? (
            <ModuleLoadingState 
              moduleName="applications" 
              state="error" 
              error={getModuleError('applications')}
              icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              accentColor="blue"
              onRetry={() => requestModule('applications')}
            />
          ) : isModuleLoaded('applications') ? (
            <ApplicationsTab device={deviceInfo} data={getModuleData('applications')} />
          ) : (
            <ModuleLoadingState 
              moduleName="applications" 
              state="loading" 
              icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              accentColor="blue"
            />
          )}
        </div>

        {/* Management Tab - Already in info, just display */}
        <div className={activeTab === 'management' ? 'block' : 'hidden'}>
          <ManagementTab device={deviceInfo as unknown as Record<string, unknown>} />
        </div>

        {/* System Tab - Progressive loading */}
        <div className={activeTab === 'system' ? 'block' : 'hidden'}>
          {isModuleLoading('system') ? (
            <ModuleLoadingState 
              moduleName="system" 
              state="loading" 
              icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              accentColor="purple"
            />
          ) : isModuleError('system') ? (
            <ModuleLoadingState 
              moduleName="system" 
              state="error" 
              error={getModuleError('system')}
              icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              accentColor="purple"
              onRetry={() => requestModule('system')}
            />
          ) : isModuleLoaded('system') ? (
            <SystemTab device={{ ...deviceInfo, id: deviceInfo.deviceId }} data={getModuleData('system') as unknown as Record<string, unknown>} />
          ) : (
            <ModuleLoadingState 
              moduleName="system" 
              state="loading" 
              icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              accentColor="purple"
            />
          )}
        </div>

        {/* Hardware Tab - Already in info, just display */}
        <div className={activeTab === 'hardware' ? 'block' : 'hidden'}>
          <HardwareTab device={deviceInfo as any} />
        </div>

        {/* Network Tab - Progressive loading */}
        <div className={activeTab === 'network' ? 'block' : 'hidden'}>
          {isModuleLoading('network') ? (
            <ModuleLoadingState 
              moduleName="network" 
              state="loading" 
              icon="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              accentColor="teal"
            />
          ) : isModuleError('network') ? (
            <ModuleLoadingState 
              moduleName="network" 
              state="error" 
              error={getModuleError('network')}
              icon="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              accentColor="teal"
              onRetry={() => requestModule('network')}
            />
          ) : isModuleLoaded('network') ? (
            <NetworkTab device={deviceInfo} data={getModuleData('network')} />
          ) : (
            <ModuleLoadingState 
              moduleName="network" 
              state="loading" 
              icon="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              accentColor="teal"
            />
          )}
        </div>

        {/* Security Tab - Progressive loading */}
        <div className={activeTab === 'security' ? 'block' : 'hidden'}>
          {isModuleLoading('security') ? (
            <ModuleLoadingState 
              moduleName="security" 
              state="loading" 
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              accentColor="red"
            />
          ) : isModuleError('security') ? (
            <ModuleLoadingState 
              moduleName="security" 
              state="error" 
              error={getModuleError('security')}
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              accentColor="red"
              onRetry={() => requestModule('security')}
            />
          ) : isModuleLoaded('security') ? (
            <SecurityTab device={deviceInfo} />
          ) : (
            <ModuleLoadingState 
              moduleName="security" 
              state="loading" 
              icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              accentColor="red"
            />
          )}
        </div>

        {/* Peripherals Tab - Already in info, just display */}
        <div className={activeTab === 'peripherals' ? 'block' : 'hidden'}>
          <PeripheralsTab device={{ ...deviceInfo, id: deviceInfo.deviceId }} />
        </div>

        {/* Events Tab - Progressive loading */}
        <div className={activeTab === 'events' ? 'block' : 'hidden'}>
          {isModuleLoading('events') ? (
            <ModuleLoadingState 
              moduleName="events" 
              state="loading" 
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              accentColor="monochrome"
            />
          ) : isModuleError('events') ? (
            <ModuleLoadingState 
              moduleName="events" 
              state="error" 
              error={getModuleError('events')}
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              accentColor="monochrome"
              onRetry={() => requestModule('events')}
            />
          ) : isModuleLoaded('events') ? (
            <EventsTab device={deviceInfo as any} events={Array.isArray(getModuleData('events')) ? getModuleData('events') : []} data={getModuleData('events') as unknown as Record<string, unknown>} />
          ) : (
            <ModuleLoadingState 
              moduleName="events" 
              state="loading" 
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              accentColor="monochrome"
            />
          )}
        </div>
      </div>
    </div>
  )
}
