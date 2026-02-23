'use client'

import React from 'react'
import { useDebugMode } from '../providers/DebugModeProvider'

interface DebugAccordionProps {
  data: unknown
  label: string
  moduleVersion?: string
}

export const DebugAccordion: React.FC<DebugAccordionProps> = ({ data, label, moduleVersion }) => {
  const { debugMode } = useDebugMode()

  if (!debugMode) return null

  return (
    <div className="mt-6">
      <details className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug API JSON Data</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {label}
          </span>
        </summary>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex justify-end gap-2 mb-2">
              <button
                onClick={() => {
                  const jsonString = JSON.stringify(data, null, 2)
                  navigator.clipboard.writeText(jsonString)
                }}
                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto rounded border border-gray-700">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </details>
      {moduleVersion && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
          Module version {moduleVersion}
        </p>
      )}
    </div>
  )
}

export default DebugAccordion
