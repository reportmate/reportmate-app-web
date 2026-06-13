"use client"

import React, { useState } from "react"
import { useSettings } from "../../providers/SettingsProvider"
import { InventoryFieldMapping, SettingsDocument } from "../../lib/settings/types"

/** Editable table for how raw inventory keys map to ReportMate's canonical
 * fields (label, source key, order, visibility, known values). Saves the full
 * settings document via the admin-gated PUT proxy. */
export function InventoryMappingEditor() {
  const { settings, inventoryFields, refresh } = useSettings()
  const [fields, setFields] = useState<InventoryFieldMapping[]>(() =>
    [...inventoryFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  )
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "saved" | "error"; message?: string }>({ type: "idle" })

  const update = (key: string, patch: Partial<InventoryFieldMapping>) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
    setStatus({ type: "idle" })
  }

  const move = (index: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((f, i) => ({ ...f, order: i }))
    })
    setStatus({ type: "idle" })
  }

  async function save() {
    setStatus({ type: "saving" })
    const doc: SettingsDocument = {
      ...settings,
      inventory: { fields: fields.map((f, i) => ({ ...f, order: i })) },
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
      setStatus({ type: "saved", message: "Inventory mapping saved" })
      await refresh()
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Network error" })
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Map the keys from each device&apos;s <code className="font-mono text-sm">Inventory.yaml</code> to
        ReportMate&apos;s fields. Adjust the label, source key, order, and visibility. Known values for
        <span className="font-mono"> usage</span> drive the security rules below.
      </p>

      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Order</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Source key</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Label</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Known values</th>
              <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Visible</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {fields.map((f, i) => (
              <tr key={f.key}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="px-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30" aria-label="Move up">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === fields.length - 1}
                      className="px-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30" aria-label="Move down">↓</button>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{f.key}</td>
                <td className="px-3 py-2">
                  <input value={f.sourceKey} onChange={(e) => update(f.key, { sourceKey: e.target.value })}
                    className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono" />
                </td>
                <td className="px-3 py-2">
                  <input value={f.label} onChange={(e) => update(f.key, { label: e.target.value })}
                    className="w-36 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </td>
                <td className="px-3 py-2">
                  <input value={(f.knownValues || []).join(", ")}
                    onChange={(e) => update(f.key, { knownValues: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="e.g. Assigned, Shared, Lab"
                    className="w-56 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={f.visible} onChange={(e) => update(f.key, { visible: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={status.type === "saving"}
          className={`px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${status.type === "saving" ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
          {status.type === "saving" ? "Saving..." : "Save Mapping"}
        </button>
        {status.type === "saved" && <span className="text-sm text-green-600 dark:text-green-400">{status.message}</span>}
        {status.type === "error" && <span className="text-sm text-red-600 dark:text-red-400">{status.message}</span>}
      </div>
    </div>
  )
}

export default InventoryMappingEditor
