/**
 * SignalR Status Component
 * Shows current real-time connection status and provides setup guidance
 */

import React, { useState } from 'react'

interface SignalRStatusProps {
  connectionStatus: string
  mounted: boolean
}

export function SignalRStatus({ connectionStatus, mounted }: SignalRStatusProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const isSignalREnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNALR === 'true'
  const apiBaseUrl = process.env.API_BASE_URL

  const getStatusConfig = () => {
    if (!mounted) {
      return {
        icon: '',
        title: 'Initializing',
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-800'
      }
    }

    switch (connectionStatus) {
      case 'connected':
        return {
          icon: '',
          title: 'SignalR Connected',
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-900/20'
        }
      case 'polling':
        return {
          icon: '',
          title: 'HTTP Polling Active',
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20'
        }
      case 'connecting':
      case 'reconnecting':
        return {
          icon: '',
          title: 'Connecting...',
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20'
        }
      default:
        return {
          icon: '',
          title: 'Connection Failed',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20'
        }
    }
  }

  const status = getStatusConfig()

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${status.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl">{status.icon}</span>
          <div>
            <h3 className={`font-medium ${status.color}`}>
              {status.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {connectionStatus === 'polling' 
                ? 'Events update every 10 seconds via HTTP'
                : connectionStatus === 'connected'
                ? 'Real-time events via SignalR'
                : 'Checking connection...'
              }
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">SignalR Enabled:</span>
              <span className={isSignalREnabled ? 'text-green-600' : 'text-red-600'}>
                {isSignalREnabled ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">API Base URL:</span>
              <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                {apiBaseUrl || 'Not configured'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Current Status:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {connectionStatus}
              </span>
            </div>

            {!isSignalREnabled && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>To enable SignalR:</strong><br />
                  1. Set <code>NEXT_PUBLIC_ENABLE_SIGNALR=true</code> in .env.local<br />
                  2. Ensure your API has a <code>/api/negotiate</code> endpoint<br />
                  3. Configure Azure WebPubSub or SignalR hub
                </p>
              </div>
            )}

            {isSignalREnabled && connectionStatus === 'polling' && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>SignalR fallback to polling:</strong><br />
                  The <code>/api/negotiate</code> endpoint is not available.<br />
                  Check your Azure Functions deployment and WebPubSub configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
