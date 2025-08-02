"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    // Log additional context
    console.error('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
    console.error('User agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown')
    console.error('Memory usage:', typeof performance !== 'undefined' && 'memory' in performance ? {
      usedJSHeapSize: (performance as typeof performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as typeof performance & { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as typeof performance & { memory: { jsHeapSizeLimit: number } }).memory.jsHeapSizeLimit
    } : 'Unknown')
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo)
  }

  clearError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Application Error
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A client-side error occurred
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                The application encountered an error while processing data. This is often caused by large Windows client data payloads exceeding browser memory limits.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-md mb-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Quick Recovery Steps:</h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Click &quot;Clear Data &amp; Reload&quot; to remove problematic events</li>
                  <li>• Try the &quot;Reload Dashboard&quot; button for a fresh start</li>
                  <li>• Check Windows client configuration to reduce payload sizes</li>
                </ul>
              </div>
              
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                    Technical Error Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                    {this.state.error.stack && '\n\nStack:\n' + this.state.error.stack.substring(0, 500)}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex gap-3 mb-4">
              <button
                onClick={this.clearError}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reload Dashboard
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Use Next.js API route for clearing events (if implemented)
                  fetch('/api/events', { method: 'DELETE' }).catch(() => null)
                  // Clear browser storage
                  try {
                    localStorage.clear()
                    sessionStorage.clear()
                  } catch (e) {
                    console.warn('Failed to clear storage:', e)
                  }
                  // Force reload
                  window.location.reload()
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Clear Data & Reload
              </button>
              <button
                onClick={() => {
                  const win = window.open('', '_blank')
                  if (win) {
                    win.document.write(`
                      <html>
                        <head><title>ReportMate Recovery</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                          <h2>Emergency Recovery Commands</h2>
                          <p>Run these commands to recover from the crash:</p>
                          <h3>For Production:</h3>
                          <code style="background: #f0f0f0; padding: 10px; display: block; margin: 10px 0;">
                            curl -X DELETE ${window.location.origin}/api/events
                          </code>
                          <h3>For Local Development:</h3>
                          <code style="background: #f0f0f0; padding: 10px; display: block; margin: 10px 0;">
                            node clear-events-emergency.js
                          </code>
                          <h3>Windows Client Fix:</h3>
                          <p>Check C:\\ProgramData\\ManagedReports\\queries.json and ensure queries return smaller datasets.</p>
                        </body>
                      </html>
                    `)
                  }
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors text-xs"
              >
                Recovery Guide
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
