"use client"

import { useLoadProgress } from "../../lib/data-cache"

/**
 * A thin bar along the bottom edge of the toolbar while report data loads.
 * First loads fill it determinately (sources loaded of total); a background
 * refresh of data already on screen shows a faint indeterminate sweep, the
 * page's subtle "updating" state.
 *
 * The bar carries no text: each page shows its own inline loading state
 * (LoadingProgress) where the content loads, including the ten-second
 * "Still loading… · Retry" notice.
 */
export function LoadProgressBar() {
  const { total, done, background } = useLoadProgress()
  const busy = total > 0 && done < total
  if (!busy) return null
  const label = background ? "Updating" : `Loading ${done} of ${total}`
  return (
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
  )
}
