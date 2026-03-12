/**
 * Chip Configuration Chart Component
 * Shows distribution of Apple Silicon chip SKUs (e.g. M4 Pro 12-core CPU, 16-core GPU, 16-core NPU)
 * Used when platform=mac to replace separate Processor/Graphics widgets
 */

import React, { useMemo, useState } from 'react'
import { getDevicePlatformLabel } from '../../../providers/PlatformFilterProvider'

interface Device {
  deviceId: string
  serialNumber: string
  name?: string
  deviceName?: string
  manufacturer?: string
  model?: string
  architecture?: string
  processor?: string | object | any
  graphics?: any[] | object | string | any
  modules?: {
    hardware?: {
      storage?: any[]
      processor?: string | object | any
      graphics?: any[] | object | string | any
      manufacturer?: string
      model?: string
    }
    system?: {
      operatingSystem?: {
        architecture?: string
      }
      hardwareInfo?: {
        manufacturer?: string
        model?: string
      }
    }
  }
}

interface ChipConfigurationChartProps {
  devices: Device[]
  loading?: boolean
  className?: string
  selectedChips?: string[]
  onChipToggle?: (chip: string) => void
  globalSelectedPlatforms?: string[]
  globalSelectedModels?: string[]
  globalSelectedArchitectures?: string[]
  globalSelectedDeviceTypes?: string[]
  globalSelectedMemoryRanges?: string[]
  globalSelectedStorageRanges?: string[]
}

interface ChipData {
  chip: string
  count: number
  percentage: number
  color: string
  isSelected: boolean
}

