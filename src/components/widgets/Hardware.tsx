/**
 * Hardware Widget
 * Displays comprehensive hardware information for devices
 * 
 * SNAKE_CASE: All properties match API response format directly
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  deviceId?: string
  model?: string
  manufacturer?: string
  // Modular hardware data from modules.hardware - snake_case from API
  modules?: {
    hardware?: {
      model?: string
      manufacturer?: string
      processor?: {
        name?: string
        cores?: number
        socket?: string
        max_speed?: number
        base_speed?: number
        architecture?: string
        manufacturer?: string
        logical_processors?: number
      }
      memory?: {
        total_physical?: number
        total_virtual?: number
        available_physical?: number
        available_virtual?: number
        modules?: Array<{
          type?: string
          speed?: number
          capacity?: number
          location?: string
          manufacturer?: string
        }>
      }
      storage?: Array<{
        name?: string
        type?: string
        health?: string
        capacity?: number
        interface?: string
        free_space?: number
        last_analyzed?: string
        root_directories?: Array<any>
      }>
      graphics?: {
        name?: string
        manufacturer?: string
        memory_size?: number
        driver_version?: string
        driver_date?: string
      }
      npu?: {
        name?: string
        architecture?: string
        is_available?: boolean
        manufacturer?: string
        compute_units?: number
      }
      wireless?: {
        name?: string
        status?: string
        protocol?: string
        mac_address?: string
        is_available?: boolean
        manufacturer?: string
        driver_version?: string
      }
      battery?: {
        charge_percent?: number
        health?: string
        is_charging?: boolean
        cycle_count?: number
      }
      collected_at?: string
      device_id?: string
      module_id?: string
    }
  }
}

interface HardwareWidgetProps {
  device: Device
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  // Get hardware data from modules - snake_case from API
  const hardware = device.modules?.hardware
  
  console.log('[HardwareWidget] Debug data access:', {
    deviceId: device.id,
    hasModules: !!device.modules,
    hasHardwareModule: !!hardware,
    hardwareModuleKeys: hardware ? Object.keys(hardware) : []
  })

  // Helper function to format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to safely get a numeric value
  const safeNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  // Build unified hardware info from snake_case API data
  const hardwareInfo = {
    model: hardware?.model || 'Unknown',
    manufacturer: hardware?.manufacturer || 'Unknown',
    processor: hardware?.processor?.name || 'Unknown',
    cores: hardware?.processor?.cores,
    logical_processors: hardware?.processor?.logical_processors,
    architecture: hardware?.processor?.architecture || 'Unknown',
    memory: hardware?.memory?.total_physical 
      ? formatBytes(safeNumber(hardware.memory.total_physical)) 
      : 'Unknown',
    storage: hardware?.storage?.[0]?.capacity && hardware?.storage?.[0]?.free_space 
      ? `${formatBytes(safeNumber(hardware.storage[0].capacity))} ${formatBytes(safeNumber(hardware.storage[0].free_space))} free`
      : hardware?.storage?.[0]?.capacity 
        ? formatBytes(safeNumber(hardware.storage[0].capacity))
        : 'Unknown',
    graphics: hardware?.graphics?.name || 'Unknown',
    vram: hardware?.graphics?.memory_size ? `${hardware.graphics.memory_size} GB` : undefined,
    npu: hardware?.npu?.name,
    npu_compute_units: hardware?.npu?.compute_units,
    battery_level: hardware?.battery?.charge_percent,
    battery_health: hardware?.battery?.health,
    is_charging: hardware?.battery?.is_charging
  }

  // Check if we have any hardware information
  const hasHardwareInfo = Object.values(hardwareInfo).some(value => 
    value !== undefined && value !== null && value !== 'Unknown' && value !== ''
  )

  if (!hasHardwareInfo) {
    return (
      <StatBlock 
        title="Hardware" 
        subtitle="Device specs"
        icon={Icons.hardware}
        iconColor={WidgetColors.orange}
      >
        <EmptyState message="Hardware information not available" />
      </StatBlock>
    )
  }

  return (
    <StatBlock 
      title="Hardware" 
      subtitle="Device specs"
      icon={Icons.hardware}
      iconColor={WidgetColors.orange}
    >
      <div className="space-y-5">
        {/* Primary Hardware Info */}
        <div className="space-y-5">
          <Stat 
            label="Model" 
            value={hardwareInfo.model} 
          />
          
          <Stat 
            label="Processor" 
            value={hardwareInfo.processor}
          />
          
          <Stat 
            label="Graphics" 
            value={hardwareInfo.graphics}
          />
          
          {/* NPU if available */}
          {hardwareInfo.npu && (
            <Stat 
              label="NPU" 
              value={hardwareInfo.npu}
              sublabel={hardwareInfo.npu_compute_units ? `${hardwareInfo.npu_compute_units} compute units` : undefined}
            />
          )}
          
          {/* Memory and Storage - 30/70 split */}
          <div className="grid grid-cols-10 gap-4">
            <div className="col-span-3">
              <Stat 
                label="Memory" 
                value={hardwareInfo.memory}
              />
            </div>
            <div className="col-span-7">
              <Stat 
                label="Storage" 
                value={hardwareInfo.storage}
              />
            </div>
          </div>
        </div>
      </div>
    </StatBlock>
  )
}

export default HardwareWidget
