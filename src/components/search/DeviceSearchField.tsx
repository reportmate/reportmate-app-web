"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Device {
  deviceId: string
  serialNumber: string
  name: string
  assetTag?: string
  status: string
}

interface DeviceSearchFieldProps {
  className?: string
  placeholder?: string
  preloadedDevices?: Device[]  // Optional pre-loaded devices for instant search
}

export function DeviceSearchField({ 
  className = "", 
  placeholder = "Find device by name, serial, or asset tag",
  preloadedDevices = []
}: DeviceSearchFieldProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Device[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Global keyboard shortcut (Ctrl/Cmd + K) to focus search
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleGlobalKeydown)
    return () => document.removeEventListener('keydown', handleGlobalKeydown)
  }, [])

  const searchDevices = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      let devices: Device[] = []
      
      // Use preloaded devices if available for instant search
      if (preloadedDevices && preloadedDevices.length > 0) {
        devices = preloadedDevices
      } else {
        // Fallback to API call if no preloaded devices
        const response = await fetch('/api/devices', {
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })

        if (response.ok) {
          const data = await response.json()
          devices = Array.isArray(data) ? data : (data.devices || [])
        }
      }
      
      if (devices.length > 0) {
        // Filter devices based on search query
        const filteredDevices = devices.filter((device: Device) => {
          const queryLower = query.toLowerCase()
          const serialMatch = device.serialNumber?.toLowerCase().includes(queryLower)
          const assetTagMatch = device.assetTag?.toLowerCase().includes(queryLower)
          const nameMatch = device.name?.toLowerCase().includes(queryLower)
          
          return serialMatch || assetTagMatch || nameMatch
        }).slice(0, 8) // Limit to 8 results

        setSuggestions(filteredDevices)
        setShowSuggestions(filteredDevices.length > 0)
        setSelectedIndex(-1)
        
        // Update dropdown position
        if (containerRef.current && filteredDevices.length > 0) {
          const rect = containerRef.current.getBoundingClientRect()
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          })
        }
      }
    } catch (error) {
      console.error('Error searching devices:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [preloadedDevices])

  // Debounced search function - faster debounce for preloaded devices
  useEffect(() => {
    const debounceTime = preloadedDevices && preloadedDevices.length > 0 ? 150 : 300
    const minSearchLength = preloadedDevices && preloadedDevices.length > 0 ? 1 : 2
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= minSearchLength) {
        searchDevices(searchQuery.trim())
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, debounceTime)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, preloadedDevices, searchDevices])

  const navigateToDevice = async (identifier: string) => {
    try {
      // First try to resolve the identifier to a serial number
      const response = await fetch(`/api/device/resolve/${encodeURIComponent(identifier)}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.resolved && result.serialNumber) {
          // Navigate to the resolved serial number
          router.push(`/device/${encodeURIComponent(result.serialNumber)}`)
        } else {
          // If not resolved, try direct navigation (might be a serial number already)
          router.push(`/device/${encodeURIComponent(identifier)}`)
        }
      } else {
        // If resolution API fails, try direct navigation
        router.push(`/device/${encodeURIComponent(identifier)}`)
      }
    } catch (error) {
      console.error('Error resolving device identifier:', error)
      // Fallback to direct navigation
      router.push(`/device/${encodeURIComponent(identifier)}`)
    }
    
    // Clear search state
    setSearchQuery("")
    setSuggestions([])
    setShowSuggestions(false)
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      // Navigate to selected suggestion
      const device = suggestions[selectedIndex]
      const identifier = device.assetTag || device.serialNumber
      await navigateToDevice(identifier)
    } else if (searchQuery.trim()) {
      // Navigate directly to the entered search query
      await navigateToDevice(searchQuery.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        if (inputRef.current) {
          inputRef.current.blur()
        }
        break
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      case 'stale': return 'bg-orange-500'
      case 'missing': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getHighlightedText = (text: string, query: string) => {
    if (!query) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) => (
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    ))
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const actualPlaceholder = placeholder

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            name="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
                // Update position on focus
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect()
                  setDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width
                  })
                }
              }
            }}
            placeholder={actualPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
          />
          
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
          className="z-[300] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((device, index) => (
            <button
              key={device.deviceId}
              type="button"
              onClick={async () => {
                const identifier = device.assetTag || device.serialNumber
                await navigateToDevice(identifier)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(device.status)}`}></div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getHighlightedText(device.name, searchQuery)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-x-2">
                    <span className="font-mono">
                      {getHighlightedText(device.serialNumber, searchQuery)}
                    </span>
                    {device.assetTag && (
                      <>
                        <span></span>
                        <span className="font-medium">
                          {getHighlightedText(device.assetTag, searchQuery)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Navigation arrow */}
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
