"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HardwarePageSkeleton } from "../../../src/components/skeleton/HardwarePageSkeleton"
import { usePlatformFilterSafe, normalizePlatform, getDevicePlatformLabel } from "../../../src/providers/PlatformFilterProvider"
import { Copy } from "lucide-react"
import { CollapsibleSection } from "../../../src/components/ui/CollapsibleSection"
import { useScrollCollapse } from "../../../src/hooks/useScrollCollapse"
import { 
  ArchitectureDonutChart, 
  MemoryBreakdownChart, 
  StorageBreakdownChart,
  HardwareTypeChart,
  ProcessorDistributionChart,
  GraphicsDistributionChart,
  DeviceTypeDonutChart 
} from "../../../src/lib/modules/graphs"
import { FitText } from "../../../src/components/ui/FitText"

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
  gpu?: any[] | object | string | any
  cpu?: string | object | any
  model?: string
  manufacturer?: string
  inventory?: {
    usage?: string
    catalog?: string
    location?: string
    department?: string
    owner?: string
  }
}

function HardwarePageContent() {
  const [hardware, setHardware] = useState<HardwareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [processorFilter, setProcessorFilter] = useState<string>('all')
  const { platformFilter: globalPlatformFilter, isPlatformVisible } = usePlatformFilterSafe()
  
  // Accordion states
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)

  const { tableContainerRef, effectiveFiltersExpanded, effectiveWidgetsExpanded } = useScrollCollapse(
    { filters: filtersExpanded, widgets: widgetsExpanded },
    { enabled: !loading }
  )
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<'device' | 'model' | 'processor' | 'memory' | 'storage' | 'arch'>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Chart filter states (controlled by widget charts)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedMemoryRanges, setSelectedMemoryRanges] = useState<string[]>([])
  const [selectedStorageRanges, setSelectedStorageRanges] = useState<string[]>([])
  const [selectedArchitectures, setSelectedArchitectures] = useState<string[]>([])
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([])
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([])
  const [selectedGraphics, setSelectedGraphics] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  
  // Inventory-based filter states (Selections accordion)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  
  // Filter options from inventory data
  const [filterOptions, setFilterOptions] = useState<{
    usages: string[]
    catalogs: string[]
    locations: string[]
  }>({ usages: [], catalogs: [], locations: [] })
  
  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  const handleModelToggle = (model: string) => {
    setSelectedModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model])
  }

  const handleMemoryRangeToggle = (memoryRange: string) => {
    setSelectedMemoryRanges(prev => prev.includes(memoryRange) ? prev.filter(m => m !== memoryRange) : [...prev, memoryRange])
  }

  const handleStorageRangeToggle = (storageRange: string) => {
    setSelectedStorageRanges(prev => prev.includes(storageRange) ? prev.filter(s => s !== storageRange) : [...prev, storageRange])
  }

  const handleProcessorToggle = (processor: string) => {
    setSelectedProcessors(prev => prev.includes(processor) ? prev.filter(p => p !== processor) : [...prev, processor])
  }

  const handleGraphicsToggle = (graphics: string) => {
    setSelectedGraphics(prev => prev.includes(graphics) ? prev.filter(g => g !== graphics) : [...prev, graphics])
  }

  const handleArchitectureToggle = (architecture: string) => {
    setSelectedArchitectures(prev => prev.includes(architecture) ? prev.filter(a => a !== architecture) : [...prev, architecture])
  }

  const handleDeviceTypeToggle = (deviceType: string) => {
    setSelectedDeviceTypes(prev => prev.includes(deviceType) ? prev.filter(d => d !== deviceType) : [...prev, deviceType])
  }

  const _handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [platform])
  }

  // Toggle functions for inventory filters
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])
  }
  const toggleUsage = (usage: string) => {
    setSelectedUsages(prev => prev.includes(usage) ? prev.filter(u => u !== usage) : [...prev, usage])
  }
  const toggleCatalog = (catalog: string) => {
    setSelectedCatalogs(prev => prev.includes(catalog) ? prev.filter(c => c !== catalog) : [...prev, catalog])
  }
  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => prev.includes(location) ? prev.filter(l => l !== location) : [...prev, location])
  }

  const _hasActiveFilters = () => {
    return selectedModels.length > 0 || selectedMemoryRanges.length > 0 || selectedStorageRanges.length > 0 ||
           selectedArchitectures.length > 0 || selectedDeviceTypes.length > 0 || selectedProcessors.length > 0 ||
           selectedGraphics.length > 0 || selectedPlatforms.length > 0 || selectedStatuses.length > 0 ||
           selectedUsages.length > 0 || selectedCatalogs.length > 0 || selectedLocations.length > 0
  }

  // Count for Selections accordion (inventory filters only)
  const totalSelectionsFilters = selectedStatuses.length + selectedUsages.length + selectedCatalogs.length + selectedLocations.length
  
  // Count for all active filters (for Clear button)
  const totalActiveFilters = selectedModels.length + selectedMemoryRanges.length + selectedStorageRanges.length + 
    selectedArchitectures.length + selectedDeviceTypes.length + selectedProcessors.length + 
    selectedGraphics.length + selectedPlatforms.length + selectedStatuses.length +
    selectedUsages.length + selectedCatalogs.length + selectedLocations.length

  const clearAllFilters = () => {
    setSelectedModels([])
    setSelectedMemoryRanges([])
    setSelectedStorageRanges([])
    setSelectedArchitectures([])
    setSelectedDeviceTypes([])
    setSelectedProcessors([])
    setSelectedGraphics([])
    setSelectedPlatforms([])
    setSelectedStatuses([])
    setSelectedUsages([])
    setSelectedCatalogs([])
    setSelectedLocations([])
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
          // Process hardware data to include inventory and status
          const processedData = hardwareData.map((h: any) => {
            // Extract inventory from modules or raw
            const inventory = h.modules?.inventory || h.raw?.inventory || h.inventory || {}
            // Calculate device status from lastSeen
            const now = new Date()
            const lastSeen = h.lastSeen ? new Date(h.lastSeen) : null
            let status = 'missing'
            if (lastSeen) {
              const hoursSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60)
              if (hoursSince < 2) status = 'active'
              else if (hoursSince < 48) status = 'stale'
            }
            
            return {
              ...h,
              inventory,
              status
            }
          })
          
          setHardware(processedData)
          setError(null)
          
          // Extract filter options from inventory data
          const usages = new Set<string>()
          const catalogs = new Set<string>()
          const locations = new Set<string>()
          
          processedData.forEach((h: any) => {
            if (h.inventory?.usage) usages.add(h.inventory.usage)
            if (h.inventory?.catalog) catalogs.add(h.inventory.catalog)
            if (h.inventory?.location) locations.add(h.inventory.location)
          })
          
          setFilterOptions({
            usages: Array.from(usages).sort(),
            catalogs: Array.from(catalogs).sort(),
            locations: Array.from(locations).sort()
          })
        } else {
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

  const processedHardware = hardware.map(hardwareRecord => {
    let architecture = 'Unknown'
    
    if (hardwareRecord.architecture) {
      architecture = hardwareRecord.architecture
    } else if (hardwareRecord.raw?.processor?.architecture) {
      architecture = hardwareRecord.raw.processor.architecture
    } else if (hardwareRecord.raw?.architecture) {
      architecture = hardwareRecord.raw.architecture
    }
    
    const processorText = (hardwareRecord.processor || '').toString().toLowerCase()
    const graphicsText = (hardwareRecord.graphics || '').toString().toLowerCase()
    
    const isARM64Device = processorText.includes('snapdragon') || processorText.includes('apple m') || 
                         processorText.includes('apple silicon') || graphicsText.includes('qualcomm adreno') ||
                         graphicsText.includes('apple gpu')
    
    if (isARM64Device) {
      architecture = 'ARM64'
    } else if (architecture && architecture !== 'Unknown') {
      const normalizedArch = architecture.toLowerCase().trim()
      if (normalizedArch.includes('arm64') || normalizedArch.includes('aarch64')) {
        architecture = 'ARM64'
      } else if (normalizedArch.includes('x64') || normalizedArch.includes('amd64') || normalizedArch.includes('x86_64') || normalizedArch.includes('64-bit')) {
        architecture = 'x64'
      } else if (normalizedArch.includes('x86') && !normalizedArch.includes('64')) {
        architecture = 'x86'
      }
    }
    
    const modules = hardwareRecord.raw?.modules || {}
    let memory = hardwareRecord.memory
    if (!memory || memory === 'Unknown') {
      memory = modules?.hardware?.memory || hardwareRecord.raw?.memory || modules?.system?.hardwareInfo?.memory
    }

    let graphics = hardwareRecord.graphics || hardwareRecord.gpu
    if (!graphics || graphics === 'Unknown') {
      graphics = modules?.hardware?.graphics || hardwareRecord.raw?.graphics
    }

    let processor = hardwareRecord.processor || hardwareRecord.cpu
    let processorCores = hardwareRecord.processorCores
    let processorSpeed = hardwareRecord.processorSpeed

    if (!processor || processor === 'Unknown') {
      const sourceProcessor = modules?.hardware?.processor || hardwareRecord.raw?.processor || modules?.system?.hardwareInfo?.processor
      if (sourceProcessor) {
        processor = sourceProcessor
        if (typeof sourceProcessor === 'object') {
          if (!processorCores) processorCores = sourceProcessor.cores || sourceProcessor.core_count || sourceProcessor.logicalCores
          if (!processorSpeed) processorSpeed = sourceProcessor.speed || sourceProcessor.frequency || sourceProcessor.currentSpeed
        }
      }
    }

    return {
      ...hardwareRecord,
      deviceName: hardwareRecord.deviceName || hardwareRecord.serialNumber,
      assetTag: hardwareRecord.assetTag,
      architecture,
      modules,
      memory,
      graphics,
      processor,
      processorCores,
      processorSpeed
    }
  })

  const getMemoryRange = (memory: any): string => {
    let memoryGB = 0
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      if (memObj.totalFormatted) {
        const match = memObj.totalFormatted.match(/(\d+(?:\.\d+)?)\s*GB/i)
        if (match) memoryGB = parseFloat(match[1])
      } else if (memObj.totalPhysical) {
        const val = memObj.totalPhysical
        if (typeof val === 'number') memoryGB = val / (1024 * 1024 * 1024)
        else if (typeof val === 'string' && /^\d+$/.test(val)) memoryGB = parseFloat(val) / (1024 * 1024 * 1024)
      }
    } else if (typeof memory === 'number') {
      memoryGB = memory / (1024 * 1024 * 1024)
    } else if (typeof memory === 'string' && /^\d+$/.test(memory)) {
      memoryGB = parseFloat(memory) / (1024 * 1024 * 1024)
    }
    
    if (memoryGB <= 0) return 'Unknown'
    if (memoryGB <= 4) return '4 GB'
    if (memoryGB <= 8) return '8 GB'
    if (memoryGB <= 16) return '16 GB'
    if (memoryGB <= 32) return '32 GB'
    if (memoryGB <= 64) return '64 GB'
    return '128+ GB'
  }

  const getDeviceModel = (h: any): string => {
    return h.model || h.raw?.model || h.raw?.system?.hardwareInfo?.model || h.raw?.hardware?.model || 'Unknown Model'
  }

  const categorizeDeviceType = (model: string): string => {
    const m = model.toLowerCase()
    if (m.includes('desktop') || m.includes('optiplex') || m.includes('precision') || m.includes('workstation') ||
        m.includes('tower') || m.includes('sff') || m.includes('imac') || m.includes('mac pro') || m.includes('mac studio')) {
      return 'Desktop'
    }
    if (m.includes('laptop') || m.includes('book') || m.includes('thinkpad') || m.includes('macbook') ||
        m.includes('pavilion') || m.includes('inspiron') || m.includes('latitude') || m.includes('elitebook') ||
        m.includes('probook') || m.includes('yoga') || m.includes('ideapad') || m.includes('surface laptop')) {
      return 'Laptop'
    }
    return 'Desktop'
  }

  const getDeviceType = (h: any): string => {
    const model = h?.model || h?.modules?.hardware?.model || h?.modules?.system?.hardwareInfo?.model ||
                 h?.raw?.model || h?.raw?.system?.hardwareInfo?.model || h?.raw?.hardware?.model || 'Unknown Model'
    return categorizeDeviceType(model)
  }

  const getDevicePlatform = (h: any): 'Windows' | 'Macintosh' | 'Other' => {
    return getDevicePlatformLabel(h)
  }

  const getStorageRange = (device: any): string => {
    const storage = device.modules?.hardware?.storage || device.storage
    if (!Array.isArray(storage)) return 'Unknown'
    const totalBytes = storage.reduce((sum, drive) => sum + (typeof (drive.size || drive.capacity) === 'number' ? (drive.size || drive.capacity) : 0), 0)
    const storageGB = Math.round(totalBytes / (1024 * 1024 * 1024))
    if (storageGB === 0) return 'Unknown'
    if (storageGB >= 3500) return '4 TB'
    if (storageGB >= 1800) return '2 TB'
    if (storageGB >= 900) return '1 TB'
    if (storageGB >= 450) return '512 GB'
    if (storageGB >= 200) return '256 GB'
    if (storageGB >= 100) return '128 GB'
    return '64 GB'
  }

  const getProcessorName = (device: any): string => {
    const processor = device.processor || device.modules?.hardware?.processor || device.raw?.processor || 'Unknown Processor'
    let name = ''
    if (typeof processor === 'string') name = processor
    else if (typeof processor === 'object' && processor !== null) name = processor.name || processor.model || processor.brand || 'Unknown Processor'
    else name = 'Unknown Processor'
    
    // Simplify processor name to match chart groupings
    const lower = name.toLowerCase()
    if (lower.includes('intel')) {
      if (lower.includes('core i9')) return 'Intel Core i9'
      if (lower.includes('core i7')) return 'Intel Core i7'
      if (lower.includes('core i5')) return 'Intel Core i5'
      if (lower.includes('core i3')) return 'Intel Core i3'
      if (lower.includes('xeon')) return 'Intel Xeon'
      if (lower.includes('pentium')) return 'Intel Pentium'
      if (lower.includes('celeron')) return 'Intel Celeron'
      return 'Intel Other'
    }
    if (lower.includes('amd')) {
      if (lower.includes('ryzen 9')) return 'AMD Ryzen 9'
      if (lower.includes('ryzen 7')) return 'AMD Ryzen 7'
      if (lower.includes('ryzen 5')) return 'AMD Ryzen 5'
      if (lower.includes('ryzen 3')) return 'AMD Ryzen 3'
      if (lower.includes('epyc')) return 'AMD EPYC'
      if (lower.includes('threadripper')) return 'AMD Threadripper'
      return 'AMD Other'
    }
    if (lower.includes('apple') || lower.includes('m1') || lower.includes('m2') || lower.includes('m3')) {
      if (lower.includes('m3')) return 'Apple M3'
      if (lower.includes('m2')) return 'Apple M2'
      if (lower.includes('m1')) return 'Apple M1'
      return 'Apple Silicon'
    }
    if (lower.includes('qualcomm') || lower.includes('snapdragon')) return 'Qualcomm Snapdragon'
    if (lower.includes('virtual')) return 'Virtual'
    return name
  }

  const getGraphicsName = (device: any): string => {
    const graphics = device.modules?.hardware?.graphics || device.graphics
    let name = ''
    if (typeof graphics === 'string') name = graphics
    else if (Array.isArray(graphics) && graphics.length > 0) {
      const card = graphics[0]
      name = card.name || card.model || card.description || 'Unknown Graphics'
    } else if (typeof graphics === 'object' && graphics !== null) name = graphics.name || graphics.model || graphics.description || 'Unknown Graphics'
    else name = 'Unknown Graphics'
    
    // Simplify graphics name to match chart groupings
    const lower = name.toLowerCase()
    if (lower.includes('nvidia') || lower.includes('geforce') || lower.includes('quadro') || lower.includes('rtx') || lower.includes('gtx')) {
      if (lower.includes('rtx 40')) return 'NVIDIA RTX 40 Series'
      if (lower.includes('rtx 30')) return 'NVIDIA RTX 30 Series'
      if (lower.includes('rtx 20')) return 'NVIDIA RTX 20 Series'
      if (lower.includes('rtx')) return 'NVIDIA RTX Other'
      if (lower.includes('gtx 16')) return 'NVIDIA GTX 16 Series'
      if (lower.includes('gtx 10')) return 'NVIDIA GTX 10 Series'
      if (lower.includes('gtx')) return 'NVIDIA GTX Other'
      if (lower.includes('quadro')) return 'NVIDIA Quadro'
      return 'NVIDIA Other'
    }
    if (lower.includes('amd') || lower.includes('radeon') || lower.includes('ati')) {
      if (lower.includes('rx 7000')) return 'AMD RX 7000 Series'
      if (lower.includes('rx 6000')) return 'AMD RX 6000 Series'
      if (lower.includes('rx 5000')) return 'AMD RX 5000 Series'
      if (lower.includes('rx')) return 'AMD RX Other'
      if (lower.includes('vega')) return 'AMD Vega'
      return 'AMD Other'
    }
    if (lower.includes('intel')) {
      if (lower.includes('arc')) return 'Intel Arc'
      if (lower.includes('iris xe')) return 'Intel Iris Xe'
      if (lower.includes('iris')) return 'Intel Iris'
      if (lower.includes('uhd')) return 'Intel UHD Graphics'
      if (lower.includes('hd graphics')) return 'Intel HD Graphics'
      return 'Intel Integrated'
    }
    if (lower.includes('apple') || lower.includes('m1') || lower.includes('m2') || lower.includes('m3')) {
      if (lower.includes('m3')) return 'Apple M3 GPU'
      if (lower.includes('m2')) return 'Apple M2 GPU'
      if (lower.includes('m1')) return 'Apple M1 GPU'
      return 'Apple GPU'
    }
    if (lower.includes('qualcomm') || lower.includes('adreno')) return 'Qualcomm Adreno'
    if (lower.includes('virtual') || lower.includes('vmware') || lower.includes('hyper-v') || lower.includes('meta virtual')) return 'Meta Virtual Monitor'
    return name
  }

  // Helper to get device status based on lastSeen
  const getDeviceStatus = (device: any): string => {
    const lastSeen = device.lastSeen || device.collectedAt
    if (!lastSeen) return 'Missing'
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffDays = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays <= 1) return 'Active'
    if (diffDays <= 7) return 'Stale'
    return 'Missing'
  }

  // Helper to get inventory data
  const getInventory = (device: any) => device.raw?.inventory || device.inventory || {}

  const filteredHardware = processedHardware.filter(h => {
    if (globalPlatformFilter) {
      const platform = normalizePlatform(getDevicePlatform(h))
      if (!isPlatformVisible(platform)) return false
    }
    
    if (processorFilter !== 'all') {
      const processorStr = typeof h.processor === 'string' ? h.processor.toLowerCase() : 
        (typeof h.processor === 'object' && h.processor ? ((h.processor as any).name || '').toLowerCase() : '')
      if (!processorStr.includes(processorFilter.toLowerCase())) return false
    }

    // Inventory-based filters (Selections accordion)
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(getDeviceStatus(h))) return false
    const inventory = getInventory(h)
    if (selectedUsages.length > 0 && !selectedUsages.includes(inventory.usage || '')) return false
    if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(inventory.catalog || '')) return false
    if (selectedLocations.length > 0 && !selectedLocations.includes(inventory.location || '')) return false

    // Hardware-specific filters (from widget charts)
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(getDevicePlatform(h))) return false
    if (selectedModels.length > 0 && !selectedModels.includes(getDeviceModel(h))) return false
    if (selectedMemoryRanges.length > 0 && !selectedMemoryRanges.includes(getMemoryRange(h.memory))) return false
    if (selectedArchitectures.length > 0 && !selectedArchitectures.includes(h.architecture || 'Unknown')) return false
    if (selectedDeviceTypes.length > 0 && !selectedDeviceTypes.includes(getDeviceType(h))) return false
    if (selectedStorageRanges.length > 0 && !selectedStorageRanges.includes(getStorageRange(h))) return false
    if (selectedProcessors.length > 0 && !selectedProcessors.includes(getProcessorName(h))) return false
    if (selectedGraphics.length > 0 && !selectedGraphics.includes(getGraphicsName(h))) return false

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const processorSearchStr = typeof h.processor === 'string' ? h.processor.toLowerCase() : 
        (typeof h.processor === 'object' && h.processor ? ((h.processor as any).name || '').toLowerCase() : '')
      return (h.deviceName?.toLowerCase().includes(query) || processorSearchStr.includes(query) ||
              h.serialNumber?.toLowerCase().includes(query) || h.assetTag?.toLowerCase().includes(query) ||
              getDeviceModel(h).toLowerCase().includes(query))
    }
    return true
  }).sort((a, b) => {
    let aValue = '', bValue = ''
    switch (sortColumn) {
      case 'device': aValue = (a.deviceName || a.serialNumber || '').toLowerCase(); bValue = (b.deviceName || b.serialNumber || '').toLowerCase(); break
      case 'model': aValue = getDeviceModel(a).toLowerCase(); bValue = getDeviceModel(b).toLowerCase(); break
      case 'processor': aValue = getProcessorName(a).toLowerCase(); bValue = getProcessorName(b).toLowerCase(); break
      case 'memory': aValue = getMemoryRange(a.memory); bValue = getMemoryRange(b.memory); break
      case 'storage': aValue = getStorageRange(a); bValue = getStorageRange(b); break
      case 'arch': aValue = (a.architecture || 'Unknown').toLowerCase(); bValue = (b.architecture || 'Unknown').toLowerCase(); break
    }
    return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
  })

  const _getChartFilteredData = (excludeFilters: string[] = []) => {
    return processedHardware.filter(h => {
      if (processorFilter !== 'all') {
        const processorStr = typeof h.processor === 'string' ? h.processor.toLowerCase() : 
          (typeof h.processor === 'object' && h.processor ? ((h.processor as any).name || '').toLowerCase() : '')
        if (!processorStr.includes(processorFilter.toLowerCase())) return false
      }
      if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(getDevicePlatform(h))) return false
      if (!excludeFilters.includes('models') && selectedModels.length > 0 && !selectedModels.includes(getDeviceModel(h))) return false
      if (!excludeFilters.includes('memory') && selectedMemoryRanges.length > 0 && !selectedMemoryRanges.includes(getMemoryRange(h.memory))) return false
      if (!excludeFilters.includes('architectures') && selectedArchitectures.length > 0 && !selectedArchitectures.includes(h.architecture || 'Unknown')) return false
      if (!excludeFilters.includes('deviceTypes') && selectedDeviceTypes.length > 0 && !selectedDeviceTypes.includes(getDeviceType(h))) return false
      if (!excludeFilters.includes('storage') && selectedStorageRanges.length > 0 && !selectedStorageRanges.includes(getStorageRange(h))) return false
      if (!excludeFilters.includes('processors') && selectedProcessors.length > 0 && !selectedProcessors.includes(getProcessorName(h))) return false
      if (!excludeFilters.includes('graphics') && selectedGraphics.length > 0 && !selectedGraphics.includes(getGraphicsName(h))) return false
      return true
    })
  }

  const formatMemory = (memory: string | number | object | any) => {
    const formatGB = (bytes: number) => `${parseFloat((bytes / 1073741824).toFixed(1))} GB`
    if (typeof memory === 'object' && memory !== null) {
      const memObj = memory as any
      if (memObj.totalFormatted) return memObj.totalFormatted.replace('.0 GB', ' GB')
      if (memObj.totalPhysical) {
        const val = memObj.totalPhysical
        if (typeof val === 'number') return val >= 1000000000 ? formatGB(val) : `${Math.round(val / 1048576)} MB`
        if (typeof val === 'string' && /^\d+$/.test(val)) return parseFloat(val) >= 1000000000 ? formatGB(parseFloat(val)) : `${Math.round(parseFloat(val) / 1048576)} MB`
      }
      return 'Unknown'
    }
    if (typeof memory === 'number') return memory >= 1000000000 ? formatGB(memory) : `${Math.round(memory / 1048576)} MB`
    if (typeof memory === 'string' && /^\d+$/.test(memory)) return parseFloat(memory) >= 1000000000 ? formatGB(parseFloat(memory)) : `${Math.round(parseFloat(memory) / 1048576)} MB`
    return typeof memory === 'string' ? memory.replace('.0 GB', ' GB') : 'Unknown'
  }

  const formatStorage = (storage: any) => {
    if (!storage) return { total: 'No drives', free: null }
    if (typeof storage === 'string') return { total: storage, free: null }
    if (!Array.isArray(storage)) {
      if (typeof storage === 'number') return { total: storage >= 1000000000000 ? `${(storage / 1099511627776).toFixed(1)} TB` : `${Math.round(storage / 1073741824)} GB`, free: null }
      return { total: 'Unknown', free: null }
    }
    if (storage.length === 0) return { total: 'No drives', free: null }
    const totalSize = storage.reduce((sum, drive) => sum + (typeof (drive.size || drive.capacity) === 'number' ? (drive.size || drive.capacity) : 0), 0)
    const totalFree = storage.reduce((sum, drive) => sum + (typeof (drive.free || drive.available) === 'number' ? (drive.free || drive.available) : 0), 0)
    if (totalSize > 0) {
      const totalFormatted = totalSize >= 1000000000000 ? `${(totalSize / 1099511627776).toFixed(1)} TB` : `${Math.round(totalSize / 1073741824)} GB`
      const freeFormatted = totalFree > 0 ? (totalFree >= 1000000000000 ? `${(totalFree / 1099511627776).toFixed(1)} TB` : `${Math.round(totalFree / 1073741824)} GB`) : null
      return { total: totalFormatted, free: freeFormatted }
    }
    return { total: `${storage.length} drives`, free: null }
  }

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* fallback */ }
  }

  if (loading) return <HardwarePageSkeleton />

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-t-xl shadow-sm border border-gray-200 dark:border-gray-700 border-b-0 flex flex-col min-h-0 overflow-hidden">
          
          {/* Title Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware Specifications</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Processor, memory, storage, and architecture details - {filteredHardware.length} devices
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input type="text" placeholder="Search devices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                {(totalActiveFilters > 0 || searchQuery) && <button onClick={clearAllFilters} className="px-4 py-2 text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap">Clear Selection</button>}
                <button onClick={() => { const headers = ['Device Name', 'Serial Number', 'Asset Tag', 'Model', 'Processor', 'Memory', 'Storage', 'Architecture']; const rows = filteredHardware.map(h => [h.deviceName || '', h.serialNumber || '', h.assetTag || '', getDeviceModel(h), getProcessorName(h), formatMemory(h.memory), formatStorage(h.storage).total, h.architecture || ''].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')); const csv = [headers.join(','), ...rows].join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `hardware-report-${new Date().toISOString().split('T')[0]}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2" title="Export to CSV">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Selections Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setFiltersExpanded(!filtersExpanded)} className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selections</span>
                {totalSelectionsFilters > 0 && <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">{totalSelectionsFilters} active</span>}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${effectiveFiltersExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <CollapsibleSection expanded={effectiveFiltersExpanded}>
              <div className="px-6 pb-4 space-y-4">
                {/* Status Filter */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Status</div>
                  <div className="flex flex-wrap gap-2">
                    {['Active', 'Stale', 'Missing'].map(status => (
                      <button key={status} onClick={() => toggleStatus(status)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${selectedStatuses.includes(status) ? (status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' : status === 'Stale' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700') : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>{status}</button>
                    ))}
                  </div>
                </div>
                {/* Usage Filter */}
                {filterOptions.usages.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Usage</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.usages.map(usage => (
                        <button key={usage} onClick={() => toggleUsage(usage)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${selectedUsages.includes(usage) ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>{usage}</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Catalog Filter */}
                {filterOptions.catalogs.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Catalog</div>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.catalogs.map(catalog => (
                        <button key={catalog} onClick={() => toggleCatalog(catalog)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${selectedCatalogs.includes(catalog) ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>{catalog}</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Location Filter */}
                {filterOptions.locations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Location</div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {filterOptions.locations.map(location => (
                        <button key={location} onClick={() => toggleLocation(location)} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${selectedLocations.includes(location) ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>{location}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setWidgetsExpanded(!widgetsExpanded)} className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${effectiveWidgetsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <CollapsibleSection expanded={effectiveWidgetsExpanded}>
              <div className="pb-4">
                {/* Horizontal scrollable row */}
                <div className="flex gap-4 overflow-x-auto px-6 pb-2">
                  <div className="flex-shrink-0 w-48 flex flex-col gap-4">
                    <DeviceTypeDonutChart devices={processedHardware} loading={loading} selectedDeviceTypes={selectedDeviceTypes} onDeviceTypeToggle={handleDeviceTypeToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedArchitectures={selectedArchitectures} />
                    <ArchitectureDonutChart devices={processedHardware} loading={loading} selectedArchitectures={selectedArchitectures} onArchitectureToggle={handleArchitectureToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedDeviceTypes={selectedDeviceTypes} />
                  </div>
                  <div className="flex-shrink-0 w-[22rem]">
                    <HardwareTypeChart devices={processedHardware} loading={loading} selectedModels={selectedModels} onModelToggle={handleModelToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedArchitectures={selectedArchitectures} globalSelectedDeviceTypes={selectedDeviceTypes} />
                  </div>
                  <div className="flex-shrink-0 w-72">
                    <ProcessorDistributionChart devices={processedHardware} loading={loading} selectedProcessors={selectedProcessors} onProcessorToggle={handleProcessorToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedStorageRanges={selectedStorageRanges} globalSelectedArchitectures={selectedArchitectures} globalSelectedDeviceTypes={selectedDeviceTypes} />
                  </div>
                  <div className="flex-shrink-0 w-72">
                    <GraphicsDistributionChart devices={processedHardware} loading={loading} selectedGraphics={selectedGraphics} onGraphicsToggle={handleGraphicsToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedStorageRanges={selectedStorageRanges} globalSelectedArchitectures={selectedArchitectures} globalSelectedDeviceTypes={selectedDeviceTypes} globalSelectedProcessors={selectedProcessors} />
                  </div>
                  <div className="flex-shrink-0 w-72 flex flex-col gap-4">
                    <MemoryBreakdownChart devices={processedHardware} loading={loading} selectedMemoryRanges={selectedMemoryRanges} onMemoryRangeToggle={handleMemoryRangeToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedArchitectures={selectedArchitectures} globalSelectedDeviceTypes={selectedDeviceTypes} />
                    <StorageBreakdownChart devices={processedHardware} loading={loading} selectedStorageRanges={selectedStorageRanges} onStorageRangeToggle={handleStorageRangeToggle} globalSelectedPlatforms={selectedPlatforms} globalSelectedModels={selectedModels} globalSelectedMemoryRanges={selectedMemoryRanges} globalSelectedArchitectures={selectedArchitectures} globalSelectedDeviceTypes={selectedDeviceTypes} />
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Hardware Table */}
          <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 table-scrollbar">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th onClick={() => handleSort('device')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-56 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Device{sortColumn === 'device' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                  <th onClick={() => handleSort('model')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-40 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Model{sortColumn === 'model' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                  <th onClick={() => handleSort('processor')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-48 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Processor{sortColumn === 'processor' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-32 bg-gray-50 dark:bg-gray-700">Graphics</th>
                  <th onClick={() => handleSort('memory')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Memory{sortColumn === 'memory' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                  <th onClick={() => handleSort('storage')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-24 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Storage{sortColumn === 'storage' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                  <th onClick={() => handleSort('arch')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-20 bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"><div className="flex items-center gap-1">Arch{sortColumn === 'arch' && <svg className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}</div></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {error ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex flex-col items-center"><div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center"><svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load hardware</p><p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">Try Again</button></div></td></tr>
                ) : filteredHardware.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex flex-col items-center"><svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg><h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No hardware found</h3><p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search criteria.</p></div></td></tr>
                ) : (
                  filteredHardware.map((hw) => (
                    <tr key={hw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 w-56"><div className="flex flex-col justify-center min-w-0"><Link href={`/device/${encodeURIComponent(hw.serialNumber)}#hardware`} className="group block min-w-0" title={hw.deviceName || hw.serialNumber || 'Unknown Device'}><span className="font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 text-sm leading-tight block truncate">{hw.deviceName || hw.serialNumber || 'Unknown Device'}</span></Link><div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono leading-tight"><span className="truncate max-w-32">{hw.serialNumber}</span><button onClick={() => copyToClipboard(hw.serialNumber)} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0" title="Copy serial number"><Copy size={10} /></button>{hw.assetTag && <><span>|</span><span className="truncate max-w-20">{hw.assetTag}</span></>}</div></div></td>
                      <td className="px-4 py-3 w-40" style={{ maxWidth: '160px' }}>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{hw.manufacturer || hw.raw?.manufacturer || ''}</div>
                        <FitText minFontSize={11} maxFontSize={14} className="text-gray-900 dark:text-white">
                          {getDeviceModel(hw)}
                        </FitText>
                      </td>
                      <td className="px-4 py-3 w-48" style={{ maxWidth: '192px' }}>
                        <FitText minFontSize={11} maxFontSize={14} className="text-gray-900 dark:text-white">
                          {typeof hw.processor === 'object' && hw.processor ? (hw.processor as any).name || (hw.processor as any).model || 'Unknown' : hw.processor || 'Unknown'}
                        </FitText>
                        {hw.processorCores && <div className="text-xs text-gray-500 dark:text-gray-400">{hw.processorCores} cores{hw.processorSpeed && ` ${hw.processorSpeed}`}</div>}
                      </td>
                      <td className="px-4 py-3 w-32" style={{ maxWidth: '128px' }}>{(() => { const g = hw.gpu || hw.graphics || hw.raw?.graphics; if (!g) return <div className="text-sm text-gray-500 dark:text-gray-400">Unknown</div>; if (typeof g === 'string') return <FitText minFontSize={11} maxFontSize={14} className="text-gray-900 dark:text-white">{g}</FitText>; if (Array.isArray(g) && g.length > 0) { const first = g[0]; const name = typeof first === 'string' ? first : (first.name || first.model || 'Graphics'); return <div><FitText minFontSize={11} maxFontSize={14} className="text-gray-900 dark:text-white">{name}</FitText>{g.length > 1 && <div className="text-xs text-gray-500 dark:text-gray-400">+{g.length - 1} more</div>}</div>; } if (typeof g === 'object') return <FitText minFontSize={11} maxFontSize={14} className="text-gray-900 dark:text-white">{g.name || g.model || 'Graphics'}</FitText>; return <div className="text-sm text-gray-500 dark:text-gray-400">Unknown</div>; })()}</td>
                      <td className="px-4 py-3 w-24"><div className="text-sm text-gray-900 dark:text-white">{formatMemory(hw.memory)}</div>{hw.memoryModules?.length > 0 && <div className="text-xs text-gray-500 dark:text-gray-400">{hw.memoryModules.length} modules</div>}</td>
                      <td className="px-4 py-3 w-24">{(() => { const s = formatStorage(hw.storage); return <div><div className="text-sm text-gray-900 dark:text-white">{s.total}</div>{s.free && <div className="text-xs text-gray-500 dark:text-gray-400">{s.free} free</div>}</div>; })()}</td>
                      <td className="px-4 py-3 w-20 text-sm text-gray-900 dark:text-white">{hw.architecture || 'Unknown'}</td>
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
