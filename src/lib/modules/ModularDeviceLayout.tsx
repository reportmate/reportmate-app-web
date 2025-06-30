/**
 * Modular Device Page Layout System
 * 
 * This creates a flexible, widget-based layout that replaces the hardcoded device page
 */

import React, { useState, useEffect } from 'react'
import { useModules } from './ModuleRegistry'
import { DeviceWidget, DeviceWidgetProps } from './EnhancedModule'

interface DeviceLayoutProps {
  deviceId: string
}

interface LayoutConfig {
  columns: number
  gaps: 'small' | 'medium' | 'large'
  widgetOrder?: string[]
  hiddenWidgets?: string[]
}

/**
 * Modular Device Layout Component
 * Renders widgets dynamically based on available modules
 */
export const ModularDeviceLayout: React.FC<DeviceLayoutProps> = ({ deviceId }) => {
  const { registry } = useModules()
  const [device, setDevice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    columns: 3,
    gaps: 'medium'
  })
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())

  // Fetch device data
  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const response = await fetch(`/api/device/${deviceId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDevice(data.device)
          } else {
            setError(data.error || 'Device not found')
          }
        } else {
          setError('Failed to fetch device')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }

    fetchDevice()
  }, [deviceId])

  // Get available widgets from modules
  const getAvailableWidgets = (): DeviceWidget[] => {
    const widgets: DeviceWidget[] = []
    
    for (const module of registry.getEnabledModules()) {
      if (module.deviceWidgets) {
        widgets.push(...module.deviceWidgets)
      }
    }
    
    // Filter widgets based on conditions
    return widgets.filter(widget => {
      if (!widget.conditions) return true
      
      return widget.conditions.every(condition => {
        switch (condition.type) {
          case 'device_os':
            return device?.os?.toLowerCase().includes(condition.value.toLowerCase())
          case 'device_type':
            return device?.type === condition.value
          case 'has_data':
            return device && condition.field && device[condition.field] !== undefined
          default:
            return condition.customCheck ? condition.customCheck(device) : true
        }
      })
    }).sort((a, b) => (a.order || 999) - (b.order || 999))
  }

  const toggleWidgetExpansion = (widgetId: string) => {
    const newExpanded = new Set(expandedWidgets)
    if (newExpanded.has(widgetId)) {
      newExpanded.delete(widgetId)
    } else {
      newExpanded.add(widgetId)
    }
    setExpandedWidgets(newExpanded)
  }

  const getGridColumns = () => {
    switch (layoutConfig.columns) {
      case 1: return 'grid-cols-1'
      case 2: return 'grid-cols-1 lg:grid-cols-2'
      case 3: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
      case 4: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
      default: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
    }
  }

  const getGapSize = () => {
    switch (layoutConfig.gaps) {
      case 'small': return 'gap-4'
      case 'medium': return 'gap-6'
      case 'large': return 'gap-8'
      default: return 'gap-6'
    }
  }

  const getSizeClasses = (size: DeviceWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-1'
      case 'large': return 'col-span-2'
      case 'full': return 'col-span-full'
      default: return 'col-span-1'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 text-lg font-medium mb-2">
          {error || 'Device not found'}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-800"
        >
          Try Again
        </button>
      </div>
    )
  }

  const availableWidgets = getAvailableWidgets()

  return (
    <div className="space-y-6">
      {/* Layout Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {device.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {availableWidgets.length} widgets available from {registry.getEnabledModules().length} modules
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Column selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Columns:
            </label>
            <select
              value={layoutConfig.columns}
              onChange={(e) => setLayoutConfig(prev => ({ ...prev, columns: parseInt(e.target.value) }))}
              className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          
          {/* Gap selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Gaps:
            </label>
            <select
              value={layoutConfig.gaps}
              onChange={(e) => setLayoutConfig(prev => ({ ...prev, gaps: e.target.value as any }))}
              className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Widget Grid */}
      <div className={`grid ${getGridColumns()} ${getGapSize()}`}>
        {availableWidgets.map((widget) => {
          const Component = widget.component
          const isExpanded = expandedWidgets.has(widget.id)
          
          return (
            <div 
              key={widget.id} 
              className={`${getSizeClasses(widget.size)}`}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Widget Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {widget.name}
                      </h3>
                      {widget.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {widget.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Category badge */}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        widget.category === 'overview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        widget.category === 'hardware' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        widget.category === 'software' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        widget.category === 'security' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        widget.category === 'network' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {widget.category}
                      </span>
                      
                      {/* Expand/collapse button */}
                      <button
                        onClick={() => toggleWidgetExpansion(widget.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <svg 
                          className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Widget Content */}
                <div className={`transition-all duration-200 ${isExpanded ? '' : 'max-h-96 overflow-hidden'}`}>
                  <Component
                    deviceId={deviceId}
                    device={device}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleWidgetExpansion(widget.id)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* No widgets available */}
      {availableWidgets.length === 0 && (
        <div className="text-center py-16">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            No widgets available for this device
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enable modules to add device widgets and functionality.
          </p>
          <a
            href="/modules"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Manage Modules
          </a>
        </div>
      )}
    </div>
  )
}
