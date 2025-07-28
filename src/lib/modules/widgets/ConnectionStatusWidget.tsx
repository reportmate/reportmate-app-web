/**
 * Connection Status Widget
 * Simple pill-shaped status indicator
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
      case 'polling':
        return { text: 'Connected', color: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' }
      case 'connecting':
      case 'reconnecting':
        return { text: 'Connecting', color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' }
      case 'error':
      case 'disconnected':
      default:
        return { text: 'Stale', color: 'text-red-500 dark:text-red-300', dot: 'bg-red-400' }
    }
  }

  const status = getConnectionStatus()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
      <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
      <span className={`text-sm font-medium ${status.color}`}>
        {status.text}
      </span>
    </div>
  )
}
