"use client""use client""use client"export default function InstallsPage() {"use client""use client""use client"'use client'



// Force dynamic rendering and disable caching for installs page

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'

import { useEffect, useState, Suspense, useMemo } from "react"

import Link from "next/link"import Link from 'next/link'

import { useSearchParams } from "next/navigation"

import { formatRelativeTime } from "../../../src/lib/time"import { useSearchParams } from 'next/navigation'// Force dynamic rendering and disable caching for installs page  return (

import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

import { formatRelativeTime } from '../../../src/lib/time'

interface InstallItem {

  id: stringimport { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'export const dynamic = 'force-dynamic'

  deviceId: string

  deviceName: string

  serialNumber: string

  lastSeen: string// Force dynamic rendering    <div>

  collectedAt: string

  // Install-specific fieldsexport const dynamic = 'force-dynamic'

  name: string

  version: stringimport { useEffect, useState, Suspense, useMemo } from "react"

  status: string

  source: stringinterface InstallRecord {

  platform: string

  last_update?: string  id: stringimport Link from "next/link"      <h1>Managed Items</h1>

  isInstalled?: boolean

  // Device inventory fields for filtering  deviceId: string

  usage?: string

  catalog?: string  deviceName: stringimport { useSearchParams } from "next/navigation"

  location?: string

  room?: string  serialNumber: string

  fleet?: string

  assetTag?: string  lastSeen: stringimport { formatRelativeTime } from "../../../src/lib/time"      <p>Coming soon...</p>export const dynamic = 'force-dynamic'

  raw?: any

}  status?: string



interface FilterOptions {  installs?: {import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

  installNames: string[]

  managedInstalls: string[]  // Managed installs from Cimian/Munki    cimian?: { 

  unmanagedInstalls: string[]    // Other install types

  usages: string[]      version?: string    </div>

  catalogs: string[]

  rooms: string[]      status?: string

  fleets: string[]

  locations: string[]      isInstalled?: booleaninterface ManagedItem {

}

      items?: Array<{

function InstallsPageContent() {

  const [installs, setInstalls] = useState<InstallItem[]>([])        name: string  id: string  )

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)        version: string

  const [filtersLoading, setFiltersLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')        status: string  deviceId: string

  

  // Filter state        last_update?: string

  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])

  const [selectedUsages, setSelectedUsages] = useState<string[]>([])      }>  deviceName: string}

  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])

  const [selectedRooms, setSelectedRooms] = useState<string[]>([])    }

  const [selectedFleets, setSelectedFleets] = useState<string[]>([])

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({    munki?: {   serialNumber: stringimport { Suspense } from "react"export const dynamic = 'force-dynamic'

    installNames: [],

    managedInstalls: [],      version?: string

    unmanagedInstalls: [],

    usages: [],      status?: string  lastSeen: string

    catalogs: [],

    rooms: [],      isInstalled?: boolean

    fleets: [],

    locations: []      items?: Array<{  collectedAt: stringimport Link from "next/link"

  })

        name: string

  const searchParams = useSearchParams()

        version: string  // Managed item specific fields

  // Fetch filter options

  const fetchFilterOptions = async () => {        status: string

    try {

      setFiltersLoading(true)        last_update?: string  name: stringimport { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 

        ? `http://localhost:${window.location.port}`       }>

        : 'https://reportmate-api.azurewebsites.net'

    }  version: string

      console.log('🔍 Fetching filter options from:', `${apiBaseUrl}/api/devices/installs/filters`)

  }

      let response

      try {  raw?: any  status: string

        response = await fetch(`${apiBaseUrl}/api/devices/installs/filters`, {

          cache: 'no-store',  packages: Array<{

          headers: {

            'Cache-Control': 'no-cache',    name: string  source: string

            'User-Agent': 'ReportMate-Frontend/1.0'

          }    version: string

        })

      } catch (e) {    status: string  platform: stringfunction InstallsPageContent() {import { useEffect, useState, Suspense } from "react"// Force dynamic rendering and disable caching for installs pageexport const dynamic = 'force-dynamic'

        console.warn('⚠️ Installs filter API failed, using applications API as fallback')

        response = await fetch(`${apiBaseUrl}/api/devices/applications/filters`, {    last_update?: string

          cache: 'no-store',

          headers: {    platform: string  last_update?: string

            'Cache-Control': 'no-cache',

            'User-Agent': 'ReportMate-Frontend/1.0'    source: string

          }

        })  }>  isInstalled?: boolean  return (

      }

}

      if (!response.ok) {

        throw new Error(`HTTP error! status: ${response.status}`)  // Device inventory fields for filtering

      }

function InstallsPageContent() {

      const data = await response.json()

        const [installs, setInstalls] = useState<InstallRecord[]>([])  usage?: string    <div className="min-h-screen bg-gray-50 dark:bg-black">import Link from "next/link"

      // Adapt applications data for installs page

      setFilterOptions({  const [loading, setLoading] = useState(false)

        installNames: data.managedApplications || [],

        managedInstalls: data.managedApplications || [],  const [error, setError] = useState<string | null>(null)  catalog?: string

        unmanagedInstalls: data.otherApplications || [],

        usages: data.usages || [],

        catalogs: data.catalogs || [],

        rooms: data.rooms || [],  return (  location?: string      {/* Header */}

        fleets: data.fleets || [],

        locations: data.locations || []    <div className="min-h-screen bg-gray-50 dark:bg-black">

      })

            {/* Header */}  room?: string

      console.log('✅ Smart filtering data loaded for installs:', data)

    } catch (error) {      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">

      console.error('❌ Error fetching filter options:', error)

      setError(`Failed to fetch filter options: ${error instanceof Error ? error.message : 'Unknown error'}`)        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">  fleet?: string      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">import { formatRelativeTime } from "../../../src/lib/time"export const dynamic = 'force-dynamic'

    } finally {

      setFiltersLoading(false)          <div className="flex items-center justify-between h-16">

    }

  }            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">  assetTag?: string



  // Toggle functions for filters              <Link

  const toggleInstall = (install: string) => {

    setSelectedInstalls(prev =>                 href="/dashboard"  raw?: any        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      prev.includes(install) 

        ? prev.filter(i => i !== install)                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"

        : [...prev, install]

    )              >}

  }

                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

  const toggleUsage = (usage: string) => {

    setSelectedUsages(prev =>                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />          <div className="flex items-center justify-between h-16">import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"

      prev.includes(usage) 

        ? prev.filter(u => u !== usage)                </svg>

        : [...prev, usage]

    )                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>interface FilterOptions {

  }

              </Link>

  const toggleCatalog = (catalog: string) => {

    setSelectedCatalogs(prev =>               <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>  managedInstalls: string[]            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">

      prev.includes(catalog) 

        ? prev.filter(c => c !== catalog)              <div className="flex items-center gap-2 sm:gap-3 min-w-0">

        : [...prev, catalog]

    )                {/* Installs Icon - Updated to use emerald color like nav */}  unmanagedInstalls: string[]

  }

                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

  const toggleRoom = (room: string) => {

    setSelectedRooms(prev =>                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />  totalManagedInstalls: number              <Linkimport { Suspense, useEffect, useState } from 'react'

      prev.includes(room) 

        ? prev.filter(r => r !== room)                </svg>

        : [...prev, room]

    )                <div className="min-w-0">  totalUnmanagedInstalls: number

  }

                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">

  const toggleFleet = (fleet: string) => {

    setSelectedFleets(prev =>                     Installs Report  devicesWithData: number                href="/dashboard"

      prev.includes(fleet) 

        ? prev.filter(f => f !== fleet)                  </h1>

        : [...prev, fleet]

    )                </div>  usages: string[]

  }

              </div>

  const clearAllFilters = () => {

    setSelectedInstalls([])            </div>  catalogs: string[]                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"function InstallsPageContent() {

    setSelectedUsages([])

    setSelectedCatalogs([])

    setSelectedRooms([])

    setSelectedFleets([])            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">  rooms: string[]

    setSearchQuery('')

  }              <div className="hidden lg:flex">



  const handleGenerateReport = async () => {                <DevicePageNavigation className="flex items-center gap-2" />  fleets: string[]              >

    if (selectedInstalls.length === 0) {

      setError('Please select at least one install to generate the report.')              </div>

      return

    }              <div className="lg:hidden">}



    try {                <DevicePageNavigation className="flex items-center gap-2" />

      setLoading(true)

      setError(null)              </div>                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">  return (import { useEffect, useState, Suspense, useMemo } from "react"import Link from 'next/link'



      const requestBody = {            </div>

        installs: selectedInstalls,

        usages: selectedUsages,          </div>function InstallsPageContent() {

        catalogs: selectedCatalogs,

        rooms: selectedRooms,        </div>

        fleets: selectedFleets

      }      </header>  const [managedItems, setManagedItems] = useState<ManagedItem[]>([])                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />



      console.log('🔍 Generating installs report with request:', requestBody)



      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'       {/* Main Content */}  const [loading, setLoading] = useState(false)

        ? `http://localhost:${window.location.port}` 

        : 'https://reportmate-api.azurewebsites.net'      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">



      const response = await fetch(`${apiBaseUrl}/api/devices/installs`, {        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">  const [error, setError] = useState<string | null>(null)                </svg>    <div className="min-h-screen bg-gray-50 dark:bg-black">

        method: 'POST',

        headers: {          

          'Content-Type': 'application/json',

        },          {/* Header Section */}  const [searchQuery, setSearchQuery] = useState('')

        body: JSON.stringify(requestBody)

      })          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">



      if (!response.ok) {            <div>  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>

        throw new Error(`HTTP ${response.status}: Failed to fetch install data`)

      }              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">



      const data = await response.json()                Installs Report  const [selectedUsages, setSelectedUsages] = useState<string[]>([])

      console.log('✅ Install report generated:', data)

                    </h2>

      // Process the data for installs

      setInstalls(data || [])              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])              </Link>      {/* Header */}import Link from "next/link"import { DevicePageNavigation } from '../../../src/components/navigation/DevicePageNavigation'

    } catch (error) {

      console.error('❌ Error generating installs report:', error)                Generate reports for managed installs and software packages

      setError(error instanceof Error ? error.message : 'Unknown error occurred')

    } finally {              </p>  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

      setLoading(false)

    }            </div>

  }

              const [selectedFleets, setSelectedFleets] = useState<string[]>([])              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

  useEffect(() => {

    fetchFilterOptions()            {/* Action Section */}

  }, [])

            <div className="flex items-center gap-4">  const [filterOptions, setFilterOptions] = useState<FilterOptions>({

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-black">              {/* Generate Report Button */}

      {/* Header */}

      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">              <button    managedInstalls: [],              <div className="flex items-center gap-2 sm:gap-3 min-w-0">      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">                disabled={loading}

            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">

              <Link                className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"    unmanagedInstalls: [],

                href="/dashboard"

                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"              >

              >

                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">    totalManagedInstalls: 0,                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />

                </svg>                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>

              </Link>                </svg>    totalUnmanagedInstalls: 0,

              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">                {loading ? 'Generating...' : 'Generate Report'}

                {/* Installs Icon - Emerald color */}

                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">              </button>    devicesWithData: 0,                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">import { useSearchParams } from "next/navigation"import { formatRelativeTime } from "../../../src/lib/time"

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />

                </svg>            </div>

                <div className="min-w-0">

                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">          </div>    usages: [],

                    Installs Report

                  </h1>

                </div>

              </div>          {/* Content */}    catalogs: [],                </svg>

            </div>

          <div className="px-6 py-12 text-center">

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

              <div className="hidden lg:flex">            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">    rooms: [],

                <DevicePageNavigation className="flex items-center gap-2" />

              </div>              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

              <div className="lg:hidden">

                <DevicePageNavigation className="flex items-center gap-2" />                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />    fleets: []                <div className="min-w-0">          <div className="flex items-center justify-between h-16">

              </div>

            </div>              </svg>

          </div>

        </div>            </div>  })

      </header>

            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">

      {/* Main Content */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">              Installs Report Ready  const [filtersLoading, setFiltersLoading] = useState(true)                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                      </h3>

          {/* Header Section */}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">            <p className="text-gray-600 dark:text-gray-400 mb-4">

            <div>

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">              This page will show managed software installs and package reports.<br />

                Installs Report

              </h2>              Ready to be populated with real install data from Cimian/Munki.  const searchParams = useSearchParams()                    Managed Items            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">import { formatRelativeTime } from "../../../src/lib/time"

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">

                {installs.length === 0             </p>

                  ? 'Select managed installs and criteria to generate report'

                  : `Showing ${installs.length} devices with managed installs`          </div>

                }

              </p>        </div>

            </div>

                  </div>  useEffect(() => {                  </h1>

            {/* Search Input */}

            <div className="flex items-center gap-4">    </div>

              <div className="relative">

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">  )    fetchFilterOptions()

                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />}

                  </svg>

                </div>  }, [])                </div>              <Link

                <input

                  type="text"export default function InstallsPage() {

                  placeholder="Search to filter managed installs..."

                  value={searchQuery}  return (

                  onChange={(e) => setSearchQuery(e.target.value)}

                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"    <Suspense fallback={

                />

                {searchQuery && (      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">  const fetchFilterOptions = async () => {              </div>

                  <button

                    onClick={() => setSearchQuery('')}        <div className="text-center">

                    className="absolute inset-y-0 right-0 pr-3 flex items-center"

                  >          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>    try {

                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />          <p className="text-gray-600 dark:text-gray-400">Loading installs...</p>

                    </svg>

                  </button>        </div>      setFiltersLoading(true)            </div>                href="/dashboard"import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"interface InstallRecord {

                )}

              </div>      </div>

            </div>

          </div>    }>      // Try installs/filters first, fallback to applications/filters if it fails



          {/* Error Display */}      <InstallsPageContent />

          {error && (

            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">    </Suspense>      let response

              {error}

            </div>  )

          )}

}      try {

          {/* Filter Clouds Section */}

          {!filtersLoading && (        response = await fetch('/api/devices/installs/filters')            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">

              <div className="space-y-4">      } catch (e) {

                

                {/* Inventory Filter Sections - Top */}        console.log('Installs filters endpoint failed, falling back to applications')              <div className="hidden lg:flex">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                          response = await fetch('/api/devices/applications/filters')

                  {/* Usage Filter */}

                  <div>      }                <DevicePageNavigation className="flex items-center gap-2" />              >  id: string

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">

                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}        

                    </h3>

                    <div className="flex flex-wrap gap-1">      if (!response.ok) {              </div>

                      {filterOptions.usages.map(usage => (

                        <button        throw new Error(`HTTP error! status: ${response.status}`)

                          key={usage}

                          onClick={() => toggleUsage(usage.toLowerCase())}      }              <div className="lg:hidden">                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${

                            selectedUsages.includes(usage.toLowerCase())

                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600'

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'      const data = await response.json()                <DevicePageNavigation className="flex items-center gap-2" />

                          }`}

                        >      setFilterOptions(data)

                          {usage}

                        </button>    } catch (error) {              </div>                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />interface ManagedPackage {  deviceId: string

                      ))}

                    </div>      console.error('Error fetching filter options:', error)

                  </div>

      setError('Failed to load filter options')            </div>

                  {/* Catalog Filter */}

                  <div>    } finally {

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">

                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}      setFiltersLoading(false)          </div>                </svg>

                    </h3>

                    <div className="flex flex-wrap gap-1">    }

                      {filterOptions.catalogs.map(catalog => (

                        <button  }        </div>

                          key={catalog}

                          onClick={() => toggleCatalog(catalog.toLowerCase())}

                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${

                            selectedCatalogs.includes(catalog.toLowerCase())  const handleGenerateReport = async () => {      </header>                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>  name: string  deviceName: string

                              ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-600'

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'    if (selectedInstalls.length === 0) {

                          }`}

                        >      setError('Please select at least one managed item to generate the report.')

                          {catalog}

                        </button>      return

                      ))}

                    </div>    }      {/* Main Content */}              </Link>

                  </div>



                  {/* Fleet Filter */}

                  <div>    try {      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">

                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}      setLoading(true)

                    </h3>

                    <div className="flex flex-wrap gap-1">      setError(null)        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>  version?: string  serialNumber: string

                      {filterOptions.fleets.map(fleet => (

                        <button

                          key={fleet}

                          onClick={() => toggleFleet(fleet)}      const requestBody = {          

                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${

                            selectedFleets.includes(fleet)        managedInstalls: selectedInstalls,

                              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-600'

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'        usages: selectedUsages,          {/* Header Section */}              <div className="flex items-center gap-2 sm:gap-3 min-w-0">

                          }`}

                        >        catalogs: selectedCatalogs,

                          {fleet}

                        </button>        rooms: selectedRooms,          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">

                      ))}

                    </div>        fleets: selectedFleets

                  </div>

      }            <div>                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">  status?: string  lastSeen?: string

                </div>



                {/* Room Filter Cloud - Full Width */}

                <div>      console.log('Generating managed items report with request:', requestBody)              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">

                  <div className="flex items-center justify-between mb-2">

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">

                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}

                    </h3>      const response = await fetch('/api/devices/installs', {                Managed Items Report                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />

                  </div>

                  <div className="h-20 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">        method: 'POST',

                    <div className="flex flex-wrap gap-1">

                      {filterOptions.rooms        headers: {              </h2>

                        .filter(room => room.toLowerCase().includes(searchQuery.toLowerCase()))

                        .slice(0, 200).map(room => (          'Content-Type': 'application/json',

                        <button

                          key={room}        },              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">                </svg>  source?: string  status?: string

                          onClick={() => toggleRoom(room)}

                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${        body: JSON.stringify(requestBody)

                            selectedRooms.includes(room)

                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600'      })                Select managed items and criteria to generate report

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'

                          }`}

                        >

                          {room}      if (!response.ok) {              </p>                <div className="min-w-0">

                        </button>

                      ))}        const errorText = await response.text()

                      {filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length > 200 && (

                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">        throw new Error(`HTTP ${response.status}: ${errorText}`)            </div>

                          +{filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length - 200} more (search to filter)

                        </span>      }

                      )}

                      {filterOptions.rooms.length === 0 && (                              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">}  installs?: {

                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">

                          No room data available      // Handle streaming response for progress updates

                        </span>

                      )}      const reader = response.body?.getReader()            {/* Action Section */}

                    </div>

                  </div>      if (!reader) {

                </div>

        throw new Error('No response stream available')            <div className="flex items-center gap-4">                    Managed Items

                {/* Installs Filter Cloud - SMART FILTERING */}

                <div>      }

                  <div className="flex items-center justify-between mb-2">

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">              {/* Search Input */}

                      Managed Installs {selectedInstalls.length > 0 && `(${selectedInstalls.length} selected)`}

                    </h3>      const decoder = new TextDecoder()

                    {filterOptions.managedInstalls.length > 0 && (

                      <span className="text-xs text-gray-500 dark:text-gray-400">      let buffer = ''              <div className="relative">                  </h1>    cimian?: { 

                        {filterOptions.managedInstalls.length} managed • {filterOptions.unmanagedInstalls.length} unmanaged

                      </span>      const results: ManagedItem[] = []

                    )}

                  </div>                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">

                  <div className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">

                    <div className="flex flex-wrap gap-1">      while (true) {

                      

                      {/* Managed Installs */}        const { done, value } = await reader.read()                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">                </div>

                      {filterOptions.managedInstalls

                        .filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))        if (done) break

                        .map((name: string) => (

                        <button                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                          key={name}

                          onClick={() => toggleInstall(name)}        buffer += decoder.decode(value, { stream: true })

                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${

                            selectedInstalls.includes(name)        const lines = buffer.split('\n')                  </svg>              </div>interface InstallRecord {      version?: string

                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-600'

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'        buffer = lines.pop() || ''

                          }`}

                          title={`Managed install from Cimian/Munki`}                </div>

                        >

                          {name}        for (const line of lines) {

                        </button>

                      ))}          if (line.trim()) {                <input            </div>

                      

                      {/* "Unmanaged" Button - Consolidates all other installs */}            try {

                      {filterOptions.unmanagedInstalls.length > 0 && (

                        <button              const data = JSON.parse(line)                  type="text"

                          onClick={() => {

                            // Toggle all other installs at once              

                            const otherInstallsSelected = filterOptions.unmanagedInstalls.some(install => selectedInstalls.includes(install))

                            if (otherInstallsSelected) {              if (data.type === 'data') {                  placeholder="Search to filter managed items..."  id: string      status?: string

                              // Remove all other installs from selection

                              setSelectedInstalls(prev => prev.filter(install => !filterOptions.unmanagedInstalls.includes(install)))                results.push(data.managedItem)

                            } else {

                              // Add all other installs to selection              } else if (data.type === 'error') {                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                              setSelectedInstalls(prev => [...new Set([...prev, ...filterOptions.unmanagedInstalls])])

                            }                console.error('Stream error:', data.error)

                          }}

                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${                setError(data.error)                />            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

                            filterOptions.unmanagedInstalls.some(install => selectedInstalls.includes(install))

                              ? 'bg-gray-200 text-gray-900 border-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-500'              }

                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'

                          }`}            } catch (parseError) {              </div>

                          title={`${filterOptions.unmanagedInstalls.length} unmanaged installs`}

                        >              console.error('Failed to parse streaming response:', parseError, 'Line:', line)

                          Unmanaged ({filterOptions.unmanagedInstalls.length})

                        </button>            }                            <div className="hidden lg:flex">  deviceId: string      isInstalled?: boolean

                      )}

                                }

                      {/* Status Messages */}

                      {filterOptions.managedInstalls.length === 0 && filterOptions.unmanagedInstalls.length === 0 && !searchQuery && (        }              {/* Action Buttons */}

                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">

                          Generate report first to populate installs      }

                        </span>

                      )}              <div className="flex items-center gap-2">                <DevicePageNavigation className="flex items-center gap-2" />

                      {filterOptions.managedInstalls.length === 0 && filterOptions.unmanagedInstalls.length === 0 && searchQuery && (

                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">      console.log('Final managed items results:', results)

                          No installs match "{searchQuery}"

                        </span>      setManagedItems(results)                <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">

                      )}

                    </div>    } catch (error) {

                  </div>

                </div>      console.error('Error generating managed items report:', error)                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">              </div>  deviceName: string      items?: Array<{



                {/* Main Action Buttons */}      setError(error instanceof Error ? error.message : 'Unknown error occurred')

                <div className="flex justify-center gap-3">

                  <button    } finally {                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                    onClick={handleGenerateReport}

                    disabled={loading}      setLoading(false)

                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm rounded-lg transition-colors"

                  >    }                  </svg>              <div className="lg:hidden">

                    {loading && <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />  }

                    </svg>}

                    Generate Report                  Generate Report

                  </button>

                    // Filter managed items based on search query

                  {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && (

                    <button  const filteredManagedItems = useMemo(() => {                </button>                <DevicePageNavigation className="flex items-center gap-2" />  serialNumber: string        name: string

                      onClick={clearAllFilters}

                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"    if (!searchQuery) return managedItems

                    >

                      Clear All Filters              </div>

                    </button>

                  )}    return managedItems.filter(item => {

                </div>

      const searchLower = searchQuery.toLowerCase()            </div>              </div>

              </div>

            </div>      

          )}

      // Search in device info          </div>

          {/* Content Area */}

          {loading ? (      if (item.deviceName?.toLowerCase().includes(searchLower) ||

            <div className="px-6 py-8">

              <div className="flex items-center justify-center">          item.serialNumber?.toLowerCase().includes(searchLower) ||            </div>  lastSeen: string        version: string

                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>

                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading installs...</span>          item.usage?.toLowerCase().includes(searchLower) ||

              </div>

            </div>          item.catalog?.toLowerCase().includes(searchLower) ||          {/* Content */}

          ) : installs.length === 0 ? (

            <div className="px-6 py-12 text-center">          item.location?.toLowerCase().includes(searchLower) ||

              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">

                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">          item.room?.toLowerCase().includes(searchLower) ||          <div className="px-6 py-12 text-center">          </div>

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />

                </svg>          item.fleet?.toLowerCase().includes(searchLower)) {

              </div>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">        return true            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">

                Installs Report Ready

              </h3>      }

              <p className="text-gray-600 dark:text-gray-400">

                This page will show managed software installs and package reports.<br />              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">        </div>  collectedAt: string        status: string

                Ready to be populated with real install data from Cimian/Munki.

              </p>      // Search in managed item details

            </div>

          ) : (      return item.name?.toLowerCase().includes(searchLower) ||                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />

            <div className="overflow-x-auto">

              <table className="w-full">             item.version?.toLowerCase().includes(searchLower) ||

                <thead className="bg-gray-50 dark:bg-gray-700">

                  <tr>             item.status?.toLowerCase().includes(searchLower) ||              </svg>      </header>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Install</th>             item.source?.toLowerCase().includes(searchLower)

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>    })            </div>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Seen</th>  }, [managedItems, searchQuery])

                  </tr>

                </thead>            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">  packages: ManagedPackage[]        last_update?: string

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

                  {installs.map((install, index) => (  return (

                    <tr key={`${install.deviceId}-${install.name}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">

                      <td className="px-6 py-4 whitespace-nowrap">    <div className="min-h-screen bg-gray-50 dark:bg-black">              Managed Items Page Fixed

                        <div>

                          <div className="text-sm font-medium text-gray-900 dark:text-white">      {/* Header - same as applications page */}

                            {install.deviceName}

                          </div>      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">            </h3>      {/* Main Content */}

                          <div className="text-sm text-gray-500 dark:text-gray-400">

                            {install.serialNumber}        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                          </div>

                        </div>          <div className="flex items-center justify-between h-16">            <p className="text-gray-600 dark:text-gray-400">

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">

                        <div className="text-sm font-medium text-gray-900 dark:text-white">

                          {install.name}              <Link              ✅ Header structure corrected<br />      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">  // Device inventory fields for filtering      }>

                        </div>

                      </td>                href="/dashboard"

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="text-sm text-gray-900 dark:text-white">                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"              ✅ Terminology updated to "Managed Items"<br />

                          {install.version || '-'}

                        </div>              >

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">              ✅ Navigation and layout matching applications page        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${

                          install.status === 'installed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />

                          install.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :

                          install.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :                </svg>            </p>

                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

                        }`}>                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>

                          {install.status || 'Unknown'}

                        </span>              </Link>          </div>          <div className="px-6 py-12 text-center">  usage?: string    }

                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                        <div className="text-sm text-gray-900 dark:text-white">

                          {install.source || '-'}              <div className="flex items-center gap-2 sm:gap-3 min-w-0">        </div>

                        </div>

                      </td>                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <td className="px-6 py-4 whitespace-nowrap">

                        <div className="text-sm text-gray-500 dark:text-gray-400">                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />      </div>            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">

                          {formatRelativeTime(install.lastSeen)}

                        </div>                </svg>

                      </td>

                    </tr>                <div className="min-w-0">    </div>

                  ))}

                </tbody>                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">

              </table>

            </div>                    Managed Items  )              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">  catalog?: string    munki?: { 

          )}

        </div>                  </h1>

      </div>

    </div>                </div>}

  )

}              </div>



