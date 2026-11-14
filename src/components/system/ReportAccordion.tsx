"use client"

import type { ReactNode } from "react"
import { CollapsibleSection } from "../ui/CollapsibleSection"

// The report-builder accordion that sits under the shared Selections accordion,
// in the same place and style as the Applications picker on /applications.
export function ReportAccordion({ label, activeCount, expanded, onToggle, children }: {
  label: string
  activeCount: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button type="button" onClick={onToggle} aria-expanded={expanded}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-90" : "rotate-180"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <CollapsibleSection expanded={expanded}>
        <div className="px-6 pb-4 space-y-4">{children}</div>
      </CollapsibleSection>
    </div>
  )
}
