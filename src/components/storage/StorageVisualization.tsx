/**
 * Storage Visualization Component
 * Provides comprehensive storage analysis with hierarchical drill-down, donut charts, and size-based sorting
 */

import React, { useState, useMemo } from 'react'
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, ServerIcon } from '@heroicons/react/24/outline'

interface StorageDirectory {
  name: string
  path: string
  size: number
  depth: number
  category: string
  driveRoot: string
  fileCount: number
  largeFiles: any[]
  lastModified: string
  formattedSize: string
  subdirectories: StorageDirectory[]
  percentageOfDrive: number
  subdirectoryCount: number
}

interface StorageDevice {
  name: string
  type: string
  health: string
  capacity: number
  freeSpace: number
  interface: string
  lastAnalyzed: string
  rootDirectories: StorageDirectory[]
  storageAnalysisEnabled: boolean
}

interface StorageVisualizationProps {
  storageDevices: StorageDevice[]
}

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper function to format percentage
const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`
}

// Helper function to get color based on category
const getCategoryColor = (category: string, directoryName?: string): string => {
  // Special handling for ProgramData - make it more prominent with red color
  if (directoryName === "ProgramData") {
    return '#EF4444' // Red for ProgramData to make it stand out
  }
  
  const colors: { [key: string]: string } = {
    'ProgramFiles': '#3B82F6', // Blue
    'Users': '#10B981', // Green
    'System': '#F59E0B', // Orange
    'Other': '#8B5CF6', // Purple
    'ProgramData': '#EF4444' // Red
  }
  return colors[category] || '#6B7280' // Gray fallback
}

// Helper function to get text color based on category
const getCategoryTextColor = (category: string, directoryName?: string): string => {
  // Special handling for ProgramData - make it more prominent
  if (directoryName === "ProgramData") {
    return 'text-red-600 dark:text-red-400 font-semibold' // Bold red for ProgramData
  }
  
  const colors: { [key: string]: string } = {
    'ProgramFiles': 'text-blue-600 dark:text-blue-400',
    'Users': 'text-green-600 dark:text-green-400', 
    'System': 'text-orange-600 dark:text-orange-400',
    'Other': 'text-purple-600 dark:text-purple-400',
    'ProgramData': 'text-red-600 dark:text-red-400'
  }
  return colors[category] || 'text-gray-600 dark:text-gray-400'
}

// Donut Chart Component
const DonutChart: React.FC<{ 
  directories: StorageDirectory[], 
  capacity: number,
  onDirectoryClick?: (directory: StorageDirectory) => void
}> = ({ directories, capacity, onDirectoryClick }) => {
  const radius = 80  // Reduced from 100 for better space usage
  const strokeWidth = 24  // Reduced from 30 for better space usage
  const normalizedRadius = radius - strokeWidth * 0.5
  const circumference = normalizedRadius * 2 * Math.PI

  let accumulatedPercentage = 0
  const segments = directories.map((dir, index) => {
    const percentage = (dir.size / capacity) * 100
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -accumulatedPercentage * (circumference / 100)
    accumulatedPercentage += percentage

    return (
      <circle
        key={index}
        stroke={getCategoryColor(dir.category, dir.name)}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        transform={`rotate(-90 ${radius} ${radius})`}
        className="transition-all duration-300 hover:stroke-opacity-80 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          console.log('Donut segment clicked:', dir.name)
          onDirectoryClick?.(dir)
        }}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      />
    )
  })

  // Calculate used percentage
  const usedSpace = directories.reduce((sum, dir) => sum + dir.size, 0)
  const usedPercentage = Math.round((usedSpace / capacity) * 100)

  return (
    <div className="relative inline-block">
      <svg width={radius * 2} height={radius * 2}>
        {/* Background circle */}
        <circle
          stroke="#E5E7EB"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="dark:stroke-gray-700"
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        {segments}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {usedPercentage}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Used
          </div>
        </div>
      </div>
    </div>
  )
}

// Directory Tree Item Component
const DirectoryTreeItem: React.FC<{
  directory: StorageDirectory
  level: number
  maxDepth: number
  onToggle: (path: string) => void
  expandedPaths: Set<string>
}> = ({ directory, level, maxDepth, onToggle, expandedPaths }) => {
  const isExpanded = expandedPaths.has(directory.path)
  const hasSubdirectories = directory.subdirectories && directory.subdirectories.length > 0
  const canExpand = hasSubdirectories && level < maxDepth

  // Sort subdirectories by size (largest first)
  const sortedSubdirectories = useMemo(() => {
    if (!directory.subdirectories) return []
    return [...directory.subdirectories].sort((a, b) => b.size - a.size)
  }, [directory.subdirectories])

  const indentStyle = { paddingLeft: `${level * 1.5}rem` }

  return (
    <div className="select-none" id={`dir-${directory.path.replace(/[^a-zA-Z0-9]/g, '-')}`}>
      <div
        className={`flex items-center py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
          canExpand ? '' : 'cursor-default'
        }`}
        style={indentStyle}
        onClick={() => canExpand && onToggle(directory.path)}
      >
        {/* Expand/Collapse Icon */}
        <div className="w-5 h-5 flex items-center justify-center mr-2">
          {canExpand ? (
            isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <FolderIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>

        {/* Directory Info */}
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center">
              <span className={`font-medium truncate ${getCategoryTextColor(directory.category, directory.name)}`}>
                {directory.name}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {directory.path}
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatBytes(directory.size)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatPercentage(directory.percentageOfDrive)} of drive
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subdirectories */}
      {isExpanded && canExpand && (
        <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-2">
          {sortedSubdirectories.map((subdir) => (
            <DirectoryTreeItem
              key={subdir.path}
              directory={subdir}
              level={level + 1}
              maxDepth={maxDepth}
              onToggle={onToggle}
              expandedPaths={expandedPaths}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main Storage Visualization Component
export const StorageVisualization: React.FC<StorageVisualizationProps> = ({ storageDevices }) => {
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  // Filter devices with valid data
  const validDevices = storageDevices.filter(device => 
    device.capacity > 0 && device.rootDirectories && device.rootDirectories.length > 0
  )

  // Apply sorting only (no promotion needed since ProgramData is now its own root directory)
  // Must be before early return to satisfy React Hooks rules
  const selectedDevice = validDevices[selectedDeviceIndex] || null
  const sortedDirectories = useMemo(() => {
    if (!selectedDevice) return []
    return selectedDevice.rootDirectories.sort((a, b) => b.size - a.size)
  }, [selectedDevice])

  if (validDevices.length === 0) {
    return (
      <div className="text-center py-8">
        <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Storage Data</h3>
        <p className="text-gray-600 dark:text-gray-400">Storage analysis data is not available.</p>
      </div>
    )
  }

  const handleToggleExpanded = (path: string) => {
    const newExpandedPaths = new Set(expandedPaths)
    if (newExpandedPaths.has(path)) {
      newExpandedPaths.delete(path)
    } else {
      newExpandedPaths.add(path)
    }
    setExpandedPaths(newExpandedPaths)
  }

  // Helper function to get all possible paths for expand all functionality
  const getAllPaths = (directories: StorageDirectory[]): string[] => {
    const paths: string[] = []
    const traverse = (dirs: StorageDirectory[]) => {
      dirs.forEach(dir => {
        paths.push(dir.path)
        if (dir.subdirectories) {
          traverse(dir.subdirectories)
        }
      })
    }
    traverse(directories)
    return paths
  }

  const totalUsedSpace = sortedDirectories.reduce((sum, dir) => sum + dir.size, 0)
  const usedPercentage = Math.round((totalUsedSpace / selectedDevice.capacity) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      {/* Device Tabs */}
      {validDevices.length > 1 && (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {validDevices.map((device, index) => (
              <button
                key={index}
                onClick={() => setSelectedDeviceIndex(index)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedDeviceIndex === index
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {device.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content - True Two Column Layout */}
      <div className="flex gap-8">
        {/* Left Sidebar - Storage Analysis & Drive Overview (20%) */}
        <div className="w-1/5 flex-shrink-0">
          <div className="sticky top-4 space-y-6">
            {/* Storage Analysis Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Storage Analysis</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDevice.name} {selectedDevice.type} {formatBytes(selectedDevice.capacity)} Total
              </p>
            </div>
            
            {/* Drive Info and Donut Chart - Side by side */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Drive Overview
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDevice.health} Health
                </div>
              </div>
              
              {/* Donut Chart */}
              <div className="flex-shrink-0 py-5">
                <DonutChart 
                  directories={sortedDirectories} 
                  capacity={selectedDevice.capacity}
                  onDirectoryClick={(directory) => {
                    console.log('Directory click handler called for:', directory.name)
                    // Toggle expansion of the clicked directory
                    const newExpandedPaths = new Set(expandedPaths)
                    if (newExpandedPaths.has(directory.path)) {
                      newExpandedPaths.delete(directory.path)
                    } else {
                      newExpandedPaths.add(directory.path)
                    }
                    setExpandedPaths(newExpandedPaths)
                    console.log('Expanded paths updated:', newExpandedPaths)
                    
                    // Scroll to the directory in the right panel
                    setTimeout(() => {
                      const element = document.getElementById(`dir-${directory.path.replace(/[^a-zA-Z0-9]/g, '-')}`)
                      console.log('Scrolling to element:', element)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }
                    }, 100)
                  }}
                />
              </div>
            </div>

            {/* Storage Stats - Table-like layout */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">Capacity</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatBytes(selectedDevice.capacity)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">Used</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {formatBytes(totalUsedSpace)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">Free</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatBytes(selectedDevice.freeSpace)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">Usage</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {usedPercentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gap Space (5%) */}
        <div className="w-[3%] flex-shrink-0"></div>

        {/* Right Side - Directory Breakdown (75%) */}
        <div className="w-3/4 min-w-0 overflow-hidden">
          {/* Directory Breakdown Header with integrated controls */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Directory Breakdown</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {sortedDirectories.length} root directories Sorted by size Click donut segments or legend to expand
              </div>
            </div>
            
            {/* Integrated Expand/Collapse Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => setExpandedPaths(new Set(getAllPaths(sortedDirectories)))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={() => setExpandedPaths(new Set())}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
          
        {/* Directory Tree */}
        <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
          {sortedDirectories.map((directory) => (
            <DirectoryTreeItem
              key={directory.path}
              directory={directory}
              level={0}
              maxDepth={4}
              onToggle={handleToggleExpanded}
              expandedPaths={expandedPaths}
            />
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

export default StorageVisualization