export default function InstallsPage() {            </div>                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />

  return (

    <Suspense fallback={

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">

        <div className="text-center">            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">export default function InstallsPage() {

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>

          <p className="text-gray-600 dark:text-gray-400">Loading installs...</p>              <div className="hidden lg:flex">

        </div>

      </div>                <DevicePageNavigation className="flex items-center gap-2" />  return (              </svg>  location?: string      version?: string

    }>

      <InstallsPageContent />              </div>

    </Suspense>

  )              <div className="lg:hidden">    <Suspense fallback={

}
                <DevicePageNavigation className="flex items-center gap-2" />

              </div>      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">            </div>

            </div>

          </div>        <div className="text-center">

        </div>

      </header>          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">  room?: string      status?: string



      {/* Main Content */}          <p className="text-gray-600 dark:text-gray-400">Loading managed items...</p>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">        </div>              Managed Items Page

          

          {/* Header Section */}      </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">

            <div>    }>            </h3>  fleet?: string      isInstalled?: boolean

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">

                Managed Items Report {filteredManagedItems.length > 0 && `(${filteredManagedItems.length})`}      <InstallsPageContent />

                {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && managedItems.length > 0 && (

                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">    </Suspense>            <p className="text-gray-600 dark:text-gray-400 mb-4">

                    (filtered)

                  </span>  )

                )}

              </h2>}              The Managed Items page has been fixed with proper header structure and terminology.  assetTag?: string      items?: Array<{

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">

                {managedItems.length === 0             </p>

                  ? 'Select managed items and criteria to generate report'

                  : `Showing ${filteredManagedItems.length} of ${managedItems.length} devices with managed items`          </div>  raw?: any        name: string

                }

              </p>        </div>

            </div>

                  </div>}        version: string

            {/* Action Section */}

            <div className="flex items-center gap-4">    </div>

              {/* Search Input */}

              <div className="relative">  )        status: string

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">

                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">}

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                  </svg>interface FilterOptions {        last_update?: string

                </div>

                <inputexport default function InstallsPage() {

                  type="text"

                  placeholder="Search to filter managed items..."  return (  managedInstalls: string[]      }>

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}    <Suspense fallback={

                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                />      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">  unmanagedInstalls: string[]    }

                {searchQuery && (

                  <button        <div className="text-center">

                    onClick={() => setSearchQuery('')}

                    className="absolute inset-y-0 right-0 pr-3 flex items-center"          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>  totalManagedInstalls: number  }

                  >

                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">          <p className="text-gray-600 dark:text-gray-400">Loading managed items...</p>

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                    </svg>        </div>  totalUnmanagedInstalls: number  raw?: {

                  </button>

                )}      </div>

              </div>

    }>  devicesWithData: number    cimian?: { version?: string }

              {/* Action Buttons */}

              <div className="flex items-center gap-2">      <InstallsPageContent />

                {/* Generate Report Button */}

                <button    </Suspense>  usages: string[]    munki?: { version?: string }

                  onClick={handleGenerateReport}

                  disabled={selectedInstalls.length === 0 || loading}  )

                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${

                    selectedInstalls.length === 0 || loading}  catalogs: string[]    system_profiler?: {

                      ? 'bg-gray-400 text-white cursor-not-allowed'

                      : 'bg-blue-600 hover:bg-blue-700 text-white'  rooms: string[]      SPHardwareDataType?: Array<{

                  }`}

                >  fleets: string[]        machine_model?: string

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}        platform_UUID?: string

                  </svg>

                  {loading ? 'Generating...' : 'Generate Report'}      }>

                </button>

              </div>interface LoadingProgress {    }

            </div>

          </div>  status: string    inventory?: {



          {/* Content */}  current: number      deviceName?: string

          <div className="px-6 py-12 text-center">

            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">  total: number      assetTag?: string

              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />}      usage?: string

              </svg>

            </div>      catalog?: string

            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">

              Managed Items Page// Get status style classes      location?: string

            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">function getStatusStyle(status?: string): string {      fleet?: string

              ✅ Header structure corrected<br />

              ✅ Terminology updated to "Managed Items"<br />  switch (status?.toLowerCase()) {    }

              ✅ Navigation and layout matching applications page<br />

              ✅ Ready for functionality implementation    case 'installed':  }

            </p>

          </div>      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'  packages: Array<{

        </div>

      </div>    case 'pending':    name: string

    </div>

  )      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'    version: string

}

    case 'warning':    status: string

export default function InstallsPage() {

  return (      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'    last_update?: string

    <Suspense fallback={

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">    case 'error':    platform: string

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'    source: string

          <p className="text-gray-600 dark:text-gray-400">Loading managed items...</p>

        </div>    case 'removed':  }>

      </div>

    }>      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}

      <InstallsPageContent />

    </Suspense>    default:

  )

}      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'interface FilterOptions {

  }  managedInstalls: string[]

}  unmanagedInstalls: string[]

  totalManagedInstalls: number

function getDevicePlatform(install: InstallRecord): string {  totalUnmanagedInstalls: number

  if (install.raw?.system?.operatingSystem?.platform === 'Windows NT') {  devicesWithData: number

    return 'Windows'  // Inventory filters (matching applications page)

  } else if (install.raw?.system?.operatingSystem?.platform === 'Darwin') {  usages: string[]

    return 'macOS'  catalogs: string[]

  }  rooms: string[]

  return 'Unknown'  fleets: string[]

}}



function formatDateTime(dateString: string): string {interface PackageGroup {

  try {  name: string

    const date = new Date(dateString)  totalCount: number

    return date.toLocaleDateString('en-US', {  versions: PackageVersion[]

      month: 'short',  expanded: boolean

      day: 'numeric',}

      year: 'numeric',

      hour: 'numeric',interface PackageVersion {

      minute: '2-digit'  version: string

    })  count: number

  } catch {}

    return 'Invalid Date'

  }function getDevicePlatform(install: InstallRecord): string {

}  const machineModel = install.raw?.system_profiler?.SPHardwareDataType?.[0]?.machine_model || ''

  if (machineModel.toLowerCase().includes('mac')) {

function InstallsPageContent() {    return 'Macintosh'

  const [installs, setInstalls] = useState<InstallRecord[]>([])  }

  const [loading, setLoading] = useState(false)  return 'Windows'

  const [error, setError] = useState<string | null>(null)}

  const [searchQuery, setSearchQuery] = useState('')

  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])function getStatusBadgeColor(status: string): string {

  const [selectedUsages, setSelectedUsages] = useState<string[]>([])  switch (status?.toLowerCase()) {

  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])    case 'installed':

  const [selectedRooms, setSelectedRooms] = useState<string[]>([])      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'

  const [selectedFleets, setSelectedFleets] = useState<string[]>([])    case 'pending':

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'

    managedInstalls: [],    case 'warning':

    unmanagedInstalls: [],      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'

    totalManagedInstalls: 0,    case 'error':

    totalUnmanagedInstalls: 0,      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'

    devicesWithData: 0,    case 'removed':

    usages: [],      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

    catalogs: [],    default:

    rooms: [],      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

    fleets: []  }

  })}

  const [filtersLoading, setFiltersLoading] = useState(true)

  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null)function formatDateTime(dateString: string): string {

  try {

  const searchParams = useSearchParams()    const date = new Date(dateString)

    return date.toLocaleDateString('en-US', {

  useEffect(() => {      month: 'short',

    fetchFilterOptions()      day: 'numeric',

  }, [])      year: 'numeric',

      hour: 'numeric',

  const fetchFilterOptions = async () => {      minute: '2-digit'

    try {    })

      setFiltersLoading(true)  } catch {

      // Try installs/filters first, fallback to applications/filters if it fails    return 'Invalid Date'

      let response  }

      try {}

        response = await fetch('/api/devices/installs/filters')

      } catch (e) {function InstallsPageContent() {

        console.log('Installs filters endpoint failed, falling back to applications')  const [installs, setInstalls] = useState<InstallRecord[]>([])

        response = await fetch('/api/devices/applications/filters')  const [loading, setLoading] = useState(false)

      }  const [error, setError] = useState<string | null>(null)

        const [searchQuery, setSearchQuery] = useState('')

      if (!response.ok) {  const [statusFilter, setStatusFilter] = useState<string[]>([])

        throw new Error(`HTTP error! status: ${response.status}`)  const [platformFilter, setPlatformFilter] = useState<string | null>(null)

      }  const [versionFilter, setVersionFilter] = useState<{type: string | null, version: string | null}>({type: null, version: null})

        

      const data = await response.json()  // Smart filtering state

      setFilterOptions(data)  const [filterOptions, setFilterOptions] = useState<FilterOptions>({

    } catch (error) {    managedInstalls: [],

      console.error('Error fetching filter options:', error)    unmanagedInstalls: [],

      setError('Failed to load filter options')    totalManagedInstalls: 0,

    } finally {    totalUnmanagedInstalls: 0,

      setFiltersLoading(false)    devicesWithData: 0,

    }    usages: [],

  }    catalogs: [],

    rooms: [],

  const handleGenerateReport = async () => {    fleets: []

    try {  })

      setLoading(true)  const [selectedInstalls, setSelectedInstalls] = useState<string[]>([])

      setError(null)  

      setLoadingProgress({ status: 'Initializing...', current: 0, total: 0 })  // Inventory filter state (matching applications page)

  const [selectedUsages, setSelectedUsages] = useState<string[]>([])

      const requestBody = {  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])

        managedInstalls: selectedInstalls,  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

        usages: selectedUsages,  const [selectedFleets, setSelectedFleets] = useState<string[]>([])

        catalogs: selectedCatalogs,  const [filtersLoading, setFiltersLoading] = useState(false)

        rooms: selectedRooms,  

        fleets: selectedFleets  // Package selection state

      }  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

  const [selectedPackageVersion, setSelectedPackageVersion] = useState<string | null>(null)

      console.log('Generating installs report with request:', requestBody)  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set())



      const response = await fetch('/api/devices/installs', {  // Progress tracking state

        method: 'POST',  const [loadingProgress, setLoadingProgress] = useState<{

        headers: {    current: number

          'Content-Type': 'application/json',    total: number

        },    currentBatch: number

        body: JSON.stringify(requestBody)    totalBatches: number

      })    status: string

  } | null>(null)

      if (!response.ok) {

        const errorText = await response.text()  // Function to fetch smart filtering data

        throw new Error(`HTTP ${response.status}: ${errorText}`)  async function fetchFilterOptions() {

      }    setFiltersLoading(true)

    try {

      const reader = response.body?.getReader()      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 

      if (!reader) {        ? `http://localhost:${window.location.port}` 

        throw new Error('No response stream available')        : 'https://reportmate-api.azurewebsites.net'

      }

      console.log('🔍 Fetching filter options from:', `${apiBaseUrl}/api/devices/installs/filters`)

      const decoder = new TextDecoder()

      let buffer = ''      const response = await fetch(`${apiBaseUrl}/api/devices/installs/filters`, {

      const results: InstallRecord[] = []        cache: 'no-store',

        headers: {

      while (true) {          'Cache-Control': 'no-cache',

        const { done, value } = await reader.read()          'User-Agent': 'ReportMate-Frontend/1.0'

        if (done) break        }

      })

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')      if (!response.ok) {

        buffer = lines.pop() || ''        console.warn('⚠️ Installs filter API failed, using applications API as fallback')

        // Fallback to applications API for now since installs API might not be implemented

        for (const line of lines) {        const fallbackResponse = await fetch(`${apiBaseUrl}/api/devices/applications/filters`, {

          if (line.trim()) {          cache: 'no-store',

            try {          headers: {

              const data = JSON.parse(line)            'Cache-Control': 'no-cache',

                          'User-Agent': 'ReportMate-Frontend/1.0'

              if (data.type === 'progress') {          }

                setLoadingProgress(data.progress)        })

              } else if (data.type === 'data') {        

                results.push(data.install)        if (fallbackResponse.ok) {

              } else if (data.type === 'error') {          const fallbackData = await fallbackResponse.json()

                console.error('Stream error:', data.error)          // Adapt applications data for installs page

                setError(data.error)          setFilterOptions({

              }            managedInstalls: fallbackData.managedApplications || [],

            } catch (parseError) {            unmanagedInstalls: fallbackData.otherApplications || [],

              console.error('Failed to parse streaming response:', parseError, 'Line:', line)            totalManagedInstalls: fallbackData.totalManagedApplications || 0,

            }            totalUnmanagedInstalls: fallbackData.totalOtherApplications || 0,

          }            devicesWithData: fallbackData.devicesWithData || 0,

        }            usages: fallbackData.usages || [],

      }            catalogs: fallbackData.catalogs || [],

            rooms: fallbackData.rooms || [],

      console.log('Final installs results:', results)            fleets: fallbackData.fleets || []

      setInstalls(results)          })

      setLoadingProgress(null)          console.log('✅ Using applications data as fallback for installs:', fallbackData)

    } catch (error) {          return

      console.error('Error generating installs report:', error)        }

      setError(error instanceof Error ? error.message : 'Unknown error occurred')        throw new Error(`Failed to fetch filter options: ${response.status}`)

      setLoadingProgress(null)      }

    } finally {

      setLoading(false)      const data = await response.json()

    }      

  }      setFilterOptions(data)

      console.log('✅ Smart filtering data loaded:', data)

  // Filter installs based on search query    } catch (error) {

  const filteredInstalls = useMemo(() => {      console.error('❌ Error fetching filter options:', error)

    if (!searchQuery) return installs      setError(`Failed to fetch filter options: ${error instanceof Error ? error.message : 'Unknown error'}`)

    } finally {

    return installs.filter(install => {      setFiltersLoading(false)

      const searchLower = searchQuery.toLowerCase()    }

        }

      // Search in device info

      if (install.deviceName?.toLowerCase().includes(searchLower) ||  // Function to toggle install selection

          install.serialNumber?.toLowerCase().includes(searchLower) ||  function toggleInstall(installName: string) {

          install.usage?.toLowerCase().includes(searchLower) ||    setSelectedInstalls(prev => {

          install.catalog?.toLowerCase().includes(searchLower) ||      if (prev.includes(installName)) {

          install.location?.toLowerCase().includes(searchLower) ||        return prev.filter(name => name !== installName)

          install.room?.toLowerCase().includes(searchLower) ||      } else {

          install.fleet?.toLowerCase().includes(searchLower)) {        return [...prev, installName]

        return true      }

      }    })

  }

      // Search in packages

      return install.packages?.some(pkg =>   // Toggle functions for inventory filters (matching applications page)

        pkg.name?.toLowerCase().includes(searchLower) ||  function toggleUsage(usage: string) {

        pkg.version?.toLowerCase().includes(searchLower) ||    setSelectedUsages(prev => 

        pkg.status?.toLowerCase().includes(searchLower) ||      prev.includes(usage) 

        pkg.source?.toLowerCase().includes(searchLower)        ? prev.filter(u => u !== usage)

      )        : [...prev, usage]

    })    )

  }, [installs, searchQuery])  }



  if (error && installs.length === 0) {  function toggleCatalog(catalog: string) {

    return (    setSelectedCatalogs(prev => 

      <div className="min-h-screen bg-gray-50 dark:bg-black">      prev.includes(catalog) 

        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">        ? prev.filter(c => c !== catalog)

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">        : [...prev, catalog]

            <div className="flex items-center justify-between h-16">    )

              <div className="flex items-center gap-4 min-w-0 flex-1">  }

                <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">  function toggleRoom(room: string) {

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />    setSelectedRooms(prev => 

                  </svg>      prev.includes(room) 

                  <span className="text-sm font-medium hidden sm:inline">Dashboard</span>        ? prev.filter(r => r !== room)

                </Link>        : [...prev, room]

                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>    )

                <div className="flex items-center gap-3 min-w-0">  }

                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />  function toggleFleet(fleet: string) {

                  </svg>    setSelectedFleets(prev => 

                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Managed Items</h1>      prev.includes(fleet) 

                </div>        ? prev.filter(f => f !== fleet)

              </div>        : [...prev, fleet]

              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">    )

                <div className="hidden lg:flex">  }

                  <DevicePageNavigation className="flex items-center gap-2" />

                </div>  useEffect(() => {

              </div>    // Only fetch smart filtering data on page load, not the full install reports

            </div>    fetchFilterOptions()

          </div>  }, [])

        </header>

          // Function to fetch install data based on selected criteria (similar to applications page)

        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">  const fetchInstalls = async () => {

          <div className="text-center">    if (selectedInstalls.length === 0) {

            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">      setError('Please select at least one install filter to generate the report.')

              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">      return

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />    }

              </svg>

            </div>    setLoading(true)

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">    setError(null)

              Error Loading Managed Items    setLoadingProgress({

            </h2>      current: 0,

            <p className="text-gray-600 dark:text-gray-400 mb-6">      total: 0,

              {error}      currentBatch: 0,

            </p>      totalBatches: 0,

            <div className="flex gap-4 justify-center">      status: 'Starting install report generation...'

              <button    })

                onClick={() => {

                  setError(null)    try {

                  fetchFilterOptions()      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 

                }}        ? `http://localhost:${window.location.port}` 

                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"        : 'https://reportmate-api.azurewebsites.net'

              >

                Try Again      // Create query parameters based on selected install filters

              </button>      const params = new URLSearchParams()

              <Link      selectedInstalls.forEach(install => {

                href="/dashboard"        params.append('installs', install)

                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"      })

              >

                ← Back to Dashboard      console.log('🔍 Fetching install data for selected filters:', selectedInstalls)

              </Link>

            </div>      const response = await fetch(`${apiBaseUrl}/api/devices/installs?${params}`, {

          </div>        cache: 'no-store',

        </div>        headers: {

      </div>          'Cache-Control': 'no-cache',

    )          'User-Agent': 'ReportMate-Frontend/1.0'

  }        }

      })

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-black">      if (!response.ok) {

      {/* Header - same as applications page */}        throw new Error('Failed to fetch install data')

      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">      }

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">      const data = await response.json()

            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">      

              <Link      if (Array.isArray(data)) {

                href="/dashboard"        // Process the install data using the fixed extraction logic

                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"        const processedInstalls = data.map((device: any) => {

              >          const packages: Array<{name: string, version: string, status: string, last_update?: string, platform: string, source: string}> = []

                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">          

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />          // Add Cimian packages with corrected field extraction

                </svg>          if (device.installs?.cimian?.items) {

                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>            device.installs.cimian.items.forEach((item: any) => {

              </Link>              const packageName = item.itemName || item.displayName || item.name || 'Unknown Package'

              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>              // Only include packages that match selected filters

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">              if (selectedInstalls.includes(packageName) || 

                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">                  (selectedInstalls.some(selected => filterOptions.unmanagedInstalls.includes(selected)) && 

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />                   filterOptions.unmanagedInstalls.includes(packageName))) {

                </svg>                packages.push({

                <div className="min-w-0">                  name: packageName,

                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">                  version: item.latestVersion || item.installedVersion || item.currentVersion || 'Unknown',

                    Managed Items                  status: item.currentStatus || 'Unknown',

                  </h1>                  last_update: item.lastUpdate || item.lastAttemptTime,

                </div>                  platform: 'All',

              </div>                  source: 'Cimian'

            </div>                })

              }

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">            })

              <div className="hidden lg:flex">          }

                <DevicePageNavigation className="flex items-center gap-2" />

              </div>          // Add Munki packages with corrected field extraction

              <div className="lg:hidden">          if (device.installs?.munki?.items) {

                <DevicePageNavigation className="flex items-center gap-2" />            device.installs.munki.items.forEach((item: any) => {

              </div>              const packageName = item.itemName || item.displayName || item.name || 'Unknown Package'

            </div>              // Only include packages that match selected filters

          </div>              if (selectedInstalls.includes(packageName) || 

        </div>                  (selectedInstalls.some(selected => filterOptions.unmanagedInstalls.includes(selected)) && 

      </header>                   filterOptions.unmanagedInstalls.includes(packageName))) {

                packages.push({

      {/* Main Content */}                  name: packageName,

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">                  version: item.latestVersion || item.installedVersion || item.currentVersion || item.version || 'Unknown',

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">                  status: item.currentStatus || item.status || 'unknown',

                            last_update: item.lastUpdate || item.lastAttemptTime || item.last_update,

          {/* Header Section */}                  platform: 'All',

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">                  source: 'Munki'

            <div>                })

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">              }

                Managed Items Report {filteredInstalls.length > 0 && `(${filteredInstalls.length})`}            })

                {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && installs.length > 0 && (          }

                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">

                    (filtered)          return {

                  </span>            id: device.deviceId || device.serialNumber || Math.random().toString(),

                )}            deviceId: device.deviceId || device.serialNumber || 'unknown',

              </h2>            deviceName: device.deviceName || device.inventory?.deviceName || device.serialNumber || 'Unknown Device',

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">            serialNumber: device.serialNumber || device.deviceId || 'unknown',

                {installs.length === 0             lastSeen: device.lastSeen,

                  ? 'Select managed items and criteria to generate report'            status: device.status,

                  : `Showing ${filteredInstalls.length} of ${installs.length} devices with managed items`            installs: device.installs,

                }            raw: device.raw || device,

              </p>            packages: packages

            </div>          }

                    }).filter(install => install.packages.length > 0) // Only include devices with matching packages

            {/* Action Section */}

            <div className="flex items-center gap-4">        setInstalls(processedInstalls)

              {/* Search Input */}        console.log('✅ Install report generated:', processedInstalls.length, 'devices with matching installs')

              <div className="relative">      } else {

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">        throw new Error('Invalid response format')

                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">      }

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                  </svg>    } catch (error) {

                </div>      console.error('❌ Error fetching install data:', error)

                <input      setError(`Failed to fetch install data: ${error instanceof Error ? error.message : 'Unknown error'}`)

                  type="text"      setInstalls([])

                  placeholder="Search to filter managed items..."    } finally {

                  value={searchQuery}      setLoading(false)

                  onChange={(e) => setSearchQuery(e.target.value)}      setLoadingProgress(null)

                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"    }

                />  }

                {searchQuery && (

                  <button  // Handle generate report action

                    onClick={() => setSearchQuery('')}  const handleGenerateReport = () => {

                    className="absolute inset-y-0 right-0 pr-3 flex items-center"    fetchInstalls()

                  >  }

                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />  // Create package groups from all installs

                    </svg>  const packageGroups: PackageGroup[] = (() => {

                  </button>    const groups: Record<string, Record<string, number>> = {}

                )}    

              </div>    installs.forEach(install => {

                    const platform = getDevicePlatform(install)

              {/* Action Buttons */}      if (platformFilter && platform !== platformFilter) return

              <div className="flex items-center gap-2">      

                {/* Generate Report Button */}      install.packages?.forEach(pkg => {

                <button        if (!groups[pkg.name]) {

                  onClick={handleGenerateReport}          groups[pkg.name] = {}

                  disabled={selectedInstalls.length === 0 || loading}        }

                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${        if (!groups[pkg.name][pkg.version]) {

                    selectedInstalls.length === 0 || loading          groups[pkg.name][pkg.version] = 0

                      ? 'bg-gray-400 text-white cursor-not-allowed'        }

                      : 'bg-blue-600 hover:bg-blue-700 text-white'        groups[pkg.name][pkg.version]++

                  }`}      })

                >    })

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />    return Object.entries(groups)

                  </svg>      .map(([name, versions]) => ({

                  {loading ? 'Generating...' : 'Generate Report'}        name,

                </button>        totalCount: Object.values(versions).reduce((sum, count) => sum + count, 0),

                        versions: Object.entries(versions)

                {/* Export CSV Button */}          .map(([version, count]) => ({ version, count }))

                {filteredInstalls.length > 0 && (          .sort((a, b) => {

                  <button            // Sort versions numerically where possible

                    onClick={() => {            const parseVersion = (v: string) => v.split('.').map(n => parseInt(n) || 0)

                      const csvContent = [            const vA = parseVersion(a.version)

                        ['Device Name', 'Serial Number', 'Managed Item', 'Version', 'Status', 'Source', 'Platform', 'Usage', 'Catalog', 'Room', 'Fleet', 'Last Seen'].join(','),            const vB = parseVersion(b.version)

                        ...filteredInstalls.flatMap(install =>             

                          install.packages.map(pkg => [            for (let i = 0; i < Math.max(vA.length, vB.length); i++) {

                            install.deviceName,              const partA = vA[i] || 0

                            install.serialNumber,              const partB = vB[i] || 0

                            pkg.name,              if (partB !== partA) return partB - partA

                            pkg.version || '',            }

                            pkg.status || '',            return 0

                            pkg.source || '',          }),

                            getDevicePlatform(install),        expanded: expandedPackages.has(name)

                            install.raw?.inventory?.usage || '',      }))

                            install.raw?.inventory?.catalog || '',      .sort((a, b) => b.totalCount - a.totalCount)

                            install.raw?.inventory?.location || '',  })()

                            install.raw?.inventory?.fleet || '',

                            formatRelativeTime(install.lastSeen || '')  // Filter installs based on search, status, and platform

                          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))  const filteredInstalls = installs.filter(install => {

                        )    const platform = getDevicePlatform(install)

                      ].join('\n')    

                          // Search filter

                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })    if (searchQuery) {

                      const link = document.createElement('a')      const query = searchQuery.toLowerCase()

                      const url = URL.createObjectURL(blob)      const matchesSearch = (

                      link.setAttribute('href', url)        install.deviceName?.toLowerCase().includes(query) ||

                      link.setAttribute('download', `managed-items-report-${new Date().toISOString().split('T')[0]}.csv`)        install.serialNumber?.toLowerCase().includes(query) ||

                      link.style.visibility = 'hidden'        install.packages?.some(pkg => 

                      document.body.appendChild(link)          pkg.name?.toLowerCase().includes(query) ||

                      link.click()          pkg.version?.toLowerCase().includes(query)

                      document.body.removeChild(link)        )

                    }}      )

                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"      if (!matchesSearch) return false

                  >    }

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">    

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />    // Platform filter

                    </svg>    if (platformFilter && platform !== platformFilter) return false

                    Export CSV    

                  </button>    // Status filter - check if device has any packages with the selected statuses

                )}    if (statusFilter.length > 0) {

              </div>      const hasMatchingStatus = install.packages?.some(pkg => 

            </div>        statusFilter.includes(pkg.status)

          </div>      )

      if (!hasMatchingStatus) return false

          {/* Error Display */}    }

          {error && (    

            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">    // Package-specific filtering

              {error}    if (selectedPackage) {

            </div>      const hasPackage = install.packages?.some(pkg => pkg.name === selectedPackage)

          )}      if (!hasPackage) return false

      

          {/* Filter Clouds Section */}      if (selectedPackageVersion) {

          {!filtersLoading && (        const hasVersion = install.packages?.some(pkg => 

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">          pkg.name === selectedPackage && pkg.version === selectedPackageVersion

              <div className="space-y-4">        )

                {/* Managed Install Selection */}        if (!hasVersion) return false

                {filterOptions.managedInstalls.length > 0 && (      }

                  <div>    }

                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">    

                      Select Managed Items ({filterOptions.managedInstalls.length} available)    return true

                    </h3>  })

                    <div className="flex flex-wrap gap-2">

                      {filterOptions.managedInstalls.map((install) => (  // Get unique statuses for filtering

                        <button  const uniqueStatuses = Array.from(new Set(

                          key={install}    installs.flatMap(install => 

                          onClick={() => {      install.packages?.map(pkg => pkg.status) || []

                            setSelectedInstalls(prev =>     )

                              prev.includes(install)   )).filter(Boolean).sort()

                                ? prev.filter(s => s !== install)

                                : [...prev, install]  // Get unique platforms

                            )  const uniquePlatforms = Array.from(new Set(

                          }}    installs.map(install => getDevicePlatform(install))

                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${  )).sort()

                            selectedInstalls.includes(install)

                              ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-800 dark:border-blue-600 dark:text-blue-200'  return (

                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-500'    <div className="min-h-screen bg-gray-50 dark:bg-black">

                          }`}      {/* Header - same as applications page */}

                        >      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">

                          {install}        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                        </button>          <div className="flex items-center justify-between h-16">

                      ))}            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">

                    </div>              <Link

                  </div>                href="/dashboard"

                )}                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"

              >

                {/* Additional Filters */}                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />

                  {/* Usage Filter */}                </svg>

                  {filterOptions.usages.length > 0 && (                <span className="text-xs sm:text-sm font-medium hidden sm:inline">Dashboard</span>

                    <div>              </Link>

                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usage</h3>              <div className="h-4 sm:h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

                      <div className="flex flex-wrap gap-1">              <div className="flex items-center gap-2 sm:gap-3 min-w-0">

                        {filterOptions.usages.map((usage) => (                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                          <button                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />

                            key={usage}                </svg>

                            onClick={() => {                <div className="min-w-0">

                              setSelectedUsages(prev =>                   <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">

                                prev.includes(usage)                     Managed Items

                                  ? prev.filter(s => s !== usage)                  </h1>

                                  : [...prev, usage]                </div>

                              )              </div>

                            }}            </div>

                            className={`px-2 py-1 text-xs rounded border transition-colors ${

                              selectedUsages.includes(usage)            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

                                ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-800 dark:border-green-600 dark:text-green-200'              <div className="hidden lg:flex">

                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-500'                <DevicePageNavigation className="flex items-center gap-2" />

                            }`}              </div>

                          >              <div className="lg:hidden">

                            {usage}                <DevicePageNavigation className="flex items-center gap-2" />

                          </button>              </div>

                        ))}            </div>

                      </div>          </div>

                    </div>        </div>

                  )}      </header>



                  {/* Catalog Filter */}      {/* Main Content */}

                  {filterOptions.catalogs.length > 0 && (      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 pt-4 sm:pt-8">

                    <div>        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catalog</h3>          

                      <div className="flex flex-wrap gap-1">          {/* Header Section */}

                        {filterOptions.catalogs.map((catalog) => (          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">

                          <button            <div>

                            key={catalog}              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">

                            onClick={() => {                Managed Items Report {filteredInstalls.length > 0 && `(${filteredInstalls.length})`}

                              setSelectedCatalogs(prev =>                 {(selectedInstalls.length > 0 || selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedRooms.length > 0 || selectedFleets.length > 0) && installs.length > 0 && (

                                prev.includes(catalog)                   <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">

                                  ? prev.filter(s => s !== catalog)                    (filtered)

                                  : [...prev, catalog]                  </span>

                              )                )}

                            }}              </h2>

                            className={`px-2 py-1 text-xs rounded border transition-colors ${              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">

                              selectedCatalogs.includes(catalog)                {installs.length === 0 

                                ? 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-800 dark:border-purple-600 dark:text-purple-200'                  ? 'Select managed items and criteria to generate report'

                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-500'                  : `Showing ${filteredInstalls.length} of ${installs.length} devices with managed items`

                            }`}                }

                          >              </p>

                            {catalog}            </div>

                          </button>            

                        ))}            {/* Action Section */}

                      </div>            <div className="flex items-center gap-4">

                    </div>              {/* Search Input */}

                  )}              <div className="relative">

                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">

                  {/* Room Filter */}                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  {filterOptions.rooms.length > 0 && (                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                    <div>                  </svg>

                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Room</h3>                </div>

                      <div className="flex flex-wrap gap-1">                <input

                        {filterOptions.rooms.slice(0, 8).map((room) => (                  type="text"

                          <button                  placeholder="Search to filter managed items..."

                            key={room}                  value={searchQuery}

                            onClick={() => {                  onChange={(e) => setSearchQuery(e.target.value)}

                              setSelectedRooms(prev =>                   className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                                prev.includes(room)                 />

                                  ? prev.filter(s => s !== room)                {searchQuery && (

                                  : [...prev, room]                  <button

                              )                    onClick={() => setSearchQuery('')}

                            }}                    className="absolute inset-y-0 right-0 pr-3 flex items-center"

                            className={`px-2 py-1 text-xs rounded border transition-colors ${                  >

                              selectedRooms.includes(room)                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-800 dark:border-orange-600 dark:text-orange-200'                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-500'                    </svg>

                            }`}                  </button>

                          >                )}

                            {room}              </div>

                          </button>              

                        ))}              {/* Action Buttons */}

                      </div>              <div className="flex items-center gap-2">

                    </div>                {/* Generate Report Button */}

                  )}                <button

                  onClick={handleGenerateReport}

                  {/* Fleet Filter */}                  disabled={selectedInstalls.length === 0 || loading}

                  {filterOptions.fleets.length > 0 && (                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${

                    <div>                    selectedInstalls.length === 0 || loading

                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fleet</h3>                      ? 'bg-gray-400 text-white cursor-not-allowed'

                      <div className="flex flex-wrap gap-1">                      : 'bg-blue-600 hover:bg-blue-700 text-white'

                        {filterOptions.fleets.map((fleet) => (                  }`}

                          <button                >

                            key={fleet}                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            onClick={() => {                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                              setSelectedFleets(prev =>                   </svg>

                                prev.includes(fleet)                   {loading ? 'Generating...' : 'Generate Report'}

                                  ? prev.filter(s => s !== fleet)                </button>

                                  : [...prev, fleet]                

                              )                {/* Export CSV Button */}

                            }}                {filteredInstalls.length > 0 && (

                            className={`px-2 py-1 text-xs rounded border transition-colors ${                  <button

                              selectedFleets.includes(fleet)                    onClick={() => {

                                ? 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-800 dark:border-indigo-600 dark:text-indigo-200'                      const csvContent = [

                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-500'                        ['Device Name', 'Serial Number', 'Managed Item', 'Version', 'Status', 'Source', 'Platform', 'Usage', 'Catalog', 'Room', 'Fleet', 'Last Seen'].join(','),

                            }`}                        ...filteredInstalls.flatMap(install => 

                          >                          install.packages.map(pkg => [

                            {fleet}                            install.deviceName,

                          </button>                            install.serialNumber,

                        ))}                            pkg.name,

                      </div>                            pkg.version || '',

                    </div>                            pkg.status || '',

                  )}                            pkg.source || '',

                </div>                            getDevicePlatform(install),

              </div>                            install.raw?.inventory?.usage || '',

            </div>                            install.raw?.inventory?.catalog || '',

          )}                            install.raw?.inventory?.location || '',

                            install.raw?.inventory?.fleet || '',

          {/* Loading Progress */}                            formatRelativeTime(install.lastSeen || '')

          {loading && loadingProgress && (                          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))

            <div className="px-6 py-4">                        )

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">                      ].join('\n')

                <div className="flex items-center justify-between mb-2">                      

                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

                    {loadingProgress?.status || 'Loading...'}                      const link = document.createElement('a')

                  </span>                      const url = URL.createObjectURL(blob)

                  <span className="text-sm text-gray-500 dark:text-gray-400">                      link.setAttribute('href', url)

                    {loadingProgress?.current || 0} / {loadingProgress?.total || 0}                      link.setAttribute('download', `managed-items-report-${new Date().toISOString().split('T')[0]}.csv`)

                  </span>                      link.style.visibility = 'hidden'

                </div>                      document.body.appendChild(link)

                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">                      link.click()

                  <div                       document.body.removeChild(link)

                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"                     }}

                    style={{                     className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"

                      width: `${(loadingProgress?.total ?? 0) > 0 ? ((loadingProgress?.current ?? 0) / (loadingProgress?.total ?? 1)) * 100 : 0}%`                   >

                    }}                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  ></div>                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                </div>                    </svg>

              </div>                    Export CSV

            </div>                  </button>

          )}                )}

              </div>

          {/* Results Table */}            </div>

          {filteredInstalls.length > 0 && (          </div>

            <div className="overflow-x-auto">

              <table className="w-full">          {/* Error Display */}

                <thead className="bg-gray-50 dark:bg-gray-700">          {error && (

                  <tr>            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>              {error}

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Managed Item</th>            </div>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>          )}

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Seen</th>                    </svg>

                  </tr>                  </div>

                </thead>                  <input

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">                    type="text"

                  {filteredInstalls.flatMap((install, installIndex) =>                     placeholder="Search to filter managed items..."

                    install.packages.map((pkg, pkgIndex) => (                    value={searchQuery}

                      <tr key={`${installIndex}-${pkgIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">                    onChange={(e) => setSearchQuery(e.target.value)}

                        <td className="px-6 py-4 whitespace-nowrap">                    className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                          <div>                  />

                            <div className="text-sm font-medium text-gray-900 dark:text-white">                  {searchQuery && (

                              {install.deviceName}                    <button

                            </div>                      onClick={() => setSearchQuery('')}

                            <div className="text-sm text-gray-500 dark:text-gray-400">                      className="absolute inset-y-0 right-0 pr-3 flex items-center"

                              {install.serialNumber}                    >

                            </div>                      <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            {install.usage && (                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                              <div className="text-xs text-gray-400 dark:text-gray-500">                      </svg>

                                {install.usage} | {install.catalog}                    </button>

                              </div>                  )}

                            )}                </div>

                          </div>                

                        </td>                {/* Action Buttons */}

                        <td className="px-6 py-4 whitespace-nowrap">                <div className="flex items-center gap-2">

                          <div className="text-sm font-medium text-gray-900 dark:text-white">                  {/* Generate Report Button */}

                            {pkg.name}                  <button

                          </div>                    onClick={handleGenerateReport}

                        </td>                    disabled={selectedInstalls.length === 0 || loading}

                        <td className="px-6 py-4 whitespace-nowrap">                    className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${

                          <div className="text-sm text-gray-900 dark:text-white">                      selectedInstalls.length === 0 || loading

                            {pkg.version || '-'}                        ? 'bg-gray-400 text-white cursor-not-allowed'

                          </div>                        : 'bg-blue-600 hover:bg-blue-700 text-white'

                        </td>                    }`}

                        <td className="px-6 py-4 whitespace-nowrap">                  >

                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(pkg.status)}`}>                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            {pkg.status || 'Unknown'}                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                          </span>                    </svg>

                        </td>                    {loading ? 'Generating...' : 'Generate Report'}

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">                  </button>

                          {pkg.source || '-'}                  

                        </td>                  {/* Export CSV Button */}

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">                  {filteredInstalls.length > 0 && (

                          {getDevicePlatform(install)}                    <button

                        </td>                      onClick={() => {

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">                        const csvContent = [

                          {formatRelativeTime(install.lastSeen)}                          ['Device Name', 'Serial Number', 'Package', 'Version', 'Status', 'Source', 'Platform', 'Usage', 'Catalog', 'Room', 'Fleet', 'Last Seen'].join(','),

                        </td>                          ...filteredInstalls.flatMap(install => 

                      </tr>                            install.packages.map(pkg => [

                    ))                              install.deviceName,

                  )}                              install.serialNumber,

                </tbody>                              pkg.name,

              </table>                              pkg.version || '',

            </div>                              pkg.status || '',

          )}                              pkg.source || '',

                              getDevicePlatform(install),

          {/* No Results Message */}                              install.raw?.inventory?.usage || '',

          {!loading && installs.length === 0 && (                              install.raw?.inventory?.catalog || '',

            <div className="px-6 py-12 text-center">                              install.raw?.inventory?.location || '',

              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">                              install.raw?.inventory?.fleet || '',

                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">                              formatRelativeTime(install.lastSeen || '')

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />                            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))

                </svg>                          )

              </div>                        ].join('\n')

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">                        

                No Managed Items Report Generated                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

              </h3>                        const link = document.createElement('a')

              <p className="text-gray-600 dark:text-gray-400 mb-4">                        const url = URL.createObjectURL(blob)

                Select managed items from the filters above and click "Generate Report" to view results.                        link.setAttribute('href', url)

              </p>                        link.setAttribute('download', `installs-report-${new Date().toISOString().split('T')[0]}.csv`)

            </div>                        link.style.visibility = 'hidden'

          )}                        document.body.appendChild(link)

        </div>                        link.click()

      </div>                        document.body.removeChild(link)

    </div>                      }}

  )                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"

}                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

