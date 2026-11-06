"use client"

import { useId } from "react"

/**
 * The one Export CSV button for every report: filled emerald, document icon.
 * `details` explains what the file holds; it shows as a tooltip on hover and
 * keyboard focus and is the button's accessible description.
 */
export function ExportCsvButton({
  onClick,
  label = "Export CSV",
  details,
  disabled,
}: {
  onClick: () => void
  label?: string
  details?: string
  disabled?: boolean
}) {
  const id = useId()
  const tipId = `${id}-export-details`
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={details ? tipId : undefined}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {label}
      </button>
      {details && (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full mt-2 z-30 w-64 rounded-lg px-3 py-2 text-xs font-normal leading-snug shadow-lg bg-gray-900 text-gray-100 dark:bg-gray-700 opacity-0 invisible transition-opacity group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible"
        >
          {details}
        </span>
      )}
    </span>
  )
}
