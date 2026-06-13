"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSettings } from "../../providers/SettingsProvider"
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_INVENTORY_FIELDS,
  DEFAULT_SECURITY_CONFIG,
  STARTER_SECURITY_RULES,
} from "../../lib/settings/defaults"
import {
  DiscoveredInventoryKey,
  InventoryFieldMapping,
  SettingsDocument,
} from "../../lib/settings/types"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/** First-run setup: discover the fleet's inventory keys, confirm the mapping,
 * seed sensible security rules, then persist the org settings document. */
export function OnboardingWizard() {
  const router = useRouter()
  const { settings, refresh } = useSettings()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [discovered, setDiscovered] = useState<DiscoveredInventoryKey[] | null>(null)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [fields, setFields] = useState<InventoryFieldMapping[]>(DEFAULT_INVENTORY_FIELDS)
  const [seedStarter, setSeedStarter] = useState(true)
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "error"; message?: string }>({ type: "idle" })

  // Discover on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/settings/inventory/discover", { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setDiscoverError(data.error || data.detail || "Discovery failed")
          return
        }
        const keys: DiscoveredInventoryKey[] = data.keys || []
        setDiscovered(keys)
        // Auto-suggest mapping: match each canonical field to a discovered key
        // by normalized name; seed usage known values from samples.
        setFields(
          DEFAULT_INVENTORY_FIELDS.map((f) => {
            const match = keys.find((k) => norm(k.key) === norm(f.sourceKey) || norm(k.key) === norm(f.key))
            return match
              ? { ...f, sourceKey: match.key, knownValues: f.key === "usage" ? match.sampleValues : f.knownValues }
              : f
          })
        )
      } catch (err) {
        if (!cancelled) setDiscoverError(err instanceof Error ? err.message : "Network error")
      }
    })()
    return () => { cancelled = true }
  }, [])

  const detectedCount = discovered?.length ?? 0
  const usageValues = useMemo(
    () => fields.find((f) => f.key === "usage")?.knownValues ?? [],
    [fields]
  )

  const updateField = (key: string, patch: Partial<InventoryFieldMapping>) =>
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))

  async function finish() {
    setStatus({ type: "saving" })
    const doc: SettingsDocument = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      general: { ...settings.general, onboardingCompletedAt: new Date().toISOString() },
      inventory: { fields: fields.map((f, i) => ({ ...f, order: i })) },
      security: {
        defaults: { ...DEFAULT_SECURITY_CONFIG.defaults, ...(settings.security?.defaults ?? {}) },
        rules: seedStarter ? [...STARTER_SECURITY_RULES] : (settings.security?.rules ?? []),
      },
    }
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
      await refresh()
      router.push("/settings")
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Network error" })
    }
  }

  const StepBadge = ({ n, label }: { n: number; label: string }) => (
    <div className={`flex items-center gap-2 ${step === n ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === n ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>{n + 1}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Set up ReportMate</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        A one-time setup to map your inventory fields and seed sensible security rules.
      </p>

      <div className="flex items-center gap-6 mb-8">
        <StepBadge n={0} label="Discover" />
        <StepBadge n={1} label="Map fields" />
        <StepBadge n={2} label="Security rules" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Discovering inventory keys</h2>
            {discoverError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {discoverError}. You can still continue with the default mapping.
              </p>
            )}
            {!discovered && !discoverError && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Scanning the fleet&apos;s inventory data…</p>
            )}
            {discovered && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Found <strong>{detectedCount}</strong> inventory key{detectedCount === 1 ? "" : "s"} across your devices.
                </p>
                <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Key</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Devices</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Sample values</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {discovered.map((k) => (
                        <tr key={k.key}>
                          <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{k.key}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{k.deviceCount}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-xs">{k.sampleValues.slice(0, 6).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <button onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Next</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Confirm field mapping</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Adjust the source key or hide fields you don&apos;t use.</p>
            <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Source key</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Visible</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {fields.map((f) => (
                    <tr key={f.key}>
                      <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{f.key}</td>
                      <td className="px-3 py-2">
                        <input value={f.sourceKey} onChange={(e) => updateField(f.key, { sourceKey: e.target.value })}
                          className="w-40 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={f.visible} onChange={(e) => updateField(f.key, { visible: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Back</button>
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Seed security rules</h2>
            <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded">
              <input type="checkbox" checked={seedStarter} onChange={(e) => setSeedStarter(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Don&apos;t flag disk encryption as a problem on <span className="font-mono">Shared</span> or
                <span className="font-mono"> Lab</span> devices (they&apos;re typically not encrypted).
                {usageValues.length > 0 && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Detected usage values: {usageValues.join(", ")}
                  </span>
                )}
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">You can fine-tune all rules later under Settings → Security Rules.</p>
            {status.type === "error" && <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>}
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Back</button>
              <button onClick={finish} disabled={status.type === "saving"}
                className={`px-4 py-2 text-sm font-medium rounded-md text-white ${status.type === "saving" ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                {status.type === "saving" ? "Saving…" : "Finish setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OnboardingWizard
