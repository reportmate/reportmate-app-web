"use client"

import Link from "next/link"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import {
  PROFILE_COLUMNS, inventoryLabel, scopeLabel, stateLabel,
  type ProfileColumn, type ProfileKind, type ProfileRow, type ProfilesView,
} from "../../lib/management/profiles"

function When({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-gray-500 dark:text-gray-400">Unknown</span>
  const parsed = Date.parse(value.replace(/ \+0000$/, "Z").replace(" ", "T"))
  if (!Number.isFinite(parsed)) return <span className="font-mono text-xs">{value}</span>
  const iso = new Date(parsed).toISOString()
  return <time dateTime={iso} title={formatExactTime(iso)}>{formatRelativeTime(iso)}</time>
}

function Badge({ row }: { row: ProfileRow }) {
  const color = row.state === "installed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : row.state === "missing" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{stateLabel(row.state)}</span>
}

const muted = "text-xs text-gray-500 dark:text-gray-400"

function Cell({ row, column, kind }: { row: ProfileRow; column: ProfileColumn; kind: ProfileKind }) {
  switch (column) {
    case "deviceName": return <>
      <Link href={`/device/${encodeURIComponent(row.serialNumber)}#management`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{row.deviceName || row.serialNumber}</Link>
      <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{row.serialNumber}</div>
      <div className={`${muted} mt-1`}>{[row.assetTag, row.platform].filter(Boolean).join(" ")}</div>
    </>
    case "state": return <>
      <Badge row={row} />
      {row.state === "unknown" && <div className={`${muted} mt-1`}>{row.inventoryCount === 0 ? "No management inventory reported" : "Collection older than maximum age"}</div>}
    </>
    case "name": return <>
      <div className="font-medium break-words">{row.name}</div>
      {row.identifier !== row.name && <div className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all mt-1">{row.identifier}</div>}
      {row.organization && <div className={`${muted} mt-1`}>{row.organization}</div>}
      {kind === "preference" && row.values && <div className="mt-1 space-y-0.5">{row.values.length === 0
        ? <div className={muted}>Key not set in this domain</div>
        : row.values.map((v, i) => <div key={i} className="text-xs"><span className="text-gray-500 dark:text-gray-400">{v.scope || "Unknown scope"}:</span> <span className="font-mono break-all">{v.value ?? ""}</span></div>)}</div>}
    </>
    case "scope": return row.scope ? <>{scopeLabel(row.scope)}{row.user && <div className={`${muted} mt-1`}>{row.user}</div>}</> : <span className="text-gray-500 dark:text-gray-400">Not applicable</span>
    case "version": return kind === "preference"
      ? <>{row.settingCount ?? <span className="text-gray-500 dark:text-gray-400">Unknown</span>}<div className={muted}>settings</div></>
      : <>{row.version || <span className="text-gray-500 dark:text-gray-400">Not reported</span>}
          {row.uuid && <div className="font-mono text-xs text-gray-500 dark:text-gray-400 break-all mt-1" title="Profile UUID">{row.uuid}</div>}
          {row.verificationState && <div className={`${muted} mt-1`}>{row.verificationState}</div>}</>
    case "installDate": return row.state === "installed" && kind === "profile" ? <When value={row.installDate} /> : <span className="text-gray-500 dark:text-gray-400">{kind === "preference" ? "Not reported" : "Not applicable"}</span>
    case "inventoryState": return <><div>{inventoryLabel(row.inventoryState)}</div>{row.archived && <div className={`${muted} mt-1`}>Archived in ReportMate</div>}<div className={`${muted} mt-1`}>{[row.catalog, row.usage, row.room].filter(Boolean).join(" · ")}</div></>
    case "collectedAt": return <><When value={row.collectedAt} /><div className={`text-xs mt-1 ${row.freshness === "fresh" ? "text-gray-500 dark:text-gray-400" : "text-amber-700 dark:text-amber-300"}`}>{row.freshness === "fresh" ? "Within maximum age" : row.freshness === "stale" ? "Older than maximum age" : "Collection age unknown"}</div></>
  }
}

export function ProfilesTable({ rows, kind, view, onSort, pending }: {
  rows: ProfileRow[]; kind: ProfileKind; view: ProfilesView; onSort: (column: ProfileColumn) => void; pending: boolean
}) {
  const label = (key: ProfileColumn, fallback: string) => kind === "preference"
    ? key === "name" ? "Domain" : key === "version" ? "Settings" : fallback
    : fallback
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10"><tr>{PROFILE_COLUMNS.map(([key, text]) => {
      const active = view.sort === key
      return <th key={key} scope="col" aria-sort={active ? (view.direction === "asc" ? "ascending" : "descending") : "none"}
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
        <button type="button" onClick={() => onSort(key)} disabled={pending} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white">
          {label(key, text)}<span aria-hidden="true">{active ? view.direction === "asc" ? "↑" : "↓" : "↕"}</span>
        </button>
      </th>
    })}</tr></thead>
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
      {rows.length === 0 && <tr><td colSpan={PROFILE_COLUMNS.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No devices match these filters.</td></tr>}
      {rows.map((row, index) => <tr key={`${row.serialNumber}-${row.identifier}-${index}`} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
        {PROFILE_COLUMNS.map(([key]) => <td key={key} className={`px-4 py-3 ${key === "name" ? "min-w-[240px] max-w-md" : key === "deviceName" ? "min-w-[190px]" : key === "version" ? "max-w-[220px]" : "whitespace-nowrap"}`}>
          <Cell row={row} column={key} kind={kind} />
        </td>)}
      </tr>)}
    </tbody>
  </table></div>
}
