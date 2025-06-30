/**
 * Connection Status Widget
 * Shows the real-time connection status for live events
 */

import React from 'react'

interface ConnectionStatusWidgetProps {
  connectionStatus: string
}

export const ConnectionStatusWidget: React.FC<ConnectionStatusWidgetProps> = ({ 
  connectionStatus 
}) => {
  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Live', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' }
      case 'connecting':
      case 'reconnecting':
        return { text: 'Connecting', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' }
      case 'polling':
        return { text: 'Polling', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }
      case 'error':
      case 'disconnected':
      default:
        return { text: 'Offline', color: 'text-red-500 dark:text-red-300', dot: 'bg-red-400' }
    }
  }

  const status = getConnectionStatus()

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
      <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div>
      <span className={`text-sm font-medium ${status.color}`}>
        {status.text}
      </span>
    </div>
  )
}
