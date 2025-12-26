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

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  preloadedDevices?: Device[]
}

export function SearchModal({ isOpen, onClose, preloadedDevices = [] }: SearchModalProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Device[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
        }).slice(0, 10) // Limit to 10 results for modal

        setSuggestions(filteredDevices)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Error searching devices:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [preloadedDevices])

  // Debounced search
  useEffect(() => {
    const debounceTime = preloadedDevices && preloadedDevices.length > 0 ? 150 : 300
    const minSearchLength = 1
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= minSearchLength) {
        searchDevices(searchQuery.trim())
      } else {
        setSuggestions([])
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
          router.push(`/device/${encodeURIComponent(result.serialNumber)}`)
        } else {
          router.push(`/device/${encodeURIComponent(identifier)}`)
        }
      } else {
        router.push(`/device/${encodeURIComponent(identifier)}`)
      }
    } catch (error) {
      console.error('Error resolving device identifier:', error)
      router.push(`/device/${encodeURIComponent(identifier)}`)
    }
    
    // Close modal and clear state
    setSearchQuery("")
    setSuggestions([])
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      const device = suggestions[selectedIndex]
      const identifier = device.assetTag || device.serialNumber
      await navigateToDevice(identifier)
    } else if (searchQuery.trim()) {
      await navigateToDevice(searchQuery.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  if (!isOpen) return null

  return (
      <div className="fixed inset-0 z-[300] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Search Input */}
          <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                name="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Find device by name, serial, or asset tag"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                className="w-full pl-10 pr-10 py-3 text-base border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 outline-none"
              />
              
              {/* Search Icon */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>

          {/* Results */}
          {suggestions.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
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

          {/* Empty state */}
          {searchQuery && !isLoading && suggestions.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No devices found matching "{searchQuery}"</p>
            </div>
          )}

          {/* Help text */}
          {!searchQuery && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm">Search by device name, serial number, or asset tag</p>
              <p className="text-xs mt-2">Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd> to close</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