export default function InstallsPage() {                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

  return (                      </svg>

    <Suspense fallback={                      Export CSV

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">                    </button>

        <div className="text-center">                  )}

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>                </div>

          <p className="text-gray-600 dark:text-gray-400">Loading install reports...</p>              </div>

        </div>            </div>

      </div>          </div>

    }>

      <InstallsPageContent />          {/* Error Display */}

    </Suspense>          {error && (

  )            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">

}              {error}
            </div>
          )}

          {/* Filter Clouds Section */}
          {!filtersLoading && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                
                {/* Inventory Filter Sections - Top */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Usage Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage {selectedUsages.length > 0 && `(${selectedUsages.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.usages?.map(usage => (
                        <button
                          key={usage}
                          onClick={() => toggleUsage(usage.toLowerCase())}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedUsages.includes(usage.toLowerCase())
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {usage}
                        </button>
                      )) || (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No usage data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Catalog Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catalog {selectedCatalogs.length > 0 && `(${selectedCatalogs.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.catalogs?.map(catalog => (
                        <button
                          key={catalog}
                          onClick={() => toggleCatalog(catalog.toLowerCase())}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedCatalogs.includes(catalog.toLowerCase())
                              ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {catalog}
                        </button>
                      )) || (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No catalog data available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fleet Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fleet {selectedFleets.length > 0 && `(${selectedFleets.length} selected)`}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.fleets?.map(fleet => (
                        <button
                          key={fleet}
                          onClick={() => toggleFleet(fleet)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedFleets.includes(fleet)
                              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {fleet}
                        </button>
                      )) || (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No fleet data available
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Room Filter Cloud - Full Width */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Room {selectedRooms.length > 0 && `(${selectedRooms.length} selected)`}
                    </h3>
                  </div>
                  <div className="h-20 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      {filterOptions.rooms?.length > 0 ? (
                        <>
                          {filterOptions.rooms
                            .filter(room => room.toLowerCase().includes(searchQuery.toLowerCase()))
                            .slice(0, 200).map(room => (
                            <button
                              key={room}
                              onClick={() => toggleRoom(room)}
                              className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                selectedRooms.includes(room)
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-600'
                                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                              }`}
                            >
                              {room}
                            </button>
                          ))}
                          {filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length > 200 && (
                            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                              +{filterOptions.rooms.filter(room => room.toLowerCase().includes(searchQuery.toLowerCase())).length - 200} more (search to filter)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No room data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Installs Filter Cloud - SMART FILTERING */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Managed Items {selectedInstalls.length > 0 && `(${selectedInstalls.length} selected)`}
                    </h3>
                    {(filterOptions.managedInstalls?.length || 0) > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filterOptions.managedInstalls?.length || 0} managed • {filterOptions.unmanagedInstalls?.length || 0} unmanaged
                      </span>
                    )}
                  </div>
                  <div className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <div className="flex flex-wrap gap-1">
                      
                      {/* Managed Installs */}
                      {filterOptions.managedInstalls
                        ?.filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 100).map((installName: string) => (
                        <button
                          key={installName}
                          onClick={() => toggleInstall(installName)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(installName)
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500'
                          }`}
                        >
                          {installName}
                        </button>
                      ))}

                      {/* Unmanaged Installs */}
                      {filterOptions.unmanagedInstalls
                        ?.filter((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 100).map((installName: string) => (
                        <button
                          key={installName}
                          onClick={() => toggleInstall(installName)}
                          className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                            selectedInstalls.includes(installName)
                              ? 'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          {installName}
                        </button>
                      ))}

                      {/* Show more indicator */}
                      {((filterOptions.managedInstalls?.length || 0) + (filterOptions.unmanagedInstalls?.length || 0)) > 200 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{((filterOptions.managedInstalls?.length || 0) + (filterOptions.unmanagedInstalls?.length || 0)) - 200} more installs (search to filter)
                        </span>
                      )}
                      
                      {/* No data message */}
                      {(filterOptions.managedInstalls?.length || 0) === 0 && (filterOptions.unmanagedInstalls?.length || 0) === 0 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          No install data available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Progress */}
          {loadingProgress && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {loadingProgress?.status || 'Loading...'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {loadingProgress?.current || 0} / {loadingProgress?.total || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(loadingProgress?.total ?? 0) > 0 ? ((loadingProgress?.current ?? 0) / (loadingProgress?.total ?? 1)) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Results Section - Only show if we have data */}
          {installs.length > 0 && (
            <>
              {/* Install Results Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Install Details ({filteredInstalls.length} devices)
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Device
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Platform
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Packages
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Seen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredInstalls.map((install) => (
                        <tr key={install.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {install.deviceName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {install.serialNumber}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {getDevicePlatform(install)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {install.packages?.slice(0, 3).map((pkg, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {pkg.name}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    v{pkg.version}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(pkg.status)}`}>
                                    {pkg.status}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {pkg.source}
                                  </span>
                                </div>
                              ))}
                              {install.packages && install.packages.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  +{install.packages.length - 3} more packages
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {install.lastSeen ? formatDateTime(install.lastSeen) : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/device/${install.serialNumber}`}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* No data message when no filters selected */}
          {installs.length === 0 && !loading && selectedInstalls.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select Install Packages to Analyze
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose from the managed installs or unmanaged packages above to generate your report.
              </p>
            </div>
          )}

          {/* No results message when filters selected but no data */}
          {installs.length === 0 && !loading && selectedInstalls.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Devices Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No devices found with the selected install packages. Try adjusting your selection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InstallsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading install reports...</p>
        </div>
      </div>
    }>
      <InstallsPageContent />
    </Suspense>
  )
}