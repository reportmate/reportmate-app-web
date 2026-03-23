'use client'

import { useDemoMode } from '../../providers/DemoModeProvider'

export function DemoBanner() {
  const { isDemoMode } = useDemoMode()

  if (!isDemoMode) return null

  return (
    <span className="inline-flex items-center ml-4 px-4 py-1 rounded-full text-sm font-semibold bg-amber-500 text-white whitespace-nowrap">
      Live Demo
    </span>
  )
}
