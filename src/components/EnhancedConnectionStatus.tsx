/**
 * Enhanced Connection Status Component
 * Shows detailed connection health with visual indicators
 */

import React from 'react'
import { formatRelativeTime } from '../../src/lib/time'

interface ConnectionHealth {
  status: 'connected' | 'connecting' | 'error' | 'polling'
  lastUpdate: Date | null
  consecutiveErrors: number
  latency: number | null
  eventsReceived: number
}

interface ConnectionStatusProps {
  connectionHealth: ConnectionHealth
  className?: string
}

export const EnhancedConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  connectionHealth, 
  className = '' 
}) => {
  const { status, lastUpdate, consecutiveErrors, latency, eventsReceived } = connectionHealth

  const getStatusConfig = () => {
    switch (status) {
      case 'polling':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Connected',
          description: 'Live updates active'
        }
      case 'connecting':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ),
          label: 'Connecting',
          description: 'Establishing connection...'
        }
      case 'error':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Connection Issues',
          description: `${consecutiveErrors} consecutive failures`
        }
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Unknown',
          description: 'Status unknown'
        }
    }
  }

  const config = getStatusConfig()

  const getLatencyColor = (latency: number | null) => {
    if (!latency) return 'text-gray-500'
    if (latency < 500) return 'text-green-600 dark:text-green-400'
    if (latency < 1000) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} ${className}`}>
      {/* Status Icon */}
      <div className={config.color}>
        {config.icon}
      </div>
      
      {/* Status Text */}
      <div className="flex flex-col">
        <div className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {config.description}
        </div>
      </div>
      
      {/* Detailed Stats */}
      <div className="ml-2 pl-2 border-l border-gray-300 dark:border-gray-600 text-xs space-y-1">
        {lastUpdate && (
          <div className="text-gray-600 dark:text-gray-400">
            Updated {formatRelativeTime(lastUpdate.toISOString())}
          </div>
        )}
        {latency !== null && (
          <div className={getLatencyColor(latency)}>
            {latency}ms latency
          </div>
        )}
        <div className="text-gray-600 dark:text-gray-400">
          {eventsReceived} events received
        </div>
      </div>
    </div>
  )
}
