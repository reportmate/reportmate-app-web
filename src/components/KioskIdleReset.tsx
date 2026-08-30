'use client'

/**
 * A wall display always comes back to the events feed. Anyone may browse away
 * on a kiosk session; after a stretch with no input the page navigates back to
 * /events. The navigation is a full load, so it also passes the middleware,
 * which renews the kiosk session from its pinned cookie.
 */

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { KIOSK_ROLE } from '../lib/kiosk/role'

const IDLE_MS = 5 * 60 * 1000
const HOME = '/events'
const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

export function KioskIdleReset() {
  const { data: session } = useSession()
  const isKiosk = (session as { role?: string } | null)?.role === KIOSK_ROLE

  useEffect(() => {
    if (!isKiosk) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const goHome = () => {
      const here = window.location.pathname + window.location.search + window.location.hash
      if (here !== HOME) window.location.assign(HOME)
    }
    const arm = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(goHome, IDLE_MS)
    }
    ACTIVITY.forEach(name => window.addEventListener(name, arm, { passive: true }))
    arm()
    return () => {
      if (timer) clearTimeout(timer)
      ACTIVITY.forEach(name => window.removeEventListener(name, arm))
    }
  }, [isKiosk])

  return null
}
