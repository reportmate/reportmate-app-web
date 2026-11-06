"use client"

import { useEffect, useState } from "react"
import { SKELETON_LIMIT_MS } from "../../lib/data-cache"

/**
 * Percent (0-99.9) that creeps forward while `active`: quickly to 85, slower
 * to 95, then asymptotically, so a long request never looks frozen. It never
 * reaches 100; the caller removes the bar when the data arrives.
 */
export function useCreepingProgress(active: boolean, resetKey?: unknown): number {
  const [percent, setPercent] = useState(0)
  useEffect(() => {
    setPercent(0)
    if (!active) return
    let value = 0
    let slowdown = 0
    const timer = setInterval(() => {
      if (value < 85) value += 2.5
      else if (value < 95) value += 0.5
      else value += Math.max(0.1, 5 / (++slowdown + 10))
      value = Math.min(value, 99.9)
      setPercent(value)
    }, 200)
    return () => clearInterval(timer)
  }, [active, resetKey])
  return percent
}

/**
 * The inline loading bar shown where report content loads: a message, an
 * optional count, an emerald bar and a percentage. With `current`/`total`
 * the bar is exact; without them it creeps (see `useCreepingProgress`).
 *
 * After the skeleton limit it says "Still loading…" and offers Retry, in
 * place, so the page frame stays on screen.
 */
export function LoadingProgress({
  message,
  current,
  total,
  detail,
  onRetry,
  resetKey,
  limitMs = SKELETON_LIMIT_MS,
  className = "",
}: {
  message: string
  current?: number
  total?: number
  /** Count text beside the message; defaults to `current/total` when both are given. */
  detail?: string
  /** Retry after the limit; reloads the page when omitted. */
  onRetry?: () => void
  /** Changing it restarts the bar and the limit clock. */
  resetKey?: unknown
  limitMs?: number
  className?: string
}) {
  const determinate = typeof total === "number" && total > 0 && typeof current === "number"
  const creeping = useCreepingProgress(!determinate, resetKey)
  const percent = determinate ? Math.min(100, (current! / total!) * 100) : creeping
  const [stalled, setStalled] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setStalled(false)
    const timer = setTimeout(() => setStalled(true), limitMs)
    return () => clearTimeout(timer)
  }, [limitMs, resetKey, attempt])

  const count = detail ?? (determinate ? `${current!.toLocaleString()}/${total!.toLocaleString()}` : "")
  const retry = () => {
    setAttempt(a => a + 1)
    if (onRetry) onRetry()
    else window.location.reload()
  }
  return (
    <div role="status" data-testid="loading-progress" className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
              {stalled ? "Still loading…" : message}
            </p>
            {count && <p className="text-xs text-gray-500 dark:text-gray-500 ml-2 flex-shrink-0 tabular-nums">{count}</p>}
          </div>
          <div
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
            role="progressbar"
            aria-label={message}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
          >
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">{Math.round(percent)}%</span>
        {stalled && (
          <button
            type="button"
            onClick={retry}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:no-underline flex-shrink-0"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

/** Rows or devices fetched so far of the report's total, from paged loads. */
export interface LoadCount {
  loaded: number
  total: number
  unit: string
}

/** A report body's loading state: the inline bar, centred where the table will be. */
export function ReportLoading({ message, count, resetKey, onRetry }: {
  message: string
  count?: LoadCount | null
  resetKey?: unknown
  onRetry?: () => void
}) {
  return (
    <div className="px-6 py-10 flex justify-center">
      <LoadingProgress
        className="w-full max-w-xl"
        message={message}
        current={count?.loaded}
        total={count?.total}
        detail={count ? `${count.loaded.toLocaleString()} of ${count.total.toLocaleString()} ${count.unit}` : undefined}
        resetKey={resetKey}
        onRetry={onRetry}
      />
    </div>
  )
}
