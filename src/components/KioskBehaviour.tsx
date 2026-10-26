'use client'

/**
 * Applies the kiosk display preferences from Settings to a kiosk (viewer)
 * session: page zoom, theme, and the return to the home page after a stretch
 * without input. Anyone may browse away on a display; the return is a full
 * navigation, so it also passes the middleware, which renews the kiosk session
 * from its pinned cookie. Signed-in people never see any of this.
 */

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { KIOSK_ROLE, safeKioskPath } from '../lib/kiosk/role'
import { useSettingsOptional } from '../providers/SettingsProvider'
import { DEFAULT_KIOSK_SETTINGS } from '../lib/settings/defaults'
import { useTheme } from './theme-provider'
import { fitDashboardZoom, KIOSK_ZOOM_EVENT } from '../lib/kiosk/display'

const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

export function KioskBehaviour() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const settings = useSettingsOptional()
  const { setTheme } = useTheme()
  const isKiosk = (session as { role?: string } | null)?.role === KIOSK_ROLE
  const kiosk = { ...DEFAULT_KIOSK_SETTINGS, ...(settings?.settings.kiosk ?? {}) }
  const { zoom, fitDashboard, idleMinutes, theme } = kiosk
  const homePath = safeKioskPath(kiosk.homePath)

  useEffect(() => {
    if (!isKiosk) return
    const initialZoom = fitDashboard && pathname === '/dashboard'
      ? fitDashboardZoom(window.innerWidth, zoom)
      : zoom
    document.documentElement.style.setProperty('zoom', String(initialZoom))
    document.documentElement.dataset.kioskZoom = String(initialZoom)
    window.dispatchEvent(new Event(KIOSK_ZOOM_EVENT))
    // Set the initial fit only: browser zoom remains under the user's control.
    return () => {
      document.documentElement.style.removeProperty('zoom')
      delete document.documentElement.dataset.kioskZoom
      window.dispatchEvent(new Event(KIOSK_ZOOM_EVENT))
    }
  }, [isKiosk, zoom, fitDashboard, pathname])

  useEffect(() => {
    if (!isKiosk) return
    setTheme(theme)
  }, [isKiosk, theme, setTheme])

  useEffect(() => {
    if (!isKiosk || idleMinutes <= 0) return
    const idleMs = idleMinutes * 60 * 1000
    let timer: ReturnType<typeof setTimeout> | undefined
    const goHome = () => {
      const here = window.location.pathname + window.location.search + window.location.hash
      if (here !== homePath) window.location.assign(homePath)
    }
    const arm = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(goHome, idleMs)
    }
    ACTIVITY.forEach(name => window.addEventListener(name, arm, { passive: true }))
    arm()
    return () => {
      if (timer) clearTimeout(timer)
      ACTIVITY.forEach(name => window.removeEventListener(name, arm))
    }
  }, [isKiosk, homePath, idleMinutes])

  return null
}
