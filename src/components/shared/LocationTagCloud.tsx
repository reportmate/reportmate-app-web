'use client'

interface LocationTagCloudProps {
  /** All unique location names */
  locations: string[]
  /** Map of location name → device count */
  locationCounts: Record<string, number>
  /** Currently selected locations */
  selectedLocations: string[]
  /** Toggle callback */
  onToggle: (location: string) => void
  /** Optional label override (default: "Location") */
  label?: string
}

export default function LocationTagCloud({
  locations,
  locationCounts,
  selectedLocations,
  onToggle,
  label = 'Location'
}: LocationTagCloudProps) {
  if (locations.length === 0) return null

  const counts = locationCounts
  const hasCounts = Object.keys(counts).length > 0
  const values = hasCounts ? Object.values(counts) : [1]
  const maxCount = Math.max(...values)
  const minCount = Math.min(...values)
  const range = maxCount - minCount || 1

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
        {label} {selectedLocations.length > 0 && `(${selectedLocations.length} selected)`}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {locations.map(location => {
          const count = counts[location] || 0
          // Log scale: compresses large values so a room with 67 isn't enormous
          const ratio = hasCounts
            ? Math.log(count - minCount + 1) / Math.log(range + 1)
            : 0
          // Font: 0.65rem → 1.08rem, padding and weight scale too
          const fontSize = hasCounts ? `${0.65 + ratio * 0.43}rem` : undefined
          const py = hasCounts ? `${0.1 + ratio * 0.28}rem` : undefined
          const px = hasCounts ? `${0.5 + ratio * 0.4}rem` : undefined
          const fontWeight = hasCounts ? (ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 500) : undefined
          const isSelected = selectedLocations.includes(location)
          return (
            <button
              key={location}
              onClick={() => onToggle(location)}
              title={count ? `${count} device${count !== 1 ? 's' : ''}` : location}
              style={hasCounts ? { fontSize, fontWeight, paddingTop: py, paddingBottom: py, paddingLeft: px, paddingRight: px } : undefined}
              className={`rounded-full border transition-colors ${
                isSelected
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }${!hasCounts ? ' px-3 py-1 text-xs font-medium' : ''}`}
            >
              {location}
            </button>
          )
        })}
      </div>
    </div>
  )
}
