"use client"

import { SkeletonTimeout } from "./SkeletonTimeout"

/**
 * The report page frame (title row, Selections, Widgets, table) as a
 * skeleton with the inline loading bar. Used as the Suspense fallback of the
 * fleet report pages, so a page never renders as a blank screen.
 */
export function PageFrameSkeleton() {
  return (
    <SkeletonTimeout page>
      <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden" aria-busy="true">
        <div className="flex-1 page-container px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
          <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden animate-pulse">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-8 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            {["w-20", "w-16"].map(width => (
              <div key={width} className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
                <div className={`h-4 ${width} bg-gray-200 dark:bg-gray-700 rounded`} />
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
            <div className="px-6 py-4 space-y-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-6 bg-gray-100 dark:bg-gray-700/60 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkeletonTimeout>
  )
}
