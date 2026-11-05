"use client"

import type { ReactNode } from "react"
import { formatExactTime } from "../../lib/time"
import {
  CERT_EXPIRY_DAYS, SYNC_AGE_CHOICES, appleFlagLabel, certDaysLeft, complianceLabel, syncAgeDays,
  type EnrollmentHealth, type EnrollmentHealthFilters,
} from "../../lib/management/enrollment-health"

const th = "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 whitespace-nowrap"
const unknown = <span className="text-xs text-gray-500 dark:text-gray-400">Unknown</span>

/** Compliance, last MDM sync, MDM certificate and Apple MDM column headers for the enrollment table. */
export function EnrollmentHealthHeaders() {
  return <>
    <th className={th}>Compliance</th>
    <th className={th}>Last MDM Sync</th>
    <th className={th}>MDM Certificate</th>
    <th className={th} title="macOS user-approved MDM, installed via Automated Device Enrollment, and DEP capable">Apple MDM</th>
  </>
}

function days(n: number): string {
  const whole = Math.floor(Math.abs(n))
  return whole === 1 ? "1 day" : `${whole} days`
}

function Exact({ value, children }: { value: string; children: ReactNode }) {
  return <time dateTime={value} title={formatExactTime(value)}>{children}</time>
}

export function EnrollmentHealthCells({ device, now }: { device: EnrollmentHealth; now: number }) {
  const sync = syncAgeDays(device.lastMdmSync, now)
  const left = certDaysLeft(device.mdmCertificateExpires, now)
  const isMac = /mac/i.test(device.platform || "")
  const compliance = device.complianceState
  return <>
    <td className="px-3 py-1.5 whitespace-nowrap">
      {compliance ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${compliance === "compliant"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}
        title={device.complianceSource === "policies" ? "Evaluated from the compliance policy results the device reported" : "Reported by the device"}>
        {complianceLabel(compliance)}</span>
        : <span className="text-xs text-gray-500 dark:text-gray-400" title={isMac ? "macOS does not report compliance" : "Not collected"}>Unknown</span>}
    </td>
    <td className="px-3 py-1.5 whitespace-nowrap text-sm text-gray-900 dark:text-white">
      {sync === null || !device.lastMdmSync ? <span title={isMac ? "macOS does not report a last MDM sync time" : "Not collected"}>{unknown}</span>
        : <Exact value={device.lastMdmSync}>{sync < 1 ? "Today" : `${days(sync)} ago`}</Exact>}
    </td>
    <td className="px-3 py-1.5 whitespace-nowrap text-sm">
      {left === null || !device.mdmCertificateExpires ? unknown
        : <Exact value={device.mdmCertificateExpires}>
            <span className={left < 0 ? "text-red-700 dark:text-red-300 font-medium" : left <= CERT_EXPIRY_DAYS ? "text-amber-700 dark:text-amber-300 font-medium" : "text-gray-900 dark:text-white"}>
              {left < 0 ? `Expired ${days(left)} ago` : `Expires in ${days(left)}`}
            </span>
          </Exact>}
    </td>
    <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
      {isMac ? <div className="space-y-0.5">
        <div>User approved: {appleFlagLabel(device.userApprovedMdm, device.platform)}</div>
        <div>ADE installed: {appleFlagLabel(device.installedFromDep, device.platform)}</div>
        <div>DEP capable: {appleFlagLabel(device.depCapable, device.platform)}</div>
      </div> : <span className="text-gray-500 dark:text-gray-400">Not applicable</span>}
    </td>
  </>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick}
    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${active
      ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700"
      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"}`}>{children}</button>
}

/** Problem filters; a device whose value is unknown never matches one. */
export function EnrollmentHealthFilterBar({ filters, onChange }: { filters: EnrollmentHealthFilters; onChange: (next: EnrollmentHealthFilters) => void }) {
  const syncChoices = [...new Set<number>([...SYNC_AGE_CHOICES, ...(filters.syncOlderThanDays ? [filters.syncOlderThanDays] : [])])].sort((a, b) => a - b)
  return <div role="group" aria-label="Enrollment health filters" className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-6 gap-y-2">
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrollment health</span>
    <Chip active={filters.nonCompliant} onClick={() => onChange({ ...filters, nonCompliant: !filters.nonCompliant })}>Not compliant</Chip>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-600 dark:text-gray-400">MDM sync older than</span>
      {syncChoices.map(n => <Chip key={n} active={filters.syncOlderThanDays === n}
        onClick={() => onChange({ ...filters, syncOlderThanDays: filters.syncOlderThanDays === n ? null : n })}>{n === 1 ? "1 day" : `${n} days`}</Chip>)}
    </div>
    <Chip active={filters.certExpiringDays !== null}
      onClick={() => onChange({ ...filters, certExpiringDays: filters.certExpiringDays !== null ? null : CERT_EXPIRY_DAYS })}>
      MDM certificate expiring within {filters.certExpiringDays ?? CERT_EXPIRY_DAYS} days</Chip>
    <span className="text-xs text-gray-500 dark:text-gray-400">Devices that did not report a value are excluded from these filters and shown as Unknown.</span>
  </div>
}
