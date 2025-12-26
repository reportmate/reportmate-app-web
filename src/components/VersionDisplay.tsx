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

  const handleCopyToClipboard = async () => {
    const info = resolvedVersionInfo
    const textToCopy = `Container: ${info.imageTag}\nTag: ${info.version}\nCommit: ${info.buildId}\nNode: ${info.nodeVersion}\nPlatform: ${info.platform}/${info.arch}\nBuilt: ${info.buildTime}`
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
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

  const defaultVersion = process.env.NEXT_PUBLIC_VERSION ?? process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown'
  const displayVersion = versionInfo?.version || defaultVersion

  const defaultBuildId = process.env.NEXT_PUBLIC_BUILD_ID ?? 'unknown'
  const defaultBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? 'unknown'
  const resolvedVersionInfo = versionInfo ?? {
    version: displayVersion,
    buildId: defaultBuildId,
    buildTime: defaultBuildTime,
    imageTag: `reportmateacr.azurecr.io/reportmate:${displayVersion}`,
    nodeVersion: 'vUnknown',
    platform: 'unknown',
    arch: 'unknown'
  }

  // Format version for display: 20250911054209-16416de -> 2025.09.11.054209-16416de
  const formatVersionForDisplay = (version: string): string => {
    const match = version.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-(.+)$/)
    if (match) {
      const [, year, month, day, hour, minute, second, hash] = match
      return `${year}.${month}.${day}.${hour}${minute}${second}-${hash}`
    }
    return version // Return original if it doesn't match the expected format
  }

  const formattedDisplayVersion = formatVersionForDisplay(displayVersion)

  return (
    <div 
      className="relative flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer transition-colors hover:text-gray-700 dark:hover:text-gray-200"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleCopyToClipboard}
    >
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full bg-green-500`}></div>
        <span>{`v${formattedDisplayVersion}`}</span>
      </div>
      
      {showTooltip && (
        <div 
          className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
          onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(); }}
          onMouseEnter={() => setShowTooltip(true)}
        >
          <div className="text-xs space-y-1">
            <div className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1 mb-2 flex items-center justify-between">
              <span>Container Info</span>
              <span className={`text-xs ${copied ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {copied ? 'Copied!' : 'Click to copy'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Tag:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">{resolvedVersionInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Commit:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">{resolvedVersionInfo.buildId.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Registry:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {resolvedVersionInfo.imageTag.includes('/') ? resolvedVersionInfo.imageTag.split('/')[0] : 'local'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Node:</span>
              <span className="text-gray-900 dark:text-white font-mono">{resolvedVersionInfo.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Platform:</span>
              <span className="text-gray-900 dark:text-white font-mono">{resolvedVersionInfo.platform}/{resolvedVersionInfo.arch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Built:</span>
              <span className="text-gray-900 dark:text-white text-xs">
                {resolvedVersionInfo.buildTime !== 'unknown'
                  ? new Date(resolvedVersionInfo.buildTime).toLocaleString('sv-SE').replace('T', ' ')
                  : 'unknown'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
