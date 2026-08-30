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
import { KIOSK_ROLE } from '../lib/kiosk/role'
import { useSettingsOptional } from '../providers/SettingsProvider'
import { DEFAULT_KIOSK_SETTINGS } from '../lib/settings/defaults'
import { useTheme } from './theme-provider'

const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

export function KioskBehaviour() {
  const { data: session } = useSession()
  const settings = useSettingsOptional()
  const { setTheme } = useTheme()
  const isKiosk = (session as { role?: string } | null)?.role === KIOSK_ROLE
  const kiosk = { ...DEFAULT_KIOSK_SETTINGS, ...(settings?.settings.kiosk ?? {}) }
  const { homePath, zoom, idleMinutes, theme } = kiosk

  useEffect(() => {
    if (!isKiosk) return
    document.documentElement.style.setProperty('zoom', String(zoom))
    return () => { document.documentElement.style.removeProperty('zoom') }
  }, [isKiosk, zoom])

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
