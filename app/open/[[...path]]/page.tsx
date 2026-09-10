"use client"

// Hands a link off to the native ReportMate app when it is installed and
// falls back to the same page on the web when it is not.
//
//   https://<this host>/open/device/ABC123?filter=errors#installs
//
// tries reportmate://device/ABC123?filter=errors#installs, and if nothing
// takes the page away within a moment, navigates to /device/ABC123?...#installs.
// The app links are the web routes with the scheme swapped, so the tail of
// the URL is passed through untouched. No host is baked in anywhere: the
// native apps build these links from the web URL they are configured with.

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

const APP_SCHEME = 'reportmate'
const FALLBACK_DELAY_MS = 1200

export default function OpenInAppPage() {
  const pathname = usePathname()
  const [state, setState] = useState<'trying' | 'fallback'>('trying')

  const target = useMemo(() => {
    if (typeof window === 'undefined') return '/dashboard'
    const rest = pathname.replace(/^\/open\/?/, '')
    const path = rest ? `/${rest}` : '/dashboard'
    return `${path}${window.location.search}${window.location.hash}`
  }, [pathname])

  const appUrl = `${APP_SCHEME}://${target.replace(/^\//, '')}`

  useEffect(() => {
    let cancelled = false
    let left = false
    const onHide = () => { if (document.visibilityState === 'hidden') left = true }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', () => { left = true })

    // A hidden frame asks the OS to open the scheme without leaving the page;
    // browsers without a handler simply do nothing.
    const frame = document.createElement('iframe')
    frame.style.display = 'none'
    frame.src = appUrl
    document.body.appendChild(frame)

    const timer = window.setTimeout(() => {
      if (cancelled) return
      if (left) { setState('fallback'); return }
      window.location.replace(target)
    }, FALLBACK_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onHide)
      frame.remove()
    }
  }, [appUrl, target])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {state === 'trying' ? 'Opening in ReportMate…' : 'Opened in the ReportMate app'}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {state === 'trying'
            ? 'If the app is not installed, this page will continue in the browser.'
            : 'You can close this tab, or continue in the browser below.'}
        </p>
        <div className="flex flex-col gap-2">
          <a href={target} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            Continue in the browser
          </a>
          <a href={appUrl} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium">
            Open in the app
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 break-all">{target}</p>
      </div>
    </div>
  )
}
