/**
 * Peripherals Module
 * Module for displaying comprehensive peripheral device information
 */

import React from 'react'
import { BaseModule } from '../BaseModule'
import { ModuleManifest } from '../ModuleRegistry'
import { PeripheralsTab } from '../../../components/tabs/PeripheralsTab'

// Wrapper component to fetch device data and pass to PeripheralsTab
const PeripheralsTabWrapper: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const [device, setDevice] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchDevice = async () => {
      try {
        // Use Next.js API route
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDevice(data.device)
          }
        }
      } catch (error) {
        console.error('Failed to fetch device:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDevice()
  }, [deviceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          Failed to load device data
        </div>
      </div>
    )
  }

  return <PeripheralsTab device={device} />
}

export class PeripheralsModule extends BaseModule {
  readonly manifest: ModuleManifest = {
    id: 'peripherals',
    name: 'Peripherals',
    version: '1.0.0',
    description: 'Comprehensive peripheral device information including displays, printers, USB devices, input devices, audio devices, cameras, and storage',
    author: 'ReportMate Team',
    enabled: true,
    category: 'hardware',
    
    deviceTabs: [
      {
        id: 'peripherals',
        name: 'Peripherals',
        icon: 'M8 4a4 4 0 100 8h8a4 4 0 100-8H8zm0 2h8a2 2 0 110 4H8a2 2 0 110-4zm2 1a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z',
        component: PeripheralsTabWrapper,
        order: 6, // Place after Hardware (5) but before Network (7)
      },
    ],
  }

  async onLoad(): Promise<void> {
    this.log('info', 'Peripherals module loaded')
  }
}

export default PeripheralsModule
