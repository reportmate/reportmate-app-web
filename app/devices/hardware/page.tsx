"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { DevicePageNavigation } from "../../../src/components/navigation/DevicePageNavigation"
import { HardwarePageSkeleton } from "../../../src/components/skeleton/HardwarePageSkeleton"
import { 
  ArchitectureDonutChart, 
  MemoryBreakdownChart, 
  StorageBreakdownChart,
  HardwareTypeChart,
  ProcessorDistributionChart,
  GraphicsDistributionChart,
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
  // Aliases for data compatibility
  gpu?: any[] | object | string | any
  cpu?: string | object | any
  model?: string
  manufacturer?: string
}

function HardwarePageContent() {
  const [hardware, setHardware] = useState<HardwareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [processorFilter, setProcessorFilter] = useState<string>('all')
  
  // Chart filter states
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedMemoryRanges, setSelectedMemoryRanges] = useState<string[]>([])
  const [selectedStorageRanges, setSelectedStorageRanges] = useState<string[]>([])
  const [selectedArchitectures, setSelectedArchitectures] = useState<string[]>([])
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([])
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([])
  const [selectedGraphics, setSelectedGraphics] = useState<string[]>([])
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

  const handleStorageRangeToggle = (storageRange: string) => {
    setSelectedStorageRanges(prev => 
      prev.includes(storageRange) 
        ? prev.filter(s => s !== storageRange)
        : [...prev, storageRange]
    )
  }

  const handleProcessorToggle = (processor: string) => {
    setSelectedProcessors(prev => 
      prev.includes(processor) 
        ? prev.filter(p => p !== processor)
        : [...prev, processor]
    )
  }

  const handleGraphicsToggle = (graphics: string) => {
    setSelectedGraphics(prev => 
      prev.includes(graphics) 
        ? prev.filter(g => g !== graphics)
        : [...prev, graphics]
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

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return selectedModels.length > 0 ||
           selectedMemoryRanges.length > 0 ||
           selectedStorageRanges.length > 0 ||
           selectedArchitectures.length > 0 ||
           selectedDeviceTypes.length > 0 ||
           selectedProcessors.length > 0 ||
           selectedGraphics.length > 0 ||
           selectedPlatforms.length > 0
  }

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setSelectedModels([])
    setSelectedMemoryRanges([])
    setSelectedStorageRanges([])
    setSelectedArchitectures([])
    setSelectedDeviceTypes([])
    setSelectedProcessors([])
    setSelectedGraphics([])
    setSelectedPlatforms([])
    setSearchQuery('')
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
        // OPTIMIZED: Single consolidated API call for hardware data with device names
        const hardwareResponse = await fetch('/api/devices/hardware', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (!hardwareResponse.ok) {
          throw new Error(`Hardware API request failed: ${hardwareResponse.status}`)
        }
        
        const hardwareData = await hardwareResponse.json()
        
        if (Array.isArray(hardwareData)) {
          setHardware(hardwareData)
          setError(null)
        } else {
          console.error('Hardware data is not an array:', typeof hardwareData, hardwareData)
          throw new Error('Invalid hardware API response format')
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        setHardware([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process hardware info - deviceName is now included in the API response
  const processedHardware = hardware.map(hardwareRecord => {
    // Extract architecture from various sources in the hardware record
    let architecture = 'Unknown'
    
    // First try from the hardware module architecture field
    if (hardwareRecord.architecture) {
      architecture = hardwareRecord.architecture
    }
    // Try from raw hardware data processor
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
    
    // Get modules from raw data only
    const modules = hardwareRecord.raw?.modules || {}

    // Ensure memory data is populated from modules if missing in record
    let memory = hardwareRecord.memory
    if (!memory || memory === 'Unknown') {
      if (modules?.hardware?.memory) {
        memory = modules.hardware.memory
      } else if (hardwareRecord.raw?.memory) {
        memory = hardwareRecord.raw.memory
      } else if (modules?.system?.hardwareInfo?.memory) {
        memory = modules.system.hardwareInfo.memory
      }
    }

    // Ensure graphics data is populated from modules if missing in record
    let graphics = hardwareRecord.graphics || hardwareRecord.gpu
    if (!graphics || graphics === 'Unknown') {
      if (modules?.hardware?.graphics) {
        graphics = modules.hardware.graphics
      } else if (hardwareRecord.raw?.graphics) {
        graphics = hardwareRecord.raw.graphics
      }
    }

    // Ensure processor data is populated from modules if missing in record
    let processor = hardwareRecord.processor || hardwareRecord.cpu
    let processorCores = hardwareRecord.processorCores
    let processorSpeed = hardwareRecord.processorSpeed

    if (!processor || processor === 'Unknown') {
      let sourceProcessor = null
      
      if (modules?.hardware?.processor) {
        sourceProcessor = modules.hardware.processor
      } else if (hardwareRecord.raw?.processor) {
        sourceProcessor = hardwareRecord.raw.processor
      } else if (modules?.system?.hardwareInfo?.processor) {
        sourceProcessor = modules.system.hardwareInfo.processor
      }

      if (sourceProcessor) {
        processor = sourceProcessor
        
        // Try to extract details if it's an object
        if (typeof sourceProcessor === 'object') {
           if (!processorCores) processorCores = sourceProcessor.cores || sourceProcessor.core_count || sourceProcessor.logicalCores || sourceProcessor.number_of_cores
           if (!processorSpeed) processorSpeed = sourceProcessor.speed || sourceProcessor.frequency || sourceProcessor.currentSpeed || sourceProcessor.current_clock_speed
        }
      }
    }

    return {
      ...hardwareRecord,
      // Use the device name from API (already included by /api/devices/hardware endpoint)
      deviceName: hardwareRecord.deviceName || hardwareRecord.serialNumber,
      // assetTag would need to be fetched separately if needed, but for now skip it
      assetTag: hardwareRecord.assetTag,
      // Include processed architecture
      architecture: architecture,
      // Include modules from raw data
      modules: modules,
      // Ensure memory and graphics are populated
      memory: memory,
      graphics: graphics,
      processor: processor,
      processorCores: processorCores,
      processorSpeed: processorSpeed
    }
  })

  // Debug logging for chart data  
  console.log('Hardware Page Debug:', {
    hardwareCount: hardware.length,
    sampleHardware: hardware[0],
    processedHardwareSample: processedHardware[0]
  })

  // Helper function to get memory range for a device
  const getMemoryRange = (memory: any): string => {
    let memoryGB = 0
    
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      
      // Try totalFormatted first
      if (memObj.totalFormatted) {
         const match = memObj.totalFormatted.match(/(\d+(?:\.\d+)?)\s*GB/i)
         if (match) memoryGB = parseFloat(match[1])
      }
      // Try totalPhysical
      else if (memObj.totalPhysical) {
        const val = memObj.totalPhysical
        if (typeof val === 'number') {
           memoryGB = val / (1024 * 1024 * 1024)
        } else if (typeof val === 'string') {
           // If digits only, parse as bytes
           if (/^\d+$/.test(val)) {
              memoryGB = parseFloat(val) / (1024 * 1024 * 1024)
           } else {
              // Try parsing as string with units
              const match = val.match(/(\d+(?:\.\d+)?)\s*GB/i)
              if (match) memoryGB = parseFloat(match[1])
           }
        }
      }
    } else if (typeof memory === 'number') {
      memoryGB = memory / (1024 * 1024 * 1024)
    } else if (typeof memory === 'string') {
      // If digits only, parse as bytes
      if (/^\d+$/.test(memory)) {
         memoryGB = parseFloat(memory) / (1024 * 1024 * 1024)
      } else {
         const match = memory.match(/(\d+(?:\.\d+)?)\s*GB/i)
         if (match) {
           memoryGB = parseFloat(match[1])
         }
      }
    }
    
    // Match the exact ranges used in MemoryBreakdownChart
    if (memoryGB <= 0) return 'Unknown'
    if (memoryGB <= 4) return '4 GB'
    if (memoryGB <= 8) return '8 GB'
    if (memoryGB <= 16) return '16 GB'
    if (memoryGB <= 32) return '32 GB'
    if (memoryGB <= 64) return '64 GB'
    return '128+ GB'
  }

  // Helper function to get device model - uses data from /api/devices/hardware directly
  const getDeviceModel = (h: any): string => {
    return h.model || 
           h.raw?.model ||
           h.raw?.system?.hardwareInfo?.model ||
           h.raw?.hardware?.model ||
           'Unknown Model'
  }

  // Helper function to determine device type - EXACT SAME LOGIC AS DONUT CHART
  const getDeviceType = (h: any): string => {
    // Get model using exact same logic as donut chart
    const model = h?.model || 
                 h?.modules?.hardware?.model ||
                 h?.modules?.system?.hardwareInfo?.model ||
                 h?.raw?.model ||
                 h?.raw?.system?.hardwareInfo?.model ||
                 h?.raw?.hardware?.model ||
                 'Unknown Model'

    // Categorize based on model - EXACT SAME LOGIC AS DONUT CHART
    return categorizeDeviceType(model)
  }

  // Categorize device type from model - EXACT SAME LOGIC AS DONUT CHART
  const categorizeDeviceType = (model: string): string => {
    const modelLower = model.toLowerCase()
    
    // Desktop indicators
    if (modelLower.includes('desktop') || 
        modelLower.includes('optiplex') || 
        modelLower.includes('precision') ||
        modelLower.includes('workstation') ||
        modelLower.includes('tower') ||
        modelLower.includes('sff') ||
        modelLower.includes('mt') ||
        modelLower.includes('imac') ||
        modelLower.includes('mac pro') ||
        modelLower.includes('mac studio')) {
      return 'Desktop'
    }
    
    // Laptop indicators
    if (modelLower.includes('laptop') || 
        modelLower.includes('book') || 
        modelLower.includes('thinkpad') ||
        modelLower.includes('macbook') ||
        modelLower.includes('pavilion') ||
        modelLower.includes('inspiron') ||
        modelLower.includes('latitude') ||
        modelLower.includes('elitebook') ||
        modelLower.includes('probook') ||
        modelLower.includes('yoga') ||
        modelLower.includes('ideapad') ||
        modelLower.includes('surface laptop')) {
      return 'Laptop'
    }
    
    // Default to Desktop for unknown (most enterprise devices are desktops)
    return 'Desktop'
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

  // Helper function to get storage range
  const getStorageRange = (device: any): string => {
    const storage = device.modules?.hardware?.storage || device.storage
    if (!Array.isArray(storage)) return 'Unknown'
    
    const totalBytes = storage.reduce((sum, drive) => {
      const size = drive.size || drive.capacity || drive.totalSize || 0
      return sum + (typeof size === 'number' ? size : 0)
    }, 0)
    
    const storageGB = Math.round(totalBytes / (1024 * 1024 * 1024))
    
    // Match the exact logic used in StorageBreakdownChart
    if (storageGB === 0) return 'Unknown'
    if (storageGB >= 3500) return '4 TB'
    if (storageGB >= 1800) return '2 TB'
    if (storageGB >= 900) return '1 TB'
    if (storageGB >= 450) return '512 GB'
    if (storageGB >= 200) return '256 GB'
    if (storageGB >= 100) return '128 GB'
    if (storageGB >= 50) return '64 GB'
    return '32 GB'
  }

  // Helper function to get processor name
  const getProcessorName = (device: any): string => {
    const processor = device.processor || 
                     device.modules?.hardware?.processor ||
                     device.raw?.processor ||
                     'Unknown Processor'

    if (typeof processor === 'string') {
      return processor
    }

    if (typeof processor === 'object' && processor !== null) {
      return processor.name || processor.model || processor.brand || 'Unknown Processor'
    }

    return 'Unknown Processor'
  }
  // Helper function to get graphics name
  const getGraphicsName = (device: any): string => {
    // Try modules.hardware.graphics first (prioritized path)
    if (device.modules?.hardware?.graphics) {
      const graphics = device.modules.hardware.graphics
      
      if (typeof graphics === 'string') {
        return graphics
      }
      
      if (Array.isArray(graphics) && graphics.length > 0) {
        const primaryCard = graphics[0]
        return primaryCard.name || primaryCard.model || primaryCard.description || 'Unknown Graphics'
      }
      
      if (typeof graphics === 'object' && graphics !== null) {
        return graphics.name || graphics.model || graphics.description || 'Unknown Graphics'
      }
    }

    // Try direct graphics field
    const directGraphics = device.graphics
    if (directGraphics) {
      if (typeof directGraphics === 'string') {
        return directGraphics
      }
      
      if (Array.isArray(directGraphics) && directGraphics.length > 0) {
        const primaryCard = directGraphics[0]
        return primaryCard.name || primaryCard.model || primaryCard.description || 'Unknown Graphics'
      }
      
      if (typeof directGraphics === 'object' && directGraphics !== null) {
        return directGraphics.name || directGraphics.model || directGraphics.description || 'Unknown Graphics'
      }
    }

    return 'Unknown Graphics'
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

    // Chart filters - Platform filter (apply this before model filter)
    if (selectedPlatforms.length > 0) {
      const platform = getDevicePlatform(h)
      if (!selectedPlatforms.includes(platform)) return false
    }

    // Chart filters - Model filter (this should only apply after platform filter)
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

    // Storage filter
    if (selectedStorageRanges.length > 0) {
      const storageRange = getStorageRange(h)
      if (!selectedStorageRanges.includes(storageRange)) return false
    }

    // Processor filter
    if (selectedProcessors.length > 0) {
      const processorName = getProcessorName(h)
      if (!selectedProcessors.includes(processorName)) return false
    }

    // Graphics filter
    if (selectedGraphics.length > 0) {
      const graphicsName = getGraphicsName(h)
      if (!selectedGraphics.includes(graphicsName)) return false
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

  // Create chart-specific filtered data (each chart excludes its own filters to show proper distributions)
  const getChartFilteredData = (excludeFilters: string[] = []) => {
    return processedHardware.filter(h => {
      // Always apply processor filter
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

      // Platform filter (always apply)
      if (selectedPlatforms.length > 0) {
        const platform = getDevicePlatform(h)
        if (!selectedPlatforms.includes(platform)) return false
      }

      // Apply other filters conditionally
      if (!excludeFilters.includes('models') && selectedModels.length > 0) {
        const deviceModel = getDeviceModel(h)
        if (!selectedModels.includes(deviceModel)) return false
      }

      if (!excludeFilters.includes('memory') && selectedMemoryRanges.length > 0) {
        const memoryRange = getMemoryRange(h.memory)
        if (!selectedMemoryRanges.includes(memoryRange)) return false
      }

      if (!excludeFilters.includes('architectures') && selectedArchitectures.length > 0) {
        const arch = h.architecture || 'Unknown'
        if (!selectedArchitectures.includes(arch)) return false
      }

      if (!excludeFilters.includes('deviceTypes') && selectedDeviceTypes.length > 0) {
        const deviceType = getDeviceType(h)
        if (!selectedDeviceTypes.includes(deviceType)) return false
      }

      if (!excludeFilters.includes('storage') && selectedStorageRanges.length > 0) {
        const storageRange = getStorageRange(h)
        if (!selectedStorageRanges.includes(storageRange)) return false
      }

      if (!excludeFilters.includes('processors') && selectedProcessors.length > 0) {
        const processorName = getProcessorName(h)
        if (!selectedProcessors.includes(processorName)) return false
      }

      if (!excludeFilters.includes('graphics') && selectedGraphics.length > 0) {
        const graphicsName = getGraphicsName(h)
        if (!selectedGraphics.includes(graphicsName)) return false
      }

      return true
    })
  }

  const formatMemory = (memory: string | number | object | any) => {
    // Helper to format bytes to GB without trailing .0
    const formatGB = (bytes: number) => {
      const gb = parseFloat((bytes / 1073741824).toFixed(1))
      return `${gb} GB`
    }

    // Handle memory object
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      
      // Check for totalFormatted first (e.g. "16 GB")
      if (memObj.totalFormatted) {
        return memObj.totalFormatted.replace('.0 GB', ' GB')
      }

      // Check for totalPhysical
      if (memObj.totalPhysical) {
        const val = memObj.totalPhysical
        // If it's a string that looks like bytes (digits only)
        if (typeof val === 'string' && /^\d+$/.test(val)) {
           const bytes = parseFloat(val)
           return bytes >= 1000000000 ? formatGB(bytes) : `${Math.round(bytes / 1048576)} MB`
        }
        // If it's a number
        if (typeof val === 'number') {
           return val >= 1000000000 ? formatGB(val) : `${Math.round(val / 1048576)} MB`
        }
        // If it's a string with units already
        if (typeof val === 'string') {
           return val.replace('.0 GB', ' GB')
        }
      }
      
      // Fallback to any numeric property
      const numericValue = Object.values(memObj).find(val => typeof val === 'number') as number
      if (numericValue) {
        return numericValue >= 1000000000 ? formatGB(numericValue) : `${Math.round(numericValue / 1048576)} MB`
      }
      return 'Unknown'
    }
    
    // Handle numeric memory values (assumed bytes)
    if (typeof memory === 'number') {
      return memory >= 1000000000 ? formatGB(memory) : `${Math.round(memory / 1048576)} MB`
    }
    
    // Handle string memory values
    if (typeof memory === 'string') {
       // If it's just digits, treat as bytes
       if (/^\d+$/.test(memory)) {
          const bytes = parseFloat(memory)
          return bytes >= 1000000000 ? formatGB(bytes) : `${Math.round(bytes / 1048576)} MB`
       }
       return memory.replace('.0 GB', ' GB')
    }
    
    return 'Unknown'
  }

  const formatStorage = (storage: any) => {
    // Debug logging for storage data
    if (process.env.NODE_ENV === 'development') {
      console.log('[STORAGE DEBUG] Raw storage data:', storage, 'Type:', typeof storage)
    }

    // Handle non-array storage data
    if (!storage) return { total: 'No drives', free: null }
    
    // If storage is a string that contains bullet points, parse it
    if (typeof storage === 'string') {
      // Check if it's already formatted with bullet point (e.g., "953 GB SSD • 54 GB free")
      const bulletMatch = storage.match(/^(.+?)\s*•\s*(.+?)\s*free$/i)
      if (bulletMatch) {
        return { total: bulletMatch[1].trim(), free: bulletMatch[2].trim() }
      }
      // If it's just a plain string, return as total
      return { total: storage, free: null }
    }
    
    // If storage is not an array, try to convert or handle it
    if (!Array.isArray(storage)) {
      if (typeof storage === 'number') {
        const formatted = storage >= 1000000000000 ? `${(storage / 1099511627776).toFixed(1)} TB` : `${Math.round(storage / 1073741824)} GB`
        return { total: formatted, free: null }
      }
      // If it's an object, try to extract meaningful data
      if (typeof storage === 'object') {
        const size = storage.size || storage.capacity || storage.total || 0
        const freeSpace = storage.free || storage.available || null
        if (size > 0) {
          const totalFormatted = size >= 1000000000000 ? `${(size / 1099511627776).toFixed(1)} TB` : `${Math.round(size / 1073741824)} GB`
          const freeFormatted = freeSpace && freeSpace > 0 ? 
            (freeSpace >= 1000000000000 ? `${(freeSpace / 1099511627776).toFixed(1)} TB` : `${Math.round(freeSpace / 1073741824)} GB`) 
            : null
          return { total: totalFormatted, free: freeFormatted }
        }
      }
      return { total: 'Unknown storage', free: null }
    }
    
    // Handle array storage data
    if (storage.length === 0) return { total: 'No drives', free: null }
    
    const totalSize = storage.reduce((sum, drive) => {
      const size = drive.size || drive.capacity || 0
      return sum + (typeof size === 'number' ? size : 0)
    }, 0)
    
    const totalFree = storage.reduce((sum, drive) => {
      const free = drive.free || drive.available || 0
      return sum + (typeof free === 'number' ? free : 0)
    }, 0)
    
    if (totalSize > 0) {
      const totalFormatted = totalSize >= 1000000000000 ? `${(totalSize / 1099511627776).toFixed(1)} TB` : `${Math.round(totalSize / 1073741824)} GB`
      const freeFormatted = totalFree > 0 ? 
        (totalFree >= 1000000000000 ? `${(totalFree / 1099511627776).toFixed(1)} TB` : `${Math.round(totalFree / 1073741824)} GB`) 
        : null
      return { total: totalFormatted, free: freeFormatted }
    }
    return { total: `${storage.length} drives`, free: null }
  }

  if (loading) {
    return <HardwarePageSkeleton />
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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Hardware Report</h1>
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

      {/* Main Content - Split Layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Charts and Filters (26%) */}
        <div className="w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            
            {/* Platform Filter Buttons */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePlatformToggle('Windows')}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedPlatforms.includes('Windows')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => handlePlatformToggle('Macintosh')}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedPlatforms.includes('Macintosh')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Macintosh
                </button>
              </div>
            </div>
            
            {/* Hardware Analytics Charts */}
            <div className="space-y-6">
              {/* 1 & 2. Device Type and Architecture - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <DeviceTypeDonutChart 
                  devices={getChartFilteredData(['deviceTypes'])} 
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
                
                <ArchitectureDonutChart 
                  devices={getChartFilteredData(['architectures'])} 
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
              </div>
              
              {/* 3. Memory */}
              <MemoryBreakdownChart 
                devices={getChartFilteredData(['memory'])} 
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
              
              {/* 4. Storage */}
              <StorageBreakdownChart 
                devices={getChartFilteredData(['storage'])} 
                loading={loading}
                className=""
                selectedStorageRanges={selectedStorageRanges}
                onStorageRangeToggle={handleStorageRangeToggle}
                // Global filter context for visual feedback
                globalSelectedPlatforms={selectedPlatforms}
                globalSelectedModels={selectedModels}
                globalSelectedMemoryRanges={selectedMemoryRanges}
                globalSelectedArchitectures={selectedArchitectures}
                globalSelectedDeviceTypes={selectedDeviceTypes}
              />
              
              {/* 5. Model */}
              <HardwareTypeChart 
                devices={getChartFilteredData(['models'])} 
                loading={loading}
                className=""
                selectedModels={selectedModels}
                onModelToggle={handleModelToggle}
                // Global filter context for visual feedback
                globalSelectedPlatforms={selectedPlatforms}
                globalSelectedMemoryRanges={selectedMemoryRanges}
                globalSelectedArchitectures={selectedArchitectures}
                globalSelectedDeviceTypes={selectedDeviceTypes}
              />
              
              {/* 6. Processor */}
              <ProcessorDistributionChart 
                devices={getChartFilteredData(['processors'])} 
                loading={loading}
                className=""
                selectedProcessors={selectedProcessors}
                onProcessorToggle={handleProcessorToggle}
                // Global filter context for visual feedback
                globalSelectedPlatforms={selectedPlatforms}
                globalSelectedModels={selectedModels}
                globalSelectedMemoryRanges={selectedMemoryRanges}
                globalSelectedStorageRanges={selectedStorageRanges}
                globalSelectedArchitectures={selectedArchitectures}
                globalSelectedDeviceTypes={selectedDeviceTypes}
              />
              
              {/* 7. Graphics */}
              <GraphicsDistributionChart 
                devices={getChartFilteredData(['graphics'])} 
                loading={loading}
                className=""
                selectedGraphics={selectedGraphics}
                onGraphicsToggle={handleGraphicsToggle}
                // Global filter context for visual feedback
                globalSelectedPlatforms={selectedPlatforms}
                globalSelectedModels={selectedModels}
                globalSelectedMemoryRanges={selectedMemoryRanges}
                globalSelectedStorageRanges={selectedStorageRanges}
                globalSelectedArchitectures={selectedArchitectures}
                globalSelectedDeviceTypes={selectedDeviceTypes}
                globalSelectedProcessors={selectedProcessors}
              />
            </div>
          </div>
        </div>

        {/* Right Content - Hardware Table (75%) */}
        <div className="flex-1 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Content Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Devices Specs</h2>
                    {hasActiveFilters() && (
                      <button
                        onClick={clearAllFilters}
                        className="px-3 py-1 text-xs font-medium bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {filteredHardware.length} devices
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
                      className="block w-256 pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            </div>

            {/* Hardware Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Loading Hardware</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fetching device specifications...</p>
                  </div>
                </div>
              ) : filteredHardware.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No hardware data found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery.trim() ? 'Try adjusting your search or filter criteria.' : 'No hardware specifications have been discovered on any devices.'}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-48 min-w-0">Device</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-40 min-w-0">Model</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-56 min-w-0">Processor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20 min-w-0">Graphics</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 min-w-0">Memory</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24 min-w-0">Storage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16 min-w-0">Arch</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredHardware.map((hw) => (
                      <tr key={hw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-4 min-w-0">
                          <Link
                            href={`/device/${encodeURIComponent(hw.serialNumber)}#hardware`}
                            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                          >
                            {hw.deviceName || hw.serialNumber || 'Unknown Device'}
                          </Link>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {hw.serialNumber}
                            {hw.assetTag ? ` | ${hw.assetTag}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-0 w-40">
                          <div className="text-xs text-gray-900 dark:text-white">
                            {hw.model || 
                             hw.raw?.model ||
                             hw.raw?.system?.hardwareInfo?.model ||
                             hw.raw?.hardware?.model ||
                             'Unknown Model'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {hw.manufacturer || 
                             hw.raw?.manufacturer ||
                             hw.raw?.system?.hardwareInfo?.manufacturer ||
                             hw.raw?.hardware?.manufacturer ||
                             'Unknown Manufacturer'}
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-0 w-56">
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
                        <td className="px-4 py-4 min-w-0 w-20 text-xs text-gray-900 dark:text-white">
                          {(() => {
                            // Use gpu from API or graphics from raw data
                            const graphicsData = hw.gpu || hw.graphics || hw.raw?.graphics
                            
                            if (!graphicsData) {
                              return <div className="text-gray-500 dark:text-gray-400">Unknown</div>
                            }
                            
                            // Handle as string
                            if (typeof graphicsData === 'string' && graphicsData.trim()) {
                              return <div className="truncate">{graphicsData}</div>
                            }
                            
                            // Handle as object
                            if (typeof graphicsData === 'object' && !Array.isArray(graphicsData)) {
                              const displayName = graphicsData.name || graphicsData.model || graphicsData.description || graphicsData.deviceName || 'Graphics Card'
                              return <div className="truncate">{displayName}</div>
                            }
                            
                            // Handle as array
                            if (Array.isArray(graphicsData) && graphicsData.length > 0) {
                              const firstGraphics = graphicsData[0]
                              let displayName = 'Graphics Card'
                              
                              if (typeof firstGraphics === 'string') {
                                displayName = firstGraphics
                              } else if (typeof firstGraphics === 'object' && firstGraphics) {
                                displayName = firstGraphics.name || firstGraphics.model || firstGraphics.description || firstGraphics.deviceName || 'Graphics Card'
                              }
                              
                              return (
                                <div>
                                  <div className="truncate">{displayName}</div>
                                  {graphicsData.length > 1 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      +{graphicsData.length - 1} more
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            
                            return <div className="text-gray-500 dark:text-gray-400">Unknown</div>
                          })()}
                        </td>
                        <td className="px-4 py-4 min-w-0 w-24 text-xs text-gray-900 dark:text-white">
                          {formatMemory(hw.memory)}
                          {hw.memoryModules?.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {hw.memoryModules.length} modules
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 min-w-0 w-24">
                          {(() => {
                            const storageInfo = formatStorage(hw.storage)
                            return (
                              <div>
                                <div className="text-xs text-gray-900 dark:text-white">{storageInfo.total}</div>
                                {storageInfo.free && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {storageInfo.free} free
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-4 min-w-0 w-16 text-xs text-gray-900 dark:text-white">
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
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
