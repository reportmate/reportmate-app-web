"use client"

import { useState, type ReactNode } from "react"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import { shareableUrl } from "../../lib/security/vulnerabilities"

export const actionButton = "px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap font-medium flex items-center gap-2 disabled:opacity-50"
export const secondaryAction = `${actionButton} bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white`
export const primaryAction = `${actionButton} bg-emerald-600 hover:bg-emerald-700 text-white`

export function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled}
    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${active
      ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700"
      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"}`}>{children}</button>
}

export function Choices({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label}><h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">{label}</h3><div className="flex flex-wrap gap-2">{children}</div></div>
}

export function When({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <span className="text-gray-400">Unknown</span>
  return <time dateTime={value} title={formatExactTime(value)}>{formatRelativeTime(value)}</time>
}

export function NotReported({ children = "Not reported" }: { children?: ReactNode }) {
  return <span className="text-gray-400 dark:text-gray-500">{children}</span>
}

export function SortHeader({ label, column, sort, dir, onSort, disabled }: {
  label: string; column: string; sort: string; dir: "asc" | "desc"; onSort: (column: string) => void; disabled?: boolean
}) {
  const active = sort === column
  return <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
    <button type="button" onClick={() => onSort(column)} disabled={disabled} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white">
      {label}<span aria-hidden="true">{active ? dir === "asc" ? "↑" : "↓" : "↕"}</span>
    </button>
  </th>
}

export function CopyLinkButton({ platformFilter, onError }: { platformFilter: string; onError: (message: string) => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl(window.location.href, platformFilter))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { onError("Could not copy the link. Copy this page's address instead.") }
  }
  return <button type="button" onClick={copy} title="Copy a shareable link to this exact report" className={copied ? primaryAction : secondaryAction}>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={copied ? "M5 13l4 4L19 7" : "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"} /></svg>
    {copied ? "Link Copied" : "Copy Link"}
  </button>
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={loading} className={secondaryAction}>
    <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    Refresh
  </button>
}

export function ExportButton({ onClick, detail }: { onClick: () => void; detail: string }) {
  return <div className="flex flex-col items-start gap-1 max-w-xs">
    <button type="button" onClick={onClick} title={detail} className={primaryAction}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      Export CSV
    </button>
    <p className="text-xs text-gray-500 dark:text-gray-400">{detail}</p>
  </div>
}
