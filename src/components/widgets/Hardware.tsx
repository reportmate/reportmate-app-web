/**
 * Hardware Widget
 * Displays system hardware specifications
 */

import React from 'react'
import { StatBlock, Stat, EmptyState, Icons, WidgetColors } from './shared'

interface Device {
  id: string
  name: string
  model?: string
  processor?: string
  processorSpeed?: string
  cores?: number
  memory?: string
  availableRAM?: string
  memorySlots?: string
  storage?: string
  availableStorage?: string
  storageType?: string
  graphics?: string
  vram?: string
  resolution?: string
  architecture?: string
  manufacturer?: string
  batteryLevel?: number
  // Battery information from API
  batteryHealth?: string
  batteryCycleCount?: number
  isCharging?: boolean
  // Raw hardware module data
  modules?: {
    hardware?: {
      model?: string
      processor?: {
        name: string
        cores: number
        architecture: string
        manufacturer: string
        maxSpeed: number
        baseSpeed: number
        logicalProcessors: number
      }
      memory?: {
        totalPhysical: number
        totalVirtual: number
        availablePhysical: number
        availableVirtual: number
        modules: Array<{
          type: string
          speed: number
          capacity: number
          location: string
          manufacturer: string
        }>
      }
      battery?: {
        health: string
        cycleCount: number
        isCharging: boolean
        chargePercent: number
        estimatedRuntime: string
      }
      storage?: Array<{
        name: string
        type: string
        health: string
        capacity: number
        freeSpace: number
        interface: string
      }>
      graphics?: {
        name: string
        driverDate: string
        memorySize: number
        manufacturer: string
        driverVersion: string
      }
      manufacturer?: string
    }
  }
  // Modular hardware data (legacy)
  hardware?: {
    processor?: string
    processorSpeed?: string
    cores?: number
    memory?: string
    storage?: string
    graphics?: string
    architecture?: string
    manufacturer?: string
    model?: string
  }
}

interface HardwareWidgetProps {
  device: Device
}

export const HardwareWidget: React.FC<HardwareWidgetProps> = ({ device }) => {
  // Extract hardware data from the correct module structure
  const hardwareModule = device.modules?.hardware
  const legacyHardware = device.hardware || {}

  console.log('HardwareWidget device:', device)
  console.log('Hardware module:', hardwareModule)
  console.log('Legacy hardware:', legacyHardware)

  const hasHardwareInfo = hardwareModule || legacyHardware.processor || legacyHardware.memory || 
                          legacyHardware.storage || legacyHardware.graphics ||
                          device.processor || device.memory || device.storage || device.graphics

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

  // Helper function to format bytes to GB
  const formatBytes = (bytes: number) => {
    if (!bytes) return 'Unknown'
    return `${Math.round(bytes / (1024*1024*1024))} GB`
  }

  // Helper function to format storage info
  const formatStorage = (storage: any[]) => {
    if (!storage || storage.length === 0) return null
    
    // Find the main drive (SSD or first available drive with capacity)
    const mainDrive = storage.find(s => s.type === 'SSD' && s.capacity > 0) || 
                     storage.find(s => s.capacity > 0) || 
                     storage[0]
    
    if (!mainDrive || !mainDrive.capacity) return null
    
    const totalGB = Math.round(mainDrive.capacity / (1024*1024*1024))
    const freeGB = Math.round(mainDrive.freeSpace / (1024*1024*1024))
    
    return `${totalGB} GB ${mainDrive.type || 'Drive'} • ${freeGB} GB free`
  }

  // Helper function to format battery info
  const formatBattery = (battery: any) => {
    if (!battery) return null
    
    const health = battery.health || 'Unknown'
    const chargePercent = battery.chargePercent || 0
    const cycleCount = battery.cycleCount || 0
    
    return `${health} (${chargePercent}%) • ${cycleCount} cycles`
  }

  // Use the detailed module data first for rich formatting, then fall back to API string
  const storageInfo = (hardwareModule?.storage ? formatStorage(hardwareModule.storage) : null) || device.storage
  
  // Use the API battery data first, then fall back to module data
  const batteryInfo = (device.batteryHealth && device.batteryLevel !== undefined && device.batteryCycleCount !== undefined) ? 
                     `${device.batteryHealth} (${device.batteryLevel}%) • ${device.batteryCycleCount} cycles` : 
                     (hardwareModule?.battery ? formatBattery(hardwareModule.battery) : null)

  return (
    <StatBlock 
      title="Hardware" 
      subtitle="Device specs"
      icon={Icons.hardware}
      iconColor={WidgetColors.orange}
    >
      <div className="space-y-4">
        <Stat 
          label="Model" 
          value={hardwareModule?.model || legacyHardware.model || device.model || 'Unknown'} 
        />
        
        <Stat 
          label="Manufacturer" 
          value={hardwareModule?.manufacturer || legacyHardware.manufacturer || device.manufacturer || 'Unknown'} 
        />
        
        <Stat 
          label="Processor" 
          value={hardwareModule?.processor?.name || legacyHardware.processor || device.processor || 'Unknown'}
        />
        
        <Stat 
          label="Architecture" 
          value={hardwareModule?.processor?.architecture || legacyHardware.architecture || device.architecture || 'Unknown'} 
        />
        
        <Stat 
          label="Graphics" 
          value={hardwareModule?.graphics?.name || legacyHardware.graphics || device.graphics || 'Unknown'}
        />
        
        <Stat 
          label="Memory" 
          value={hardwareModule?.memory ? formatBytes(hardwareModule.memory.totalPhysical) : (legacyHardware.memory || device.memory || 'Unknown')}
        />
        
        {storageInfo && (
          <Stat 
            label="Storage" 
            value={storageInfo}
          />
        )}
        
        {batteryInfo && (
          <Stat 
            label="Battery" 
            value={batteryInfo}
          />
        )}
      </div>
    </StatBlock>
  )
}

export default HardwareWidget
