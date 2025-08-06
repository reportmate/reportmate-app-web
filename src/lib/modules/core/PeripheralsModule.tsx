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
        icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
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
