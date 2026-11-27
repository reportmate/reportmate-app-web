"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

export const SECURITY_REPORTS = {
  encryption: "Encryption",
  protection: "Protection",
  detection: "Detection",
  firewall: "Firewall",
  tampering: "Tampering",
  access: "Access",
  certificates: "Certificates",
} as const

export type PostureReport = keyof typeof SECURITY_REPORTS
export type SecurityTab = "posture" | PostureReport | "vulnerabilities"

export function isPostureReport(tab: string | null): tab is PostureReport {
  return tab !== null && Object.prototype.hasOwnProperty.call(SECURITY_REPORTS, tab)
}

export function securityHref(tab: SecurityTab, platform: string | null, threats = false) {
  const params = new URLSearchParams()
  if (tab !== "posture") params.set("tab", tab)
  if (threats) params.set("view", "threats")
  if (platform) params.set("platform", platform)
  const qs = params.toString()
  return qs ? `/security?${qs}` : "/security"
}

const switchClass = "inline-flex flex-wrap rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-900"

function tabClass(active: boolean) {
  return `px-3 py-0.5 rounded-md font-semibold transition-colors ${active
    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"}`
}

export function SecurityViewSwitch({ current }: { current: SecurityTab }) {
  const platform = useSearchParams()?.get("platform") ?? null
  const items: [SecurityTab, string][] = [["posture", "Security"], ...Object.entries(SECURITY_REPORTS) as [PostureReport, string][], ["vulnerabilities", "Vulnerabilities"]]
  return (
    <nav aria-label="Security reports" className={switchClass}>
      {items.map(([key, label]) => (
        <Link key={key} href={securityHref(key, platform)} aria-current={key === current ? "page" : undefined} className={tabClass(key === current)}>
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function VulnerabilitiesViewSwitch({ threats = false }: { threats?: boolean }) {
  const platform = useSearchParams()?.get("platform") ?? null
  return (
    <nav aria-label="Vulnerability views" className={`${switchClass} mt-2 text-sm`}>
      <Link href={securityHref("vulnerabilities", platform)} aria-current={!threats ? "page" : undefined} className={tabClass(!threats)}>CVEs</Link>
      <Link href={securityHref("vulnerabilities", platform, true)} aria-current={threats ? "page" : undefined} className={tabClass(threats)}>Threat Detections</Link>
    </nav>
  )
}
