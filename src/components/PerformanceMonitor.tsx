/**
 * Performance Monitor Component
 * Displays memory usage and performance metrics in development mode
 */

import React, { useState, useEffect } from 'react'
import { memoryManager } from '../lib/memory-utils'

interface PerformanceStats {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null
  components: Record<string, {
    mounted: number
    unmounted: number
    active: string[]
  }>
  activeIntervals: number
  activeConnections: number
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const updateStats = () => {
      const memoryStats = memoryManager.getMemoryStats()
      const componentStats = memoryManager.getComponentStats()
      
      const newStats = {
        memory: memoryStats,
        components: componentStats,
        activeIntervals: (memoryManager as any).intervals?.size || 0,
        activeConnections: (memoryManager as any).connections?.size || 0
      }

      setStats(newStats)

      // Show warning if memory usage is high
      if (memoryStats && memoryStats.usedJSHeapSize > 100) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }
    }

    // Update every 10 seconds
    updateStats()
    const interval = setInterval(updateStats, 10000)
    
    return () => clearInterval(interval)
  }, [])

  if (process.env.NODE_ENV !== 'development' || !stats) {
    return null
  }

  const memoryUsagePercent = stats.memory 
    ? Math.round((stats.memory.usedJSHeapSize / stats.memory.jsHeapSizeLimit) * 100)
    : 0

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${showWarning ? 'animate-pulse' : ''}`}>
      <div className={`bg-gray-900 text-white rounded-lg shadow-lg border ${
        showWarning ? 'border-red-500' : 'border-gray-600'
      }`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full p-3 text-left hover:bg-gray-800 rounded-lg ${
            showWarning ? 'text-red-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {showWarning ? '' : ''}Memory: {stats.memory?.usedJSHeapSize || 0}MB ({memoryUsagePercent}%)
            </span>
            <span className="text-xs">
              {isExpanded ? '' : ''}
            </span>
          </div>
        </button>
        
        {isExpanded && (
          <div className="p-3 border-t border-gray-600 text-xs space-y-2">
            {stats.memory && (
              <div>
                <div className="font-medium mb-1">Memory</div>
                <div>Used: {stats.memory.usedJSHeapSize}MB</div>
                <div>Total: {stats.memory.totalJSHeapSize}MB</div>
                <div>Limit: {stats.memory.jsHeapSizeLimit}MB</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      memoryUsagePercent > 70 ? 'bg-red-500' : 
                      memoryUsagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(memoryUsagePercent, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            <div>
              <div className="font-medium">Resources</div>
              <div>Intervals: {stats.activeIntervals}</div>
              <div>Connections: {stats.activeConnections}</div>
            </div>

            <div>
              <div className="font-medium">Components</div>
              {Object.entries(stats.components).map(([name, data]) => (
                <div key={name} className="text-xs">
                  {name}: {data.active.length} active
                  {data.active.length > 5 && (
                    <span className="text-red-300 ml-1"></span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                memoryManager.logMemoryStatus('Manual Check')
                if (typeof window !== 'undefined' && (window as any).gc) {
                  (window as any).gc()
                }
              }}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
            >
              Log Status & GC
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
