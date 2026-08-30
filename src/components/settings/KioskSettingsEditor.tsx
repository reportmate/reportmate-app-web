"use client"

/**
 * Kiosk display preferences: the page a wall display opens on and returns to,
 * its zoom, how long it may sit idle on another page, and its theme. Saved on
 * the shared settings document; applied only to kiosk (viewer) sessions.
 */

import React, { useEffect, useState } from "react"
import { useSettings } from "../../providers/SettingsProvider"
import { DEFAULT_KIOSK_SETTINGS } from "../../lib/settings/defaults"
import { safeKioskPath } from "../../lib/kiosk/role"
import type { KioskSettings, SettingsDocument } from "../../lib/settings/types"

const HOME_PAGES: Array<{ path: string; label: string }> = [
  { path: "/events", label: "Events" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/devices", label: "Devices" },
  { path: "/installs", label: "Installs" },
  { path: "/applications", label: "Applications" },
  { path: "/hardware", label: "Hardware" },
  { path: "/network", label: "Network" },
  { path: "/security", label: "Security" },
  { path: "/management", label: "Management" },
  { path: "/inventory", label: "Inventory" },
  { path: "/identity", label: "Identity" },
  { path: "/peripherals", label: "Peripherals" },
  { path: "/system", label: "System" },
]

const ZOOM_STEPS = [1, 1.1, 1.25, 1.5, 1.75, 2]

type Status = { type: "idle" | "saving" | "saved" | "error"; message?: string }

const input = "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-60"
const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
const hint = "mt-1 text-xs text-gray-500 dark:text-gray-400"

export function KioskSettingsEditor({ readOnly = false }: { readOnly?: boolean }) {
  const { settings, refresh } = useSettings()
  const [kiosk, setKiosk] = useState<KioskSettings>({ ...DEFAULT_KIOSK_SETTINGS, ...(settings.kiosk ?? {}) })
  const [status, setStatus] = useState<Status>({ type: "idle" })

  useEffect(() => {
    setKiosk({ ...DEFAULT_KIOSK_SETTINGS, ...(settings.kiosk ?? {}) })
  }, [settings.kiosk])

  const update = (patch: Partial<KioskSettings>) => {
    setKiosk(k => ({ ...k, ...patch }))
    setStatus({ type: "idle" })
  }

  async function save() {
    setStatus({ type: "saving" })
    const doc: SettingsDocument = { ...settings, kiosk: { ...kiosk, homePath: safeKioskPath(kiosk.homePath) } }
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: "error", message: data.error || data.detail || "Save failed" })
        return
      }
      setStatus({ type: "saved", message: "Kiosk settings saved; displays pick them up on their next page load" })
      await refresh()
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Network error" })
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        These apply only to kiosk sessions, the read-only sessions a wall display opens through its kiosk token. Signed-in people are not affected.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={label} htmlFor="kiosk-home">Home page</label>
          <select id="kiosk-home" className={input} value={kiosk.homePath} disabled={readOnly}
            onChange={e => update({ homePath: e.target.value })}>
            {HOME_PAGES.map(p => <option key={p.path} value={p.path}>{p.label}</option>)}
          </select>
          <p className={hint}>The page a display opens on and returns to.</p>
        </div>

        <div>
          <label className={label} htmlFor="kiosk-zoom">Zoom</label>
          <select id="kiosk-zoom" className={input} value={String(kiosk.zoom)} disabled={readOnly}
            onChange={e => update({ zoom: Number(e.target.value) })}>
            {(ZOOM_STEPS.includes(kiosk.zoom) ? ZOOM_STEPS : [...ZOOM_STEPS, kiosk.zoom].sort((a, b) => a - b)).map(z => (
              <option key={z} value={String(z)}>{Math.round(z * 100)}%</option>
            ))}
          </select>
          <p className={hint}>Page scale on the display.</p>
        </div>

        <div>
          <label className={label} htmlFor="kiosk-idle">Return home after</label>
          <div className="flex items-center gap-2">
            <input id="kiosk-idle" type="number" min={0} max={1440} step={1} className={input} value={kiosk.idleMinutes} disabled={readOnly}
              onChange={e => update({ idleMinutes: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">minutes idle</span>
          </div>
          <p className={hint}>Anyone may browse away on the display; with no input for this long it goes back home. 0 never returns.</p>
        </div>

        <div>
          <label className={label} htmlFor="kiosk-theme">Theme</label>
          <select id="kiosk-theme" className={input} value={kiosk.theme} disabled={readOnly}
            onChange={e => update({ theme: e.target.value as KioskSettings["theme"] })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Follow system</option>
          </select>
          <p className={hint}>Theme the display renders in.</p>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={status.type === "saving"}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60">
            {status.type === "saving" ? "Saving…" : "Save kiosk settings"}
          </button>
          {status.message && (
            <span className={`text-sm ${status.type === "error" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
              {status.message}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