export function ChipConfigurationChart({
  devices,
  loading = false,
  className = '',
  selectedChips = [],
  onChipToggle,
  globalSelectedPlatforms = [],
  globalSelectedModels = [],
  globalSelectedArchitectures = [],
  globalSelectedDeviceTypes = [],
  globalSelectedMemoryRanges = [],
  globalSelectedStorageRanges = []
}: ChipConfigurationChartProps) {
  const [sortBy, setSortBy] = useState<'count' | 'alpha'>('count')
  const chipData = useMemo(() => {
    if (!devices || devices.length === 0) return []

    // Extract chip name from processor
    const getChipFamily = (device: Device): string => {
      const processor = device.processor ||
                        device.modules?.hardware?.processor ||
                        (device as any).raw?.processor || ''
      let name = ''
      if (typeof processor === 'string') name = processor
      else if (typeof processor === 'object' && processor !== null) name = processor.name || processor.model || processor.brand || ''
      else name = String(processor)

      const lower = name.toLowerCase()
      if (!lower.includes('apple') && !/\bm[1-9]\b/.test(lower)) return ''

      if (lower.includes('m5 ultra')) return 'M5 Ultra'
      if (lower.includes('m5 max')) return 'M5 Max'
      if (lower.includes('m5 pro')) return 'M5 Pro'
      if (/\bm5\b/.test(lower)) return 'M5'
      if (lower.includes('m4 ultra')) return 'M4 Ultra'
      if (lower.includes('m4 max')) return 'M4 Max'
      if (lower.includes('m4 pro')) return 'M4 Pro'
      if (/\bm4\b/.test(lower)) return 'M4'
      if (lower.includes('m3 ultra')) return 'M3 Ultra'
      if (lower.includes('m3 max')) return 'M3 Max'
      if (lower.includes('m3 pro')) return 'M3 Pro'
      if (/\bm3\b/.test(lower)) return 'M3'
      if (lower.includes('m2 ultra')) return 'M2 Ultra'
      if (lower.includes('m2 max')) return 'M2 Max'
      if (lower.includes('m2 pro')) return 'M2 Pro'
      if (/\bm2\b/.test(lower)) return 'M2'
      if (lower.includes('m1 ultra')) return 'M1 Ultra'
      if (lower.includes('m1 max')) return 'M1 Max'
      if (lower.includes('m1 pro')) return 'M1 Pro'
      if (/\bm1\b/.test(lower)) return 'M1'
      return 'Apple Silicon'
    }

    // Extract core counts from processor object
    const getCpuCores = (device: Device): number => {
      const proc = device.processor || device.modules?.hardware?.processor
      if (typeof proc === 'object' && proc !== null) {
        return proc.cores || proc.core_count || proc.logicalCores || 0
      }
      return (device as any).processorCores || 0
    }

    // Extract GPU cores from graphics object
    const getGpuCores = (device: Device): number => {
      const gfx = device.graphics || device.modules?.hardware?.graphics
      if (Array.isArray(gfx) && gfx.length > 0) return gfx[0].cores || 0
      if (typeof gfx === 'object' && gfx !== null) return (gfx as any).cores || 0
      return (device as any).graphicsCores || 0
    }

    // Extract NPU cores
    const getNpuCores = (device: Device): number => {
      const npu = (device as any).npu || (device as any).modules?.hardware?.npu
      if (typeof npu === 'object' && npu !== null) return npu.cores || 0
      return 0
    }

    // Build SKU string
    const buildSku = (device: Device): string => {
      const chip = getChipFamily(device)
      if (!chip) return ''

      const cpuCores = getCpuCores(device)
      const gpuCores = getGpuCores(device)
      const npuCores = getNpuCores(device)

      const parts: string[] = []
      if (cpuCores > 0) parts.push(`${cpuCores}-core CPU`)
      if (gpuCores > 0) parts.push(`${gpuCores}-core GPU`)
      if (npuCores > 0) parts.push(`${npuCores}-core NPU`)

      if (parts.length === 0) return chip
      return `${chip} (${parts.join(', ')})`
    }

    // Filtering helpers
    const getDeviceModel = (device: Device): string => {
      return device.model ||
             device.modules?.hardware?.model ||
             device.modules?.system?.hardwareInfo?.model ||
             'Unknown Model'
    }

    const getDeviceType = (device: Device): string => {
      const m = getDeviceModel(device).toLowerCase()
      if (m.includes('desktop') || m.includes('optiplex') || m.includes('precision') ||
          m.includes('workstation') || m.includes('tower') || m.includes('sff') ||
          m.includes('imac') || m.includes('mac pro') || m.includes('mac studio')) return 'Desktop'
      if (m.includes('laptop') || m.includes('book') || m.includes('thinkpad') ||
          m.includes('macbook') || m.includes('pavilion') || m.includes('inspiron') ||
          m.includes('latitude') || m.includes('elitebook') || m.includes('probook') ||
          m.includes('yoga') || m.includes('ideapad') || m.includes('surface laptop')) return 'Laptop'
      return 'Desktop'
    }

    const getMemoryRange = (memory: any): string => {
      if (!memory) return 'Unknown'
      let memoryGB = 0
      if (typeof memory === 'object' && memory !== null) {
        const memObj = memory as any
        if (memObj.totalFormatted) { const m = memObj.totalFormatted.match(/(\d+\.?\d*)\s*GB/i); if (m) memoryGB = parseFloat(m[1]) }
        else if (memObj.physical_memory || memObj.physicalMemory) { const v = memObj.physical_memory || memObj.physicalMemory; memoryGB = (typeof v === 'number' ? v : parseFloat(v)) / (1024 * 1024 * 1024) }
        else if (memObj.totalPhysical) { const v = memObj.totalPhysical; memoryGB = (typeof v === 'number' ? v : parseFloat(v)) / (1024 * 1024 * 1024) }
      } else if (typeof memory === 'number') { memoryGB = memory > 1000 ? memory / (1024 * 1024 * 1024) : memory }
      else if (typeof memory === 'string') { const m = memory.match(/(\d+\.?\d*)\s*GB/i); if (m) memoryGB = parseFloat(m[1]); else { const v = parseFloat(memory); if (!isNaN(v)) memoryGB = v > 1000 ? v / (1024 * 1024 * 1024) : v } }
      if (memoryGB <= 0) return 'Unknown'
      const sizes = [2, 4, 8, 12, 16, 24, 32, 36, 48, 64, 96, 128, 192, 256, 384, 512]
      let best = sizes[0], bestDiff = Math.abs(memoryGB - sizes[0])
      for (const s of sizes) { const d = Math.abs(memoryGB - s); if (d < bestDiff) { best = s; bestDiff = d } }
      return `${best} GB`
    }

    const getStorageRange = (device: Device): string => {
      const storage = device.modules?.hardware?.storage || (device as any).storage
      if (!Array.isArray(storage)) return 'Unknown'
      const totalBytes = storage.reduce((sum: number, drive: any) => {
        const capacity = drive.capacity || drive.totalSize || drive.size || 0
        return sum + (typeof capacity === 'number' ? capacity : 0)
      }, 0)
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

    const getDevicePlatform = (device: Device): 'Windows' | 'Macintosh' | 'Other' => {
      return getDevicePlatformLabel(device)
    }

    const getArchitecture = (device: Device): string => {
      return device.architecture ||
             (device.modules?.hardware?.processor as any)?.architecture ||
             device.modules?.system?.operatingSystem?.architecture ||
             'x64'
    }

    // Apply global filters
    const filteredDevices = devices.filter(device => {
      if (globalSelectedPlatforms.length > 0 && !globalSelectedPlatforms.includes(getDevicePlatform(device))) return false
      if (globalSelectedModels.length > 0 && !globalSelectedModels.includes(getDeviceModel(device))) return false
      if (globalSelectedArchitectures.length > 0 && !globalSelectedArchitectures.includes(getArchitecture(device))) return false
      if (globalSelectedDeviceTypes.length > 0 && !globalSelectedDeviceTypes.includes(getDeviceType(device))) return false
      if (globalSelectedMemoryRanges.length > 0 && !globalSelectedMemoryRanges.includes(getMemoryRange((device as any).memory))) return false
      if (globalSelectedStorageRanges.length > 0 && !globalSelectedStorageRanges.includes(getStorageRange(device))) return false
      return true
    })

    // Build SKU counts
    const skuCounts: Record<string, number> = {}
    filteredDevices.forEach(device => {
      const sku = buildSku(device)
      if (sku) {
        skuCounts[sku] = (skuCounts[sku] || 0) + 1
      }
    })

    const sortedSkus = Object.entries(skuCounts).sort(sortBy === 'alpha' ? ([a], [b]) => a.localeCompare(b) : ([, a], [, b]) => b - a)

    const colors = [
      '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308',
      '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280',
      '#14b8a6', '#a855f7', '#f43f5e', '#0ea5e9', '#22c55e'
    ]

    const total = Object.values(skuCounts).reduce((sum, count) => sum + count, 0)

    return sortedSkus.map(([chip, count], index) => ({
      chip,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: colors[index % colors.length],
      isSelected: selectedChips.includes(chip)
    }))
  }, [devices, globalSelectedPlatforms, globalSelectedModels, globalSelectedArchitectures, globalSelectedDeviceTypes, globalSelectedMemoryRanges, globalSelectedStorageRanges, selectedChips, sortBy])

  const total = useMemo(() => {
    return chipData.reduce((sum: number, item) => sum + item.count, 0)
  }, [chipData])

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 select-none transition-colors" onClick={() => setSortBy(s => s === 'count' ? 'alpha' : 'count')} title={sortBy === 'count' ? 'Sort alphabetically' : 'Sort by quantity'}>Chip {sortBy === 'alpha' ? '(A-Z)' : ''}</h3>
      </div>

      <div className="space-y-1 max-h-[36.4rem] overflow-y-auto">
        {chipData.map((item) => (
          <div
            key={item.chip}
            className={`cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              item.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
            }`}
            onClick={() => onChipToggle?.(item.chip)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-medium transition-colors ${
                item.isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>{item.chip}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.count}</span>
                <span className="text-xs text-gray-500 dark:text-gray-500">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}

        {chipData.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-600 text-sm">
              No chip configuration data available
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChipConfigurationChart
