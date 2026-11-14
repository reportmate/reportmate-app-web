"use client"

import { useEffect, useState, type ReactNode } from "react"
import { SKELETON_LIMIT_MS } from "../../lib/data-cache"
import { LoadingProgress } from "./LoadingProgress"

/**
 * Rod's rule: a skeleton never lasts more than ten seconds without saying so.
 * The skeleton (`children`) always stays on screen, so a slow page keeps its
 * frame; the notice is added beside it, never in place of it.
 *
 * `page`: a full-page skeleton. The inline loading bar sits in the title row
 * from the start and turns into "Still loading… · Retry" at the limit.
 * Otherwise: a section skeleton, with "Still loading… · Retry" added above it
 * at the limit. An error that came back shows straight away with Retry.
 *
 * Retry calls `onRetry` when given (and restarts the clock), otherwise
 * reloads the page.
 */
export function SkeletonTimeout({
  children,
  error,
  onRetry,
  page = false,
  message = "Loading report data…",
  limitMs = SKELETON_LIMIT_MS,
}: {
  children: ReactNode
  error?: string | null
  onRetry?: () => void
  /** Full-page skeleton: the loading bar sits in the skeleton's title row. */
  page?: boolean
  message?: string
  limitMs?: number
}) {
  const [stalled, setStalled] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setStalled(false)
    if (page) return
    const timer = setTimeout(() => setStalled(true), limitMs)
    return () => clearTimeout(timer)
  }, [attempt, limitMs, page])

  const retry = () => {
    setAttempt(a => a + 1)
    if (onRetry) onRetry()
    else window.location.reload()
  }
  const notice = (text: string) => (
    <div
      role="status"
      data-testid="skeleton-timeout"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700 dark:text-gray-200"
    >
      <span>{text}</span>
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

  if (!page) {
    return (
      <>
        {(stalled || error) && (
          <div className="px-6 pt-4">{notice(error ? `Couldn't load: ${error}` : "Still loading…")}</div>
        )}
        {children}
      </>
    )
  }
  // Overlay the title row of the page skeleton (page-container, py-8 card, px-6 py-4 header):
  // the bar fills the header to the right of the title, as on /installs.
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-x-0 top-0 pointer-events-none">
        <div className="page-container px-4 sm:px-6 lg:px-8 pt-8">
          <div className="px-6 py-4 flex">
            <div aria-hidden="true" className="hidden sm:block w-72 flex-shrink-0" />
            <div className="pointer-events-auto flex-1 min-w-0 rounded-lg bg-white dark:bg-gray-800 py-1 pl-3">
              {error
                ? notice(`Couldn't load: ${error}`)
                : <LoadingProgress message={message} onRetry={onRetry ? retry : undefined} limitMs={limitMs} resetKey={attempt} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
