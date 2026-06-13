"use client"

import React, { useState } from "react"
import { useSettings } from "../../providers/SettingsProvider"
import {
  SecurityConfig,
  SecurityRule,
  SettingsDocument,
  Severity,
} from "../../lib/settings/types"

const CHECKS = ["encryption", "firewall", "ssh", "rdp", "sip"] as const
const SEVERITIES: Severity[] = ["ok", "warning", "danger", "neutral"]
const STATES = ["any", "enabled", "disabled"] as const

const CHECK_LABELS: Record<string, string> = {
  encryption: "Disk encryption (FileVault / BitLocker)",
  firewall: "Firewall",
  ssh: "Secure Shell (SSH / Remote Login)",
  rdp: "Remote Desktop (RDP)",
  sip: "System Integrity Protection",
}

function SeveritySelect({ value, onChange }: { value: Severity; onChange: (v: Severity) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Severity)}
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

let ruleSeq = 0

export function SecurityRulesEditor({ readOnly = false }: { readOnly?: boolean }) {
  const { settings, securityConfig, inventoryFields, refresh } = useSettings()
  const [config, setConfig] = useState<SecurityConfig>(() => ({
    defaults: { ...securityConfig.defaults },
    rules: securityConfig.rules.map((r) => ({ ...r })),
  }))
  const [status, setStatus] = useState<{ type: "idle" | "saving" | "saved" | "error"; message?: string }>({ type: "idle" })

  const knownUsage = inventoryFields.find((f) => f.key === "usage")?.knownValues ?? []

  const setDefault = (check: string, which: "enabledSeverity" | "disabledSeverity", v: Severity) => {
    setConfig((c) => ({ ...c, defaults: { ...c.defaults, [check]: { ...c.defaults[check], [which]: v } } }))
    setStatus({ type: "idle" })
  }

  const updateRule = (id: string, patch: Partial<SecurityRule>) => {
    setConfig((c) => ({ ...c, rules: c.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    setStatus({ type: "idle" })
  }

  const setRuleUsage = (id: string, csv: string) => {
    const values = csv.split(",").map((s) => s.trim()).filter(Boolean)
    updateRule(id, { when: values.length ? { inventory: { usage: { in: values } } } : undefined })
  }

  const addRule = () => {
    ruleSeq += 1
    const rule: SecurityRule = {
      id: `rule-${Date.now()}-${ruleSeq}`,
      module: "security",
      check: "encryption",
      state: "disabled",
      severity: "neutral",
      enabled: true,
      when: { inventory: { usage: { in: ["Shared"] } } },
    }
    setConfig((c) => ({ ...c, rules: [...c.rules, rule] }))
    setStatus({ type: "idle" })
  }

  const removeRule = (id: string) => {
    setConfig((c) => ({ ...c, rules: c.rules.filter((r) => r.id !== id) }))
    setStatus({ type: "idle" })
  }

  async function save() {
    setStatus({ type: "saving" })
    const doc: SettingsDocument = { ...settings, security: config }
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
      setStatus({ type: "saved", message: "Security rules saved" })
      await refresh()
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Network error" })
    }
  }

  const ruleUsageValues = (r: SecurityRule) => r.when?.inventory?.usage?.in ?? []
  const unknownUsage = (r: SecurityRule) =>
    knownUsage.length > 0 && ruleUsageValues(r).some((v) => !knownUsage.includes(v))

  return (
    <fieldset disabled={readOnly} className="space-y-8 min-w-0 border-0 m-0 p-0">
      {readOnly && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Read-only preview. Sign in as an administrator on a non-demo instance to edit.
        </p>
      )}
      {/* Baseline defaults */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Baseline severities</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          How each check is colored when no rule matches. These reproduce ReportMate&apos;s standard behavior.
        </p>
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Check</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">When enabled</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">When disabled</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {CHECKS.map((check) => (
                <tr key={check}>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{CHECK_LABELS[check]}</td>
                  <td className="px-3 py-2">
                    <SeveritySelect value={config.defaults[check]?.enabledSeverity ?? "ok"} onChange={(v) => setDefault(check, "enabledSeverity", v)} />
                  </td>
                  <td className="px-3 py-2">
                    <SeveritySelect value={config.defaults[check]?.disabledSeverity ?? "danger"} onChange={(v) => setDefault(check, "disabledSeverity", v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Usage-aware rules</h3>
          <button onClick={addRule}
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            + Add rule
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Override the baseline for devices matching a usage. Example: encryption disabled on
          <span className="font-mono"> Shared</span>/<span className="font-mono">Lab</span> devices → neutral instead of red.
          When multiple rules match, the most specific wins (ties broken by the last rule).
        </p>

        {config.rules.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No rules yet. The baselines above apply to every device.</p>
        )}

        <div className="space-y-3">
          {config.rules.map((r) => (
            <div key={r.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={r.enabled !== false} onChange={(e) => updateRule(r.id, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                On
              </label>

              <select value={r.check} onChange={(e) => updateRule(r.id, { check: e.target.value })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {CHECKS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={r.state ?? "any"} onChange={(e) => updateRule(r.id, { state: e.target.value as SecurityRule["state"] })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <span className="text-sm text-gray-500 dark:text-gray-400">when usage in</span>
              <input value={ruleUsageValues(r).join(", ")} onChange={(e) => setRuleUsage(r.id, e.target.value)}
                placeholder="Shared, Lab"
                className="w-44 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />

              <span className="text-sm text-gray-500 dark:text-gray-400">→</span>
              <SeveritySelect value={r.severity} onChange={(v) => updateRule(r.id, { severity: v })} />

              <button onClick={() => removeRule(r.id)}
                className="ml-auto text-sm text-red-600 hover:text-red-800 dark:text-red-400">Remove</button>

              {unknownUsage(r) && (
                <p className="w-full text-xs text-amber-600 dark:text-amber-400">
                  Warning: references a usage value not seen in the fleet&apos;s known values ({knownUsage.join(", ") || "none discovered"}).
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={status.type === "saving"}
          className={`px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${status.type === "saving" ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
          {status.type === "saving" ? "Saving..." : "Save Rules"}
        </button>
        {status.type === "saved" && <span className="text-sm text-green-600 dark:text-green-400">{status.message}</span>}
        {status.type === "error" && <span className="text-sm text-red-600 dark:text-red-400">{status.message}</span>}
      </div>
    </fieldset>
  )
}

export default SecurityRulesEditor
