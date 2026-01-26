"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { DevicePageNavigation } from "./DevicePageNavigation"
import { DeviceSearchField } from "../search/DeviceSearchField"
import { SearchModal } from "../search/SearchModal"
import { PlatformToggle } from "../ui/PlatformToggle"

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  assetTag?: string
  hostname?: string
  status: string
}

interface AppToolbarProps {
  preloadedDevices?: Device[]
}

export function AppToolbar({ preloadedDevices = [] }: AppToolbarProps) {
  const pathname = usePathname()
  const [showSearchModal, setShowSearchModal] = useState(false)

  // Determine current page for navigation highlighting
  const getCurrentPage = () => {
    if (pathname === '/devices') return 'devices'
    if (pathname === '/events') return 'events'
    if (pathname === '/dashboard' || pathname === '/') return 'dashboard'
    return null
  }

  // Hide platform filter on individual device pages (/device/[serialNumber])
  // Show on: /dashboard, /devices, /devices/*, /events
  const showPlatformFilter = !pathname.match(/^\/device\/[^/]+$/)

  // Global keyboard shortcut (Ctrl/Cmd + K) to open search modal
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeydown)
    return () => document.removeEventListener('keydown', handleGlobalKeydown)
  }, [])

  return (
    <>
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 w-full">
            {/* Brand Section - Clickable to dashboard */}
            <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/reportmate-logo.png" 
                    alt="ReportMate" 
                    width={40} 
                    height={40} 
                    className="object-contain" 
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">ReportMate</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">Endpoint Monitoring</p>
                </div>
              </div>
            </Link>
            
            {/* Search Field (desktop) - center-aligned with platform filter on left */}
            <div className="hidden md:flex flex-1 items-center gap-3">
              <div className="flex-1 max-w-[calc(10%+7.7rem)]"></div>
              {showPlatformFilter && <PlatformToggle />}
              <div className="flex-1 mr-4">
                <DeviceSearchField 
                  className="w-full" 
                  placeholder="Search by name, serial, asset, or hostname" 
                  preloadedDevices={preloadedDevices} 
                />
              </div>
            </div>

            {/* Search Icon (mobile) */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="md:hidden ml-auto p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mr-2"
                aria-label="Open search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

            
            {/* Actions (right side) */}
            <div className="flex items-center gap-2">
              <DevicePageNavigation 
                className="flex items-center gap-2" 
                currentPage={getCurrentPage()} 
              />
              <Link 
                href="/settings" 
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal for mobile and Cmd+K */}
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        preloadedDevices={preloadedDevices}
      />
    </>
  )
}
