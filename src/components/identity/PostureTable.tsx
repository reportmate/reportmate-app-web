"use client"

import Link from "next/link"
import { formatExactTime, formatRelativeTime } from "../../lib/time"
import { POSTURE_COLUMNS, columnText, type Freshness, type PostureColumn, type PostureDevice, type PostureView } from "../../lib/identity/posture"

function When({ value, freshness }: { value: string | null; freshness?: Freshness }) {
  return <>
    {value ? <time dateTime={value} title={formatExactTime(value)}>{formatRelativeTime(value)}</time> : <span className="text-gray-400">Unknown</span>}
    {freshness && freshness !== "fresh" && <div className="text-xs mt-1 text-amber-700 dark:text-amber-300">{freshness === "stale" ? "Older than maximum age" : "Collection age unknown"}</div>}
  </>
}

/** Values that are a posture finding, per column. */
const RISKS: Partial<Record<PostureColumn, (text: string) => boolean>> = {
  laps: t => t === "Not configured",
  autoLogin: t => t.startsWith("On"),
  uac: t => t === "Off",
  psso: t => t === "Token expired",
  activationLock: t => t === "On" || t.startsWith("Likely"),
  recoveryKey: t => t === "None on device" || t === "FileVault off",
  bootstrapToken: t => t === "Not escrowed",
  tpm: t => t === "Not owned",
  credentialGuard: () => false,
}

function Value({ device, column }: { device: PostureDevice; column: PostureColumn }) {
  const text = columnText(device, column)
  if (text === null) return <span className="text-gray-400">Not applicable</span>
  if (text === "Unknown") return <span className="text-gray-500 dark:text-gray-400 italic">Unknown</span>
  return <span className={RISKS[column]?.(text) ? "text-red-700 dark:text-red-300 font-medium" : ""}>{text}</span>
}

function Cell({ device, column }: { device: PostureDevice; column: PostureColumn }) {
  switch (column) {
    case "deviceName": return <>
      <Link href={`/device/${encodeURIComponent(device.serialNumber)}?tab=identity`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{device.deviceName || device.serialNumber}</Link>
      <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">{device.serialNumber}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{[device.assetTag, device.platform].filter(Boolean).join(" ")}</div>
      {device.unreadable && <div className="text-xs mt-1 text-amber-700 dark:text-amber-300">Collected data could not be read</div>}
    </>
    case "inventoryState": return <><Value device={device} column={column} />{device.archived && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Archived in ReportMate</div>}<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{[device.catalog, device.usage, device.room].filter(Boolean).join(" · ")}</div></>
    case "identityCollectedAt": return <When value={device.identityCollectedAt} freshness={device.identityFreshness} />
    case "securityCollectedAt": return device.platform === "macOS" ? <When value={device.securityCollectedAt} freshness={device.securityFreshness} /> : <span className="text-gray-400">Not applicable</span>
    case "lastSeen": return <When value={device.lastSeen} />
    case "psso": return <><Value device={device} column={column} />
      {device.platform === "macOS" && (device.reported?.pssoUsers || []).filter(u => u.registered).map((u, i) => <div key={i} className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {u.username || "Unknown user"}: {u.token === "expired" ? "expired" : u.token === "valid" ? "valid" : "token unknown"}{u.tokenExpiration && <> · <time dateTime={u.tokenExpiration} title={formatExactTime(u.tokenExpiration)}>{u.tokenExpiration.slice(0, 10)}</time></>}
      </div>)}
    </>
    default: return <Value device={device} column={column} />
  }
}

export function PostureTable({ devices, view, onSort, pending }: {
  devices: PostureDevice[]; view: PostureView; onSort: (column: PostureColumn) => void; pending: boolean
}) {
  return <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
    <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10"><tr>{view.columns.map(column => {
      const label = POSTURE_COLUMNS.find(([key]) => key === column)![1]
      const active = view.sort === column
      return <th key={column} scope="col" aria-sort={active ? (view.direction === "asc" ? "ascending" : "descending") : "none"}
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
        <button type="button" onClick={() => onSort(column)} disabled={pending} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white">
          {label}<span aria-hidden="true">{active ? view.direction === "asc" ? "↑" : "↓" : "↕"}</span>
        </button>
      </th>
    })}</tr></thead>
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-900 dark:text-gray-100">
      {devices.length === 0 && <tr><td colSpan={view.columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No devices match these filters.</td></tr>}
      {devices.map(device => <tr key={device.serialNumber} className={`align-top hover:bg-gray-50 dark:hover:bg-gray-700/30 ${device.identityFreshness !== "fresh" ? "opacity-80" : ""}`}>
        {view.columns.map(column => <td key={column} className={`px-4 py-3 ${column === "deviceName" ? "min-w-[190px]" : column === "hello" || column === "passwordPolicy" || column === "psso" ? "min-w-[200px] max-w-xs" : "whitespace-nowrap"}`}>
          <Cell device={device} column={column} />
        </td>)}
      </tr>)}
    </tbody>
  </table></div>
}
