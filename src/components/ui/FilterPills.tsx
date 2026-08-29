/**
 * Compact segmented filter: one pill per option with its count, one active at
 * a time. Used above tables where a dropdown would hide the distribution.
 */

import React from 'react'

export interface FilterPillOption<T extends string> {
  value: T
  label: string
  count: number
}

interface FilterPillsProps<T extends string> {
  options: FilterPillOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function FilterPills<T extends string>({ options, value, onChange, ariaLabel }: FilterPillsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-r last:border-r-0 border-gray-300 dark:border-gray-600 transition-colors ${
              active
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {option.label}
            <span className={`ml-1.5 tabular-nums ${active ? 'opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>{option.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export default FilterPills
