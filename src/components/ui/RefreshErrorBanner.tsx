"use client"

/**
 * Shown when a background refresh fails while the last good data stays on
 * screen: "Couldn't refresh · Retry", with when the data was last updated.
 * The page's full error state is only for when there is no data yet.
 */
export function RefreshErrorBanner({
  error,
  updatedAt,
  onRetry,
  retrying = false,
  className = "",
}: {
  error?: string | null
  /** Epoch ms or a Date of the data on screen. */
  updatedAt?: number | Date | null
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  if (!error) return null
  const at = updatedAt ? new Date(updatedAt) : null
  const time = at && !isNaN(at.getTime())
    ? at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null
  return (
    <div
      role="status"
      title={error}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200 ${className}`}
    >
      <span className="font-medium">Couldn&apos;t refresh</span>
      {onRetry && (
        <>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </>
      )}
      {time && (
        <span className="text-amber-700/80 dark:text-amber-300/80">· Last updated {time}</span>
      )}
    </div>
  )
}
