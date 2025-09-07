"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { formatRelativeTime } from "../../../src/lib/time"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { 
  ArchitectureDonutChart, 
  MemoryBreakdownChart, 
  HardwareModelChart,
  DeviceTypeDonutChart 
} from "../../../src/lib/modules/graphs"

interface HardwareRecord {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  processor: string | object | any
  processorSpeed?: string
  processorCores?: number
  memory: string | number | object | any
  memoryModules: any[]
  storage: any[]
  graphics: any[] | object | string | any
  motherboard?: any
  architecture?: string
  assetTag?: string
  raw?: any
}

function HardwarePageContent() {
  const [hardware, setHardware] = useState<HardwareRecord[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [processorFilter, setProcessorFilter] = useState<string>('all')
  
  // Chart filter states
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedMemoryRanges, setSelectedMemoryRanges] = useState<string[]>([])
  const [selectedArchitectures, setSelectedArchitectures] = useState<string[]>([])
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  
  // Handler functions for chart interactions
  const handleModelToggle = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    )
  }

  const handleMemoryRangeToggle = (memoryRange: string) => {
    setSelectedMemoryRanges(prev => 
      prev.includes(memoryRange) 
        ? prev.filter(m => m !== memoryRange)
        : [...prev, memoryRange]
    )
  }

  const handleArchitectureToggle = (architecture: string) => {
    setSelectedArchitectures(prev => 
      prev.includes(architecture) 
        ? prev.filter(a => a !== architecture)
        : [...prev, architecture]
    )
  }

  const handleDeviceTypeToggle = (deviceType: string) => {
    setSelectedDeviceTypes(prev => 
      prev.includes(deviceType) 
        ? prev.filter(d => d !== deviceType)
        : [...prev, deviceType]
    )
  }

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        // If this platform is currently selected, remove it
        return prev.filter(p => p !== platform)
      } else {
        // If this platform is not selected, make it the only selected platform (mutually exclusive)
        return [platform]
      }
    })
  }
  
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) setSearchQuery(urlSearch)
    
    const urlProcessor = searchParams.get('processor')
    if (urlProcessor) setProcessorFilter(urlProcessor)
  }, [searchParams])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🚀 Fetching hardware data using optimized bulk API...')
        
        // Use the new bulk hardware API - single call instead of multiple individual calls
        const hardwareResponse = await fetch('/api/devices/hardware', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!hardwareResponse.ok) {
          throw new Error(`Hardware API request failed: ${hardwareResponse.status}`)
        }
        
        const hardwareData = await hardwareResponse.json()
        
        console.log(`✅ Loaded ${hardwareData.length} devices with hardware data in single API call`)
        console.log('📊 Cache headers:', {
          dataSource: hardwareResponse.headers.get('X-Data-Source'),
          fetchedAt: hardwareResponse.headers.get('X-Fetched-At')
        })
        
        // Still fetch devices for additional name mapping (this is already cached)
        const devicesResponse = await fetch('/api/devices', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        let devicesData = []
        if (devicesResponse.ok) {
          devicesData = await devicesResponse.json()
        }
        
        if (Array.isArray(hardwareData)) {
          setHardware(hardwareData)
          setError(null)
        } else {
          throw new Error('Invalid hardware API response format')
        }
        
        if (Array.isArray(devicesData)) {
          setDevices(devicesData)
        } else {
          console.warn('Invalid devices API response format')
          setDevices([])
        }
        
      } catch (error) {
        console.error('❌ Failed to fetch data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setHardware([])
        setDevices([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process hardware info for each device to get proper device names
  const processedHardware = hardware.map(hardwareRecord => {
    // Find the corresponding device from the main devices API to get the proper name
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === hardwareRecord.deviceId || 
      d.serialNumber === hardwareRecord.serialNumber
    )
    
    // Debug logging to verify device name mapping
    if (deviceFromMainAPI && deviceFromMainAPI.name !== hardwareRecord.deviceName) {
      console.log(`[HARDWARE PAGE] Device name mapping: "${hardwareRecord.deviceName}" -> "${deviceFromMainAPI.name}"`)
    }
    
    // Extract architecture from various sources
    let architecture = 'Unknown'
    
    // First try from the hardware module architecture field
    if (hardwareRecord.architecture) {
      architecture = hardwareRecord.architecture
    }
    // Try from device modules if available
    else if (deviceFromMainAPI?.modules?.hardware?.processor?.architecture) {
      architecture = deviceFromMainAPI.modules.hardware.processor.architecture
    }
    // Try from system module
    else if (deviceFromMainAPI?.modules?.system?.operatingSystem?.architecture) {
      architecture = deviceFromMainAPI.modules.system.operatingSystem.architecture
    }
    // Try from raw hardware data
    else if (hardwareRecord.raw?.processor?.architecture) {
      architecture = hardwareRecord.raw.processor.architecture
    }
    // Try from raw data architecture field
    else if (hardwareRecord.raw?.architecture) {
      architecture = hardwareRecord.raw.architecture
    }
    
    // Check for ARM64 indicators in processor and graphics data
    const processorText = (hardwareRecord.processor || '').toString().toLowerCase()
    const graphicsText = (hardwareRecord.graphics || '').toString().toLowerCase()
    
    // Check if this is an ARM64 device based on processor/graphics
    const isARM64Device = processorText.includes('snapdragon') || 
                         processorText.includes('apple m') || 
                         processorText.includes('apple silicon') ||
                         graphicsText.includes('qualcomm adreno') ||
                         graphicsText.includes('apple gpu')
    
    // Comprehensive debug logging for ARM64 detection
    if (hardwareRecord.serialNumber === '0F33V9G25083HJ') {
      console.log(`[ARM64 COMPREHENSIVE DEBUG] Device ${hardwareRecord.serialNumber}:`, {
        rawProcessor: hardwareRecord.processor,
        rawGraphics: hardwareRecord.graphics,
        processorText,
        graphicsText,
        snapdragonCheck: processorText.includes('snapdragon'),
        qualcommCheck: graphicsText.includes('qualcomm adreno'),
        isARM64Device,
        originalArch: hardwareRecord.architecture,
        finalArch: isARM64Device ? 'ARM64' : architecture,
        completeHardwareRecord: hardwareRecord
      })
    }

    // Debug logging for ARM64 detection
    if (processorText.includes('snapdragon') || graphicsText.includes('qualcomm adreno')) {
      console.log(`[ARM64 DEBUG] Device ${hardwareRecord.serialNumber}:`, {
        processorText,
        graphicsText,
        isARM64Device,
        originalArch: hardwareRecord.architecture,
        finalArch: isARM64Device ? 'ARM64' : architecture
      })
    }
    
    // If we detected ARM64 indicators, override the architecture
    if (isARM64Device) {
      architecture = 'ARM64'
    }
    // Otherwise, normalize architecture names
    else if (architecture && architecture !== 'Unknown') {
      const normalizedArch = architecture.toLowerCase().trim()
      if (normalizedArch.includes('arm64') || normalizedArch.includes('aarch64')) {
        architecture = 'ARM64'
      } else if (normalizedArch.includes('x64') || normalizedArch.includes('amd64') || normalizedArch.includes('x86_64') || normalizedArch.includes('64-bit')) {
        architecture = 'x64'
      } else if (normalizedArch.includes('x86') && !normalizedArch.includes('64')) {
        architecture = 'x86'
      } else if (normalizedArch.includes('ia64')) {
        architecture = 'IA64'
      }
    }
    
    return {
      ...hardwareRecord,
      // Use the device name from the main API if available, fallback to hardware module data
      deviceName: deviceFromMainAPI?.name || hardwareRecord.deviceName || hardwareRecord.serialNumber,
      // Include assetTag from inventory data if available
      assetTag: deviceFromMainAPI?.modules?.inventory?.assetTag,
      // Include processed architecture
      architecture: architecture,
    }
  })

  // Debug logging for chart data  
  console.log('Hardware Page Debug:', {
    devicesCount: devices.length,
    hardwareCount: hardware.length,
    sampleDevice: devices[0],
    sampleHardware: hardware[0],
    processedHardwareSample: processedHardware[0]
  })
  
  // Search for the ARM64 device specifically
  const targetDevice = hardware.find(h => h.serialNumber === '0F33V9G25083HJ')
  const targetDeviceInMainAPI = devices.find(d => d.serialNumber === '0F33V9G25083HJ')
  if (targetDevice) {
    console.log('[DEVICE FOUND] 0F33V9G25083HJ hardware record:', targetDevice)
  } else {
    const allHardwareSerials = hardware.map(h => h.serialNumber || h.deviceId);
    const allDeviceSerials = devices.map(d => d.serialNumber || d.deviceId);
    
    console.log('[DEVICE NOT FOUND] 0F33V9G25083HJ not in hardware array.');
    console.log('[HARDWARE SERIALS] Total hardware devices:', allHardwareSerials.length);
    console.log('[HARDWARE SERIALS] Sample serials:', allHardwareSerials.slice(0, 20));
    
    // Check for partial matches in hardware
    const partialHardwareMatches = allHardwareSerials.filter(serial => 
      serial && (serial.includes('0F33') || serial.includes('V9G2') || serial.includes('5083'))
    );
    if (partialHardwareMatches.length > 0) {
      console.log('[PARTIAL MATCH] Found potential matches in hardware:', partialHardwareMatches);
    }
  }
  if (targetDeviceInMainAPI) {
    console.log('[MAIN API] 0F33V9G25083HJ found in devices API:', {
      deviceId: targetDeviceInMainAPI.deviceId,
      serialNumber: targetDeviceInMainAPI.serialNumber,
      name: targetDeviceInMainAPI.name,
      hasHardwareModule: !!targetDeviceInMainAPI.modules?.hardware,
      hardwareModuleKeys: targetDeviceInMainAPI.modules?.hardware ? Object.keys(targetDeviceInMainAPI.modules.hardware) : 'none',
      processorInfo: targetDeviceInMainAPI.modules?.hardware?.processor || 'no processor info',
      graphicsInfo: targetDeviceInMainAPI.modules?.hardware?.graphics || 'no graphics info'
    })
  } else {
    const allDeviceSerials = devices.map(d => d.serialNumber || d.deviceId);
    
    console.log('[MAIN API] 0F33V9G25083HJ not found in devices API either.');
    console.log('[DEVICE SERIALS] Total devices:', allDeviceSerials.length);
    console.log('[DEVICE SERIALS] Sample serials:', allDeviceSerials.slice(0, 20));
    
    // Check for partial matches in main API
    const partialDeviceMatches = allDeviceSerials.filter(serial => 
      serial && (serial.includes('0F33') || serial.includes('V9G2') || serial.includes('5083'))
    );
    if (partialDeviceMatches.length > 0) {
      console.log('[PARTIAL MATCH] Found potential matches in devices:', partialDeviceMatches);
    }
  }

  // Get unique processor families for filter
  const processorFamilies = Array.from(new Set(
    processedHardware.map(h => {
      let processorStr = ''
      if (typeof h.processor === 'string') {
        processorStr = h.processor.toLowerCase()
      } else if (typeof h.processor === 'object' && h.processor) {
        processorStr = ((h.processor as any).name || (h.processor as any).model || '').toLowerCase()
      }
      
      if (processorStr.includes('intel')) return 'Intel'
      if (processorStr.includes('amd')) return 'AMD'
      if (processorStr.includes('apple')) return 'Apple'
      return 'Other'
    })
  )).sort()

  // Helper function to get memory range for a device
  const getMemoryRange = (memory: any): string => {
    let memoryGB = 0
    
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      if (memObj.totalPhysical) {
        memoryGB = typeof memObj.totalPhysical === 'number' 
          ? memObj.totalPhysical / (1024 * 1024 * 1024)
          : parseFloat(memObj.totalPhysical) || 0
      }
    } else if (typeof memory === 'number') {
      memoryGB = memory / (1024 * 1024 * 1024)
    } else if (typeof memory === 'string') {
      const match = memory.match(/(\d+(?:\.\d+)?)\s*GB/i)
      if (match) {
        memoryGB = parseFloat(match[1])
      }
    }
    
    if (memoryGB <= 4) return '≤4 GB'
    if (memoryGB <= 8) return '4-8 GB'
    if (memoryGB <= 16) return '8-16 GB'
    if (memoryGB <= 32) return '16-32 GB'
    if (memoryGB <= 64) return '32-64 GB'
    return '>64 GB'
  }

  // Helper function to get device model
  const getDeviceModel = (h: any): string => {
    const deviceFromMainAPI = devices.find(d => 
      d.deviceId === h.deviceId || 
      d.serialNumber === h.serialNumber
    )
    
    return deviceFromMainAPI?.model || 
           deviceFromMainAPI?.modules?.hardware?.model ||
           deviceFromMainAPI?.modules?.system?.hardwareInfo?.model ||
           h.raw?.model ||
           h.raw?.system?.hardwareInfo?.model ||
           h.raw?.hardware?.model ||
           'Unknown Model'
  }

  // Helper function to determine device type
  const getDeviceType = (h: any): string => {
    const model = getDeviceModel(h)
    if (model.toLowerCase().includes('macbook') || model.toLowerCase().includes('imac') || model.toLowerCase().includes('mac')) {
      return 'Mac'
    }
    if (model.toLowerCase().includes('surface')) {
      return 'Surface'
    }
    if (model.toLowerCase().includes('thinkpad') || model.toLowerCase().includes('laptop')) {
      return 'Laptop'
    }
    if (model.toLowerCase().includes('desktop') || model.toLowerCase().includes('optiplex')) {
      return 'Desktop'
    }
    return 'Other'
  }

  // Helper function to determine platform from device model
  const getDevicePlatform = (h: any): 'Windows' | 'Macintosh' | 'Other' => {
    const model = getDeviceModel(h)
    
    // Debug logging to see what models we have
    if (process.env.NODE_ENV === 'development') {
      console.log('Platform detection for device:', h.serialNumber || h.deviceId, 'Model:', model)
    }
    
    if (model.toLowerCase().includes('macbook') || 
        model.toLowerCase().includes('imac') || 
        model.toLowerCase().includes('mac mini') ||
        model.toLowerCase().includes('mac pro') ||
        model.toLowerCase().includes('mac studio')) {
      return 'Macintosh'
    }
    // Most other devices are Windows
    return 'Windows'
  }

  // Filter hardware
  const filteredHardware = processedHardware.filter(h => {
    // Existing processor filter
    if (processorFilter !== 'all') {
      let processorStr = ''
      if (typeof h.processor === 'string') {
        processorStr = h.processor.toLowerCase()
      } else if (typeof h.processor === 'object' && h.processor) {
        processorStr = ((h.processor as any).name || (h.processor as any).model || '').toLowerCase()
      }
      
      const family = processorStr.includes(processorFilter.toLowerCase())
      if (!family) return false
    }

    // Chart filters
    if (selectedModels.length > 0) {
      const deviceModel = getDeviceModel(h)
      if (!selectedModels.includes(deviceModel)) return false
    }

    if (selectedMemoryRanges.length > 0) {
      const memoryRange = getMemoryRange(h.memory)
      if (!selectedMemoryRanges.includes(memoryRange)) return false
    }

    if (selectedArchitectures.length > 0) {
      const arch = h.architecture || 'Unknown'
      if (!selectedArchitectures.includes(arch)) return false
    }

    if (selectedDeviceTypes.length > 0) {
      const deviceType = getDeviceType(h)
      if (!selectedDeviceTypes.includes(deviceType)) return false
    }

    if (selectedPlatforms.length > 0) {
      const platform = getDevicePlatform(h)
      if (!selectedPlatforms.includes(platform)) return false
    }

    // Existing search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      
      let processorSearchStr = ''
      if (typeof h.processor === 'string') {
        processorSearchStr = h.processor.toLowerCase()
      } else if (typeof h.processor === 'object' && h.processor) {
        processorSearchStr = ((h.processor as any).name || (h.processor as any).model || '').toLowerCase()
      }
      
      let memorySearchStr = ''
      if (typeof h.memory === 'string') {
        memorySearchStr = h.memory.toLowerCase()
      } else if (typeof h.memory === 'object' && h.memory) {
        // Convert memory object to searchable string
        const memObj = h.memory as any
        memorySearchStr = `${memObj.totalPhysical || ''} ${memObj.totalVirtual || ''} ${memObj.availablePhysical || ''}`.toLowerCase()
      }
      
      return (
        h.deviceName?.toLowerCase().includes(query) ||
        processorSearchStr.includes(query) ||
        memorySearchStr.includes(query) ||
        h.serialNumber?.toLowerCase().includes(query) ||
        h.assetTag?.toLowerCase().includes(query)
      )
    }
    
    return true
  }).sort((a, b) => {
    // Sort alphabetically by device name (Device column)
    const deviceNameA = (a.deviceName || a.serialNumber || '').toLowerCase()
    const deviceNameB = (b.deviceName || b.serialNumber || '').toLowerCase()
    return deviceNameA.localeCompare(deviceNameB)
  })

  const formatMemory = (memory: string | number | object | any) => {
    // Handle memory object with physical/virtual properties
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      if (memObj.totalPhysical) {
        const physicalGB = typeof memObj.totalPhysical === 'number' 
          ? (memObj.totalPhysical / 1073741824).toFixed(1)
          : memObj.totalPhysical
        return `${physicalGB} GB`
      }
      // Fallback to any numeric property in the object
      const numericValue = Object.values(memObj).find(val => typeof val === 'number') as number
      if (numericValue) {
        return numericValue >= 1000000000 ? `${(numericValue / 1073741824).toFixed(1)} GB` : `${Math.round(numericValue / 1048576)} MB`
      }
      return 'Unknown'
    }
    
    // Handle numeric memory values
    if (typeof memory === 'number') {
      return memory >= 1000000000 ? `${(memory / 1073741824).toFixed(1)} GB` : `${Math.round(memory / 1048576)} MB`
    }
    
    // Handle string memory values
    return memory || 'Unknown'
  }

  const formatStorage = (storage: any) => {
    // Handle non-array storage data
    if (!storage) return 'No drives'
    
    // If storage is not an array, try to convert or handle it
    if (!Array.isArray(storage)) {
      // If it's a string or number, return it as-is
      if (typeof storage === 'string') return storage
      if (typeof storage === 'number') {
        return storage >= 1000000000000 ? `${(storage / 1099511627776).toFixed(1)} TB` : `${Math.round(storage / 1073741824)} GB`
      }
      // If it's an object, try to extract meaningful data
      if (typeof storage === 'object') {
        const size = storage.size || storage.capacity || storage.total || 0
        if (size > 0) {
          return size >= 1000000000000 ? `${(size / 1099511627776).toFixed(1)} TB` : `${Math.round(size / 1073741824)} GB`
        }
      }
      return 'Unknown storage'
    }
    
    // Handle array storage data
    if (storage.length === 0) return 'No drives'
    const totalSize = storage.reduce((sum, drive) => {
      const size = drive.size || drive.capacity || 0
      return sum + (typeof size === 'number' ? size : 0)
    }, 0)
    if (totalSize > 0) {
      return totalSize >= 1000000000000 ? `${(totalSize / 1099511627776).toFixed(1)} TB` : `${Math.round(totalSize / 1073741824)} GB`
    }
    return `${storage.length} drives`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse">
        <header className="bg-white dark:bg-gray-900 border-b h-16"></header>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <header className="bg-white dark:bg-gray-900 border-b">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware</h1>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Hardware</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Hardware</h1>
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation */}
              <div className="hidden lg:flex">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>

              {/* Mobile Navigation */}
              <div className="lg:hidden">
                <DevicePageNavigation className="flex items-center gap-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hardware Analytics Charts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <HardwareModelChart 
            devices={processedHardware} 
            loading={loading}
            className=""
            selectedPlatforms={selectedPlatforms}
            onPlatformToggle={handlePlatformToggle}
            selectedModels={selectedModels}
            onModelToggle={handleModelToggle}
            // Global filter context for visual feedback
            globalSelectedMemoryRanges={selectedMemoryRanges}
            globalSelectedArchitectures={selectedArchitectures}
            globalSelectedDeviceTypes={selectedDeviceTypes}
          />
          <MemoryBreakdownChart 
            devices={processedHardware} 
            loading={loading}
            className=""
            selectedMemoryRanges={selectedMemoryRanges}
            onMemoryRangeToggle={handleMemoryRangeToggle}
            // Global filter context for visual feedback
            globalSelectedPlatforms={selectedPlatforms}
            globalSelectedModels={selectedModels}
            globalSelectedArchitectures={selectedArchitectures}
            globalSelectedDeviceTypes={selectedDeviceTypes}
          />
          <ArchitectureDonutChart 
            devices={processedHardware} 
            loading={loading}
            className=""
            selectedArchitectures={selectedArchitectures}
            onArchitectureToggle={handleArchitectureToggle}
            // Global filter context for visual feedback
            globalSelectedPlatforms={selectedPlatforms}
            globalSelectedModels={selectedModels}
            globalSelectedMemoryRanges={selectedMemoryRanges}
            globalSelectedDeviceTypes={selectedDeviceTypes}
          />
          <DeviceTypeDonutChart 
            devices={processedHardware} 
            loading={loading}
            className=""
            selectedDeviceTypes={selectedDeviceTypes}
            onDeviceTypeToggle={handleDeviceTypeToggle}
            // Global filter context for visual feedback
            globalSelectedPlatforms={selectedPlatforms}
            globalSelectedModels={selectedModels}
            globalSelectedMemoryRanges={selectedMemoryRanges}
            globalSelectedArchitectures={selectedArchitectures}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware Inventory</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Device specifications and components • {filteredHardware.length} devices
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by device, serial, asset tag, processor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-64 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Processor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Graphics</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Memory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Storage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Arch</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredHardware.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      <p className="text-lg font-medium mb-1">No hardware data found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredHardware.map((hw) => (
                    <tr key={hw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <Link
                          href={`/device/${encodeURIComponent(hw.serialNumber)}#hardware`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {hw.deviceName || hw.serialNumber || 'Unknown Device'}
                        </Link>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {hw.serialNumber}
                          {hw.assetTag ? ` | ${hw.assetTag}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {(() => {
                            // Try to get model from device data
                            const deviceFromMainAPI = devices.find(d => 
                              d.deviceId === hw.deviceId || 
                              d.serialNumber === hw.serialNumber
                            )
                            
                            // Debug log to see what data is available
                            if (process.env.NODE_ENV === 'development') {
                              console.log('Model debug for device:', hw.serialNumber, {
                                hardwareRaw: hw.raw,
                                deviceFromMainAPI: deviceFromMainAPI,
                                hardwareModuleData: deviceFromMainAPI?.modules?.hardware
                              })
                            }
                            
                            return deviceFromMainAPI?.model || 
                                   deviceFromMainAPI?.modules?.hardware?.model ||
                                   deviceFromMainAPI?.modules?.system?.hardwareInfo?.model ||
                                   hw.raw?.model ||
                                   hw.raw?.system?.hardwareInfo?.model ||
                                   hw.raw?.hardware?.model ||
                                   'Unknown Model'
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            // Try to get manufacturer from device data
                            const deviceFromMainAPI = devices.find(d => 
                              d.deviceId === hw.deviceId || 
                              d.serialNumber === hw.serialNumber
                            )
                            
                            return deviceFromMainAPI?.manufacturer || 
                                   deviceFromMainAPI?.modules?.hardware?.manufacturer ||
                                   deviceFromMainAPI?.modules?.system?.hardwareInfo?.manufacturer ||
                                   hw.raw?.manufacturer ||
                                   hw.raw?.system?.hardwareInfo?.manufacturer ||
                                   hw.raw?.hardware?.manufacturer ||
                                   'Unknown Manufacturer'
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-900 dark:text-white">
                          {typeof hw.processor === 'object' && hw.processor ? 
                            (hw.processor as any).name || (hw.processor as any).model || 'Unknown Processor' : 
                            hw.processor || 'Unknown Processor'
                          }
                        </div>
                        {hw.processorCores && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {hw.processorCores} cores
                            {hw.processorSpeed && ` • ${hw.processorSpeed}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900 dark:text-white">
                        {(() => {
                          // Handle graphics as array
                          if (Array.isArray(hw.graphics) && hw.graphics.length > 0) {
                            const firstGraphics = hw.graphics[0]
                            const displayName = firstGraphics?.name || firstGraphics?.model || firstGraphics?.description || 'Graphics Card'
                            return (
                              <div>
                                <div>{displayName}</div>
                                {hw.graphics.length > 1 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    +{hw.graphics.length - 1} more
                                  </div>
                                )}
                              </div>
                            )
                          }
                          
                          // Handle graphics as object
                          if (typeof hw.graphics === 'object' && hw.graphics !== null && !Array.isArray(hw.graphics)) {
                            const graphicsObj = hw.graphics as any
                            return graphicsObj.name || graphicsObj.model || graphicsObj.description || 'Graphics Card'
                          }
                          
                          // Handle graphics as string
                          if (typeof hw.graphics === 'string' && (hw.graphics as string).trim()) {
                            return hw.graphics
                          }
                          
                          // Check if graphics info is in raw data
                          if (hw.raw?.graphics) {
                            if (Array.isArray(hw.raw.graphics) && hw.raw.graphics.length > 0) {
                              return hw.raw.graphics[0].name || hw.raw.graphics[0].model || 'Graphics Card'
                            }
                            if (typeof hw.raw.graphics === 'string') {
                              return hw.raw.graphics
                            }
                          }
                          
                          return 'Unknown'
                        })()}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900 dark:text-white">
                        {formatMemory(hw.memory)}
                        {hw.memoryModules?.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {hw.memoryModules.length} modules
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900 dark:text-white">
                        {formatStorage(hw.storage)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-900 dark:text-white">
                        {(() => {
                          // Debug log architecture for specific devices
                          if (process.env.NODE_ENV === 'development' && hw.serialNumber === '0F33V9G25083HJ') {
                            console.log(`[ARCHITECTURE RENDER DEBUG] Device ${hw.serialNumber}:`, {
                              displayedArchitecture: hw.architecture || 'Unknown',
                              originalArchitecture: hw.raw?.architecture,
                              processor: hw.processor,
                              graphics: hw.graphics,
                              processorAsString: typeof hw.processor === 'string' ? hw.processor : JSON.stringify(hw.processor),
                              graphicsAsString: typeof hw.graphics === 'string' ? hw.graphics : JSON.stringify(hw.graphics),
                              allHardwareData: hw
                            })
                          }
                          return hw.architecture || 'Unknown'
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HardwarePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <HardwarePageContent />
    </Suspense>
  )
}
