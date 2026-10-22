"use client"

import { useEffect, useState } from "react"
import { SKELETON_LIMIT_MS, useLoadProgress } from "../../lib/data-cache"

/**
 * A thin bar along the bottom edge of the toolbar while report data loads.
 * First loads fill it determinately (sources loaded of total); a background
 * refresh of data already on screen shows a faint indeterminate sweep, the
 * page's subtle "updating" state.
 */
export function LoadProgressBar() {
  const { total, done, background, startedAt } = useLoadProgress()
  const busy = total > 0 && done < total
  // A first load that runs past the skeleton limit says so and offers Retry
  const [stalled, setStalled] = useState(false)
  useEffect(() => {
    setStalled(false)
    if (!busy || background) return
    const wait = Math.max(0, startedAt + SKELETON_LIMIT_MS - Date.now())
    const timer = setTimeout(() => setStalled(true), wait)
    return () => clearTimeout(timer)
  }, [busy, background, startedAt])
  if (!busy) return null
  const label = background ? "Updating" : `Loading ${done} of ${total}`
  return (
    <>
    {!background && !stalled && (
      <span className="absolute right-4 top-full mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 pointer-events-none">
        {label}
      </span>
    )}
    {!background && stalled && (
      <span className="absolute right-4 top-full mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800">
        Still loading… ({done} of {total}) ·{" "}
        <button type="button" onClick={() => window.location.reload()} className="underline underline-offset-2 hover:no-underline">
          Retry
        </button>
      </span>
    )}
    <div
      className="absolute left-0 right-0 bottom-0 h-0.5 overflow-hidden pointer-events-none"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={background ? undefined : done}
      title={label}
      data-testid="load-progress"
    >
      {background ? (
        <div
          className="h-full w-1/3 bg-blue-500/40 dark:bg-blue-400/40"
          style={{ animation: "rm-progress-sweep 1.2s ease-in-out infinite" }}
        />
      ) : (
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(8, (done / total) * 100)}%` }}
        />
      )}
    </div>
    </>
  )
}
