"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

/** The Management report's shield, exactly as the Reports menu draws it. */
export function ManagementShieldIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`${className} text-yellow-600 dark:text-yellow-400 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

/**
 * "Enrollment | Tools Logs": the two Management views, /management and
 * /management/logs. The global `platform` parameter carries across.
 */
export function ManagementViewSwitch({ current }: { current: "enrollment" | "logs" }) {
  const searchParams = useSearchParams()
  const platform = searchParams?.get("platform")
  const withPlatform = (path: string) => (platform ? `${path}?platform=${encodeURIComponent(platform)}` : path)
  const items = [
    { key: "enrollment", label: "Enrollment", href: withPlatform("/management") },
    { key: "logs", label: "Tools Logs", href: withPlatform("/management/logs") },
  ] as const
  return (
    <nav aria-label="Management views" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-100 dark:bg-gray-900 text-sm">
      {items.map(item => {
        const active = item.key === current
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              active
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
