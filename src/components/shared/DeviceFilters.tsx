'use client'

import { useState } from 'react'
import { CollapsibleSection } from '../ui/CollapsibleSection'

export interface FilterOptions {
  statuses: string[]
  catalogs: string[]
  areas: string[]
  locations: string[]
  fleets: string[]
  platforms: string[]
  usages: string[]
}

interface DeviceFiltersProps {
  filterOptions: FilterOptions
  selectedStatuses: string[]
  selectedCatalogs: string[]
  selectedAreas: string[]
  selectedLocations: string[]
  selectedFleets: string[]
  selectedPlatforms: string[]
  selectedUsages: string[]
  onStatusToggle: (status: string) => void
  onCatalogToggle: (catalog: string) => void
  onAreaToggle: (area: string) => void
  onLocationToggle: (location: string) => void
  onFleetToggle: (fleet: string) => void
  onPlatformToggle: (platform: string) => void
  onUsageToggle: (usage: string) => void
  onClearAll: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  /** Optional external control of expanded state (for scroll-collapse integration) */
  expanded?: boolean
  /** Optional callback when expanded state is toggled from within */
  onToggle?: () => void
}

export default function DeviceFilters({
  filterOptions,
  selectedStatuses,
  selectedCatalogs,
  selectedAreas,
  selectedLocations,
  selectedFleets,
  selectedPlatforms,
  selectedUsages,
  onStatusToggle,
  onCatalogToggle,
  onAreaToggle,
  onLocationToggle,
  onFleetToggle,
  onPlatformToggle,
  onUsageToggle,
  onClearAll,
  searchQuery,
  onSearchChange,
  expanded: externalExpanded,
  onToggle
}: DeviceFiltersProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const filtersExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded
  const setFiltersExpanded = (val: boolean) => setInternalExpanded(val)
  
  const totalActiveFilters = selectedStatuses.length + selectedCatalogs.length + selectedAreas.length + 
    selectedLocations.length + selectedFleets.length + selectedPlatforms.length + selectedUsages.length

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      {/* Accordion Header */}
      <button
        onClick={() => onToggle ? onToggle() : setFiltersExpanded(!filtersExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selections</span>
          {totalActiveFilters > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {totalActiveFilters} active
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-90' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* Accordion Content */}
      <CollapsibleSection expanded={filtersExpanded}>
        <div className="px-6 pb-4">
          {/* Smart Grid Layout - maximizes space usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-8 gap-y-4">
            {/* Status Filter - Always show */}
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Status</div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => onStatusToggle(status)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      selectedStatuses.includes(status)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Filter - When available */}
            {filterOptions.platforms.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Platform</div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.platforms.map(platform => (
                    <button
                      key={platform}
                      onClick={() => onPlatformToggle(platform)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        selectedPlatforms.includes(platform)
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Filter - When available */}
            {filterOptions.usages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Usage</div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.usages.map(usage => (
                    <button
                      key={usage}
                      onClick={() => onUsageToggle(usage)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        selectedUsages.includes(usage)
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {usage}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog Filter - When available */}
            {filterOptions.catalogs.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Catalog</div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.catalogs.map(catalog => (
                    <button
                      key={catalog}
                      onClick={() => onCatalogToggle(catalog)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        selectedCatalogs.includes(catalog)
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {catalog}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fleet Filter - When available */}
            {filterOptions.fleets.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Fleet</div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.fleets.map(fleet => (
                    <button
                      key={fleet}
                      onClick={() => onFleetToggle(fleet)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        selectedFleets.includes(fleet)
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {fleet}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Area Filter - When available */}
            {filterOptions.areas.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Area</div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.areas.map(area => (
                    <button
                      key={area}
                      onClick={() => onAreaToggle(area)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        selectedAreas.includes(area)
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Location Filter - Full width due to many options */}
          {filterOptions.locations.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Location</div>
              <div className="flex flex-wrap gap-2">
                {filterOptions.locations.map(location => (
                  <button
                    key={location}
                    onClick={() => onLocationToggle(location)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      selectedLocations.includes(location)
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>


    </div>
  )
}