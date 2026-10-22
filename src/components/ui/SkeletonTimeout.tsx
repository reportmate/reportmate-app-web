"use client"

import { useEffect, useState, type ReactNode } from "react"
import { SKELETON_LIMIT_MS } from "../../lib/data-cache"

/**
 * Rod's rule: a skeleton never lasts more than ten seconds. Shows `children`
 * (the skeleton) until the limit, then "Still loading… · Retry". When an
 * error has come back it shows that error with Retry straight away.
 *
 * Retry calls `onRetry` when given (and restarts the clock), otherwise
 * reloads the page.
 */
export function SkeletonTimeout({
  children,
  error,
  onRetry,
  page = false,
  limitMs = SKELETON_LIMIT_MS,
}: {
  children: ReactNode
  error?: string | null
  onRetry?: () => void
  /** Full-page skeleton: the notice sits centred in a page-height panel. */
  page?: boolean
  limitMs?: number
}) {
  const [stalled, setStalled] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setStalled(false)
    const timer = setTimeout(() => setStalled(true), limitMs)
    return () => clearTimeout(timer)
  }, [attempt, limitMs])

  if (!stalled && !error) return <>{children}</>

  const retry = () => {
    setAttempt(a => a + 1)
    if (onRetry) onRetry()
    else window.location.reload()
  }
  const notice = (
    <div
      role="status"
      data-testid="skeleton-timeout"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-3 rounded-lg border text-sm bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
    >
      <span>{error ? `Couldn't load: ${error}` : "Still loading…"}</span>
      <span aria-hidden="true" className="text-gray-400">·</span>
      <button
        type="button"
        onClick={retry}
        className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:no-underline"
      >
        Retry
      </button>
    </div>
  )
  if (!page) return <div className="p-6 flex justify-center">{notice}</div>
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex items-start justify-center pt-24 px-4">
      {notice}
    </div>
  )
}
