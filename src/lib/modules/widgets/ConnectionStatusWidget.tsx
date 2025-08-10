/**
 * Connection Status Widget
 * Simple pill-shaped status indicator
 */

import React, { useState } from 'react'

interface ConnectionStatusWidgetProps {
  connectionStatus: string
}

export const ConnectionStatusWidget: React.FC<ConnectionStatusWidgetProps> = ({ 
  connectionStatus 
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    // Set 2-second delay for tooltip
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 1000)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowTooltip(false)
    // Clear timeout if user leaves before tooltip shows
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return { 
          text: 'Connected', 
          color: 'text-green-600 dark:text-green-400', 
          dot: 'bg-green-500',
          tooltip: 'Real-time connection is active and working'
        }
      case 'polling':
        return { 
          text: 'Polling', 
          color: 'text-green-600 dark:text-green-400', 
          dot: 'bg-green-500',
          tooltip: 'HTTP polling /api/events every 5 seconds'
        }
      case 'connecting':
        return { 
          text: 'Connecting', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          dot: 'bg-yellow-500',
          tooltip: 'Real-time connection handshake in progress'
        }
      case 'reconnecting':
        return { 
          text: 'Reconnecting', 
          color: 'text-yellow-600 dark:text-yellow-400', 
          dot: 'bg-yellow-500',
          tooltip: 'Attempting to reconnect to real-time service'
        }
      case 'error':
        return { 
          text: 'Error', 
          color: 'text-red-500 dark:text-red-300', 
          dot: 'bg-red-400',
          tooltip: 'Connection failed, events may be delayed'
        }
      case 'disconnected':
        return { 
          text: 'Disconnected', 
          color: 'text-red-500 dark:text-red-300', 
          dot: 'bg-red-400',
          tooltip: 'Connection was terminated, events may be delayed'
        }
      default:
        return { 
          text: 'Stale', 
          color: 'text-red-500 dark:text-red-300', 
          dot: 'bg-red-400',
          tooltip: 'Connection status unknown, events may be delayed'
        }
    }
  }

  const status = getConnectionStatus()

  return (
    <div className="relative">
      <div 
        className={`flex items-center h-6 rounded-full bg-gray-100 dark:bg-gray-700 transition-all duration-300 ease-in-out ${
          isHovered ? 'px-3 justify-start' : 'w-6 justify-center'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0`}></div>
        <div className={`transition-all duration-300 ease-in-out ${
          isHovered ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0'
        }`}>
          <span className={`text-sm font-medium ${status.color} whitespace-nowrap`}>
            {status.text}
          </span>
        </div>
      </div>
      
      {/* Custom Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-100 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap z-50 border border-gray-700 dark:border-gray-600">
          {status.tooltip}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
        </div>
      )}
    </div>
  )
}
