"use client"

import { useState, useEffect } from 'react'

interface VersionInfo {
  version: string
  buildId: string
  buildTime: string
  imageTag: string
  nodeVersion: string
  platform: string
  arch: string
}

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchVersionInfo()
  }, [])

  const fetchVersionInfo = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/version')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setVersionInfo(result.data)
        }
      }
    } catch (error) {
      console.warn('Failed to fetch version info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyContainerInfo = async () => {
    if (!versionInfo) return
    
    const containerInfo = `Container Info:
Version: ${versionInfo.version}
Build ID: ${versionInfo.buildId}
Image Tag: ${versionInfo.imageTag}
Node Version: ${versionInfo.nodeVersion}
Platform: ${versionInfo.platform}/${versionInfo.arch}
Built: ${new Date(versionInfo.buildTime).toISOString()}
Timestamp: ${new Date().toISOString()}`

    try {
      await navigator.clipboard.writeText(containerInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = containerInfo
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Loading...</span>
      </div>
    )
  }

  const displayVersion = versionInfo?.version || '20250807220630-8992f2c'

  return (
    <div 
      className="relative flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={copyContainerInfo}
      title="Click to copy container info for debugging"
    >
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${copied ? 'bg-blue-500' : 'bg-green-500'}`}></div>
        <span>{copied ? 'Copied!' : `v${displayVersion}`}</span>
      </div>
      
      {showTooltip && versionInfo && (
        <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48">
          <div className="text-xs space-y-1">
            <div className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 mb-2 flex items-center justify-between">
              <span>Container Info</span>
              <span className="text-blue-600 dark:text-blue-400 text-xs">Click to copy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Version:</span>
              <span className="text-gray-900 dark:text-white font-mono">{versionInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Build ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">{versionInfo.buildId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Image:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">{versionInfo.imageTag.split(':')[1] || versionInfo.imageTag}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Node:</span>
              <span className="text-gray-900 dark:text-white font-mono">{versionInfo.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Platform:</span>
              <span className="text-gray-900 dark:text-white font-mono">{versionInfo.platform}/{versionInfo.arch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Built:</span>
              <span className="text-gray-900 dark:text-white text-xs">
                {new Date(versionInfo.buildTime).toLocaleString('sv-SE').replace('T', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
