'use client'

import { useDemoMode } from '../../providers/DemoModeProvider'

export function DemoBanner() {
  const { isDemoMode } = useDemoMode()

  if (!isDemoMode) return null

  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-black dark:text-white text-center text-sm font-medium py-1.5 px-4 relative z-50">
      This is a live demo &mdash; data resets periodically.{' '}
      <a
        href="https://reportmate.app"
        className="underline font-semibold hover:text-gray-800 dark:hover:text-gray-200"
      >
        Learn more
      </a>
    </div>
  )
}
