"use client"

import { useState, useEffect } from 'react'
import { memoryManager } from '../lib/memory-utils'

interface MemoryStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export function MemoryWarning() {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const checkMemory = () => {
      const stats = memoryManager.getMemoryStats()
      if (stats) {
        setMemoryStats(stats)
        
        // Show warning if memory usage is over 150MB
        const shouldShowWarning = stats.usedJSHeapSize > 150 && !dismissed
        setShowWarning(shouldShowWarning)
        
        // Auto-dismiss warning after 10 seconds
        if (shouldShowWarning) {
          const timer = setTimeout(() => {
            setShowWarning(false)
            setDismissed(true)
          }, 10000)
          
          return () => clearTimeout(timer)
        }
      }
    }

    // Check memory every 30 seconds
    const interval = setInterval(checkMemory, 30000)
    checkMemory() // Initial check

    return () => clearInterval(interval)
  }, [dismissed])

  if (!showWarning || !memoryStats) {
    return null
  }

  const handleDismiss = () => {
    setShowWarning(false)
    setDismissed(true)
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
            High Memory Usage
          </h3>
          <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
            Using {memoryStats.usedJSHeapSize}MB of {memoryStats.jsHeapSizeLimit}MB. 
            Consider refreshing the page if performance is slow.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleReload}
              className="text-xs bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-orange-400 hover:text-orange-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}