"use client"

import Link from "next/link"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import { cveHref } from "../../lib/security/safeUrl"
import { inventoryLabel } from "../../lib/system/services"
import {
  UPDATE_COLUMNS, updateFlags, updateRowKey, updateSearchLabel, updateStateLabel,
  type UpdateColumn, type UpdateRow, type UpdatesView,
} from "../../lib/system/updates"

function When({ value }: { value: string | null }) {
  return value ? <time dateTime={value} title={formatExactTime(value)}>{formatRelativeTime(value)}</time> : <span className="text-gray-400">Not reported</span>
}

function Badge({ state }: { state: UpdateRow["state"] }) {
  const color = state === "installed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : state === "none" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
    : state === "pending" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
    : state === "not_reported" || state === "search_failed" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${color}`}>{updateStateLabel(state)}</span>
}

function Cell({ row, column }: { row: UpdateRow; column: UpdateColumn }) {
  switch (column) {
    case "deviceName": return <>
        <Link href={`/device/${encodeURIComponent(row.serialNumber)}?tab=system`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{row.deviceName}</Link>
        {row.hostname && row.hostname !== row.deviceName && <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">{row.hostname}</div>}
        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{row.serialNumber}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{[row.assetTag, row.platform, row.osVersion].filter(Boolean).join(" ")}</div>
      </>
    case "state": return <><Badge state={row.state} />
        {row.state === "unknown" && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {!row.collectionValid ? "No valid update collection"
            : row.reportedState === "none" && row.updateSearch?.status !== "succeeded" ? "Empty list, but the update search was not reported"
            : row.reportedState === "none" && row.updateSearch?.freshness !== "fresh" ? "Empty list from an update search older than maximum age"
            : `Last reported: ${updateStateLabel(row.reportedState)}`}
        </div>}
        {row.state === "search_failed" && row.updateSearch?.error && <div className="text-xs text-red-700 dark:text-red-300 mt-1 max-w-xs whitespace-normal break-words">{row.updateSearch.error}</div>}
      </>
    case "title": return row.updateKey ? <>
        <div className="font-medium">{row.title || row.kb}</div>
        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{[row.kb, row.productKey, row.buildVersion].filter(Boolean).join(" · ")}</div>
      </> : <span className="text-gray-500 dark:text-gray-400">{row.state === "none" ? "Update search found nothing pending" : row.state === "search_failed" ? "The update search failed, so pending updates are unknown" : row.state === "not_reported" ? "Selection not reported pending or installed" : "No update data"}</span>
    case "cves": return row.cves.length ? <div className="flex flex-wrap gap-1">{row.cves.map(cve =>
        <a key={cve} href={cveHref(cve, undefined, "windows")} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 rounded text-xs font-mono text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:underline whitespace-nowrap">{cve}</a>)}</div>
      : <span className="text-gray-400">-</span>
    case "flags": return <div className="flex flex-wrap gap-1">{updateFlags(row).map(flag =>
        <span key={flag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 whitespace-nowrap">{flag}</span>)}</div>
    case "ageDays": return row.ageDays === null ? <span className="text-gray-400">-</span>
      : <span title={row.ageSource === "offered" ? "Days since first offered" : "Days since released"}>{row.ageDays}</span>
    case "deferredUntil": return row.deferredUntil ? <When value={row.deferredUntil} /> : <span className="text-gray-400">-</span>
    case "installDate": return row.installDate ? <When value={row.installDate} /> : <span className="text-gray-400">-</span>
    case "inventoryState": return <><div>{inventoryLabel(row.inventoryState)}</div>{row.archived && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Archived in ReportMate</div>}</>
    case "collectedAt": return <><When value={row.collectedAt} /><div className={`text-xs mt-1 ${row.freshness === "fresh" ? "text-gray-500 dark:text-gray-400" : "text-amber-700 dark:text-amber-300"}`}>{row.freshness === "fresh" ? "Within maximum age" : row.freshness === "stale" ? "Older than maximum age" : "Collection age unknown"}</div></>
    case "updateSearch": {
      const search = row.updateSearch
      if (!search || search.status === "not_reported") return <span className="text-gray-500 dark:text-gray-400 italic">Not reported</span>
      return <>
        <div className={search.status === "failed" ? "text-red-700 dark:text-red-300 font-medium" : search.freshness !== "fresh" ? "text-amber-700 dark:text-amber-300" : ""}>{updateSearchLabel(search)}</div>
        {search.checkedAt && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1"><When value={search.checkedAt} /></div>}
      </>
    }
    case "lastSeen": return <When value={row.lastSeen} />
    default: return <>{row[column] || <span className="text-gray-400">-</span>}</>
  }
}

export function UpdatesTable({ rows, view, onSort, pending }: {
  rows: UpdateRow[]; view: UpdatesView; onSort: (column: UpdateColumn) => void; pending: boolean
}) {
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10"><tr>{view.columns.map(column => {
      const label = UPDATE_COLUMNS.find(([key]) => key === column)![1]
      const active = view.sort === column
      return <th key={column} scope="col" aria-sort={active ? (view.direction === "asc" ? "ascending" : "descending") : "none"}
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
        <button type="button" onClick={() => onSort(column)} disabled={pending} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white">
          {label}<span aria-hidden="true">{active ? view.direction === "asc" ? "↑" : "↓" : "↕"}</span>
        </button>
      </th>
    })}</tr></thead>
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
      {rows.length === 0 && <tr><td colSpan={view.columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No rows match these filters.</td></tr>}
      {rows.map(row => <tr key={updateRowKey(row)} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/30">
        {view.columns.map(column => <td key={column} className={`px-4 py-3 ${column === "title" ? "min-w-[260px] max-w-lg" : column === "cves" || column === "flags" ? "min-w-[160px] max-w-xs" : column === "deviceName" ? "min-w-[190px]" : "whitespace-nowrap"}`}>
          <Cell row={row} column={column} />
        </td>)}
      </tr>)}
    </tbody>
  </table></div>
}
