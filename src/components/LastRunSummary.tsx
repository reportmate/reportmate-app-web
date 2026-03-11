import React from 'react'

interface LastRunItem {
  name: string
  version: string
  status: string
}

interface LastRunSummaryData {
  runType?: string
  successCount?: number
  errorCount?: number
  items: LastRunItem[]
}

// Extract last-run items from an installs event payload
export function parseInstallsEventPayload(payload: any): LastRunSummaryData | null {
  if (!payload || typeof payload !== 'object') return null

  // Handle bundle payloads — find the installs sub-payload
  const effectivePayload = findInstallsPayload(payload)
  if (!effectivePayload) return null

  const runType = effectivePayload.run_type || effectivePayload.runType
  const successCount = effectivePayload.success_count ?? effectivePayload.successCount
  const errorCount = effectivePayload.error_count ?? effectivePayload.errorCount

  const installsData = effectivePayload.full_installs_data
  if (!installsData || typeof installsData !== 'object') {
    // No full data, but we have summary counts
    if (successCount !== undefined || errorCount !== undefined) {
      return { runType, successCount, errorCount, items: [] }
    }
    return null
  }

  // Collect all items from both Cimian and Munki
  const rawItems: any[] = []
  if (installsData.cimian?.items && Array.isArray(installsData.cimian.items)) {
    rawItems.push(...installsData.cimian.items)
  }
  if (installsData.munki?.items && Array.isArray(installsData.munki.items)) {
    rawItems.push(...installsData.munki.items)
  }
  if (!rawItems.length && installsData.items && Array.isArray(installsData.items)) {
    rawItems.push(...installsData.items)
  }

  if (!rawItems.length) {
    // No items array — check for direct package references in the payload
    // e.g. {"ReportMate": "2026.03.08.2239", "full_installs_data": {...}}
    const directItems = extractDirectPackageRefs(effectivePayload)
    if (directItems.length > 0) {
      return { runType, successCount, errorCount, items: directItems }
    }
    return { runType, successCount, errorCount, items: [] }
  }

  const lastRunItems: LastRunItem[] = []

  // Strategy 1: Session-based filtering (Cimian with session timestamps)
  let sessionStartTime = ''
  if (installsData.cimian?.sessions?.[0]) {
    sessionStartTime = installsData.cimian.sessions[0].start_time || installsData.cimian.sessions[0].startTime || ''
  } else if (installsData.recentSessions?.[0]) {
    sessionStartTime = installsData.recentSessions[0].start_time || installsData.recentSessions[0].startTime || ''
  }
  const sessionTime = sessionStartTime ? new Date(sessionStartTime).getTime() : 0

  if (sessionTime) {
    for (const item of rawItems) {
      const itemTimestamp = item.lastSeenInSession || item.lastUpdate || ''
      if (!itemTimestamp) continue
      try {
        const itemTime = new Date(itemTimestamp).getTime()
        if (!isNaN(itemTime) && itemTime >= sessionTime - 60000) {
          lastRunItems.push({
            name: item.displayName || item.name || 'Unknown',
            version: item.version || item.installedVersion || '',
            status: item.status || item.currentStatus || 'Unknown',
          })
        }
      } catch { /* skip */ }
    }
  }

  // Strategy 2: Noteworthy items — warnings, errors, pending, removed
  // This covers Munki items (no session timestamps) and is the primary way to
  // answer "which packages had issues?" for warning/error events
  if (lastRunItems.length === 0) {
    for (const item of rawItems) {
      const status = (item.status || item.currentStatus || '').toLowerCase()
      const hasWarning = item.lastWarning && String(item.lastWarning).trim() !== ''
      const hasError = item.lastError && String(item.lastError).trim() !== ''
      const isNonStable = ['warning', 'error', 'pending', 'removed', 'pending update', 'pending install', 'failed'].includes(status)

      if (hasWarning || hasError || isNonStable) {
        lastRunItems.push({
          name: item.displayName || item.name || 'Unknown',
          version: item.version || item.installedVersion || '',
          status: hasError ? 'Error' : hasWarning ? 'Warning' : (item.status || item.currentStatus || 'Unknown'),
        })
      }
    }
  }

  // Strategy 3: Direct package references in the event payload
  // e.g. {"ReportMate": "2026.03.08.2239"} at the top level
  if (lastRunItems.length === 0) {
    const directItems = extractDirectPackageRefs(effectivePayload)
    lastRunItems.push(...directItems)
  }

  // Strategy 4: Parse top-level "warnings" / "errors" text into items.
  // Munki warning/error events store run-level text here rather than per-item flags.
  if (lastRunItems.length === 0) {
    const warningsText = String(effectivePayload.warnings || '')
    const errorsText   = String(effectivePayload.errors || effectivePayload.error || '')

    const textToItems = (text: string, status: string): LastRunItem[] => {
      if (!text.trim()) return []
      // Split on "; WARNING:" / "; ERROR:" boundaries then strip leading prefix
      const segments = text
        .split(/;\s*(?:WARNING|ERROR):\s*/i)
        .map(s => s.replace(/^(?:WARNING|ERROR):\s*/i, '').trim())
        // Drop bare keyword remnants (e.g. error field containing just "ERROR")
        .filter(s => Boolean(s) && !/^(?:warning|error)$/i.test(s))

      return segments.map(segment => {
        // "... for PackageName" at end of sentence
        const forMatch = segment.match(/\bfor\s+([A-Za-z0-9][\w.-]*)[\s;,.]*$/i)
        if (forMatch) return { name: forMatch[1], version: '', status }

        // "Package bundle.id references are: ["Name1", "Name2"]"
        // Extract actual package names from the reference list rather than the bundle ID
        const refsMatch = segment.match(/^Package\s+[\w.]+\s+references are:\s*\[([^\]]+)\]/i)
        if (refsMatch) {
          const names = (refsMatch[1].match(/"([^"]+)"/g) || []).map(n => n.replace(/"/g, ''))
          if (names.length > 0) {
            // Prefer the shortest name (base package, not a variant like "Zoom-IT")
            const best = names.slice().sort((a, b) => a.length - b.length)[0]
            return { name: best, version: '', status }
          }
        }

        // "Package bundle.id ..." at start (no references array)
        const pkgMatch = segment.match(/^Package\s+([\w.]+)/i)
        if (pkgMatch) {
          const parts = pkgMatch[1].split('.')
          const readable = parts[parts.length - 1].replace(/([a-z])([A-Z])/g, '$1 $2')
          return { name: readable, version: '', status }
        }

        // Fallback: use the whole sentence, truncated
        return {
          name: segment.length > 70 ? segment.substring(0, 67) + '...' : segment,
          version: '',
          status,
        }
      })
    }

    const allTextItems: LastRunItem[] = []
    if (warningsText) allTextItems.push(...textToItems(warningsText, 'Warning'))
    if (errorsText)   allTextItems.push(...textToItems(errorsText,   'Error'))

    // Deduplicate by name (case-insensitive) — multiple warnings about the same package collapse to one
    const seen = new Set<string>()
    for (const item of allTextItems) {
      const key = item.name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        lastRunItems.push(item)
      }
    }
  }

  return { runType, successCount, errorCount, items: lastRunItems }
}

// Check top-level payload keys for direct package name: version references
// e.g. {"ReportMate": "2026.03.08.2239", "full_installs_data": {...}}
function extractDirectPackageRefs(payload: any): LastRunItem[] {
  const skipKeys = new Set([
    'full_installs_data', 'warnings', 'errors', 'run_type', 'runType',
    'session_id', 'module_status', 'success_count', 'error_count',
    'module_id', 'collected_at', 'client_version', 'platform',
  ])
  const items: LastRunItem[] = []
  for (const [key, value] of Object.entries(payload)) {
    if (skipKeys.has(key)) continue
    if (typeof value === 'string' && value.match(/^[\d.]+/)) {
      items.push({ name: key, version: value, status: 'Installed' })
    }
  }
  return items
}

function findInstallsPayload(payload: any): any | null {
  // Direct installs payload
  if (payload.full_installs_data || payload.module_status) {
    return payload
  }

  // Bundle: search sub-payloads
  if (payload.isBundle && payload.payloads && Array.isArray(payload.payloads)) {
    for (const sub of payload.payloads) {
      const p = sub.payload
      if (p?.full_installs_data || p?.module_status) {
        return p
      }
    }
  }

  return null
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'installed':
    case 'success':
    case 'completed':
    case 'up to date':
      return 'text-green-700 dark:text-green-400'
    case 'pending':
    case 'pending update':
    case 'available':
      return 'text-cyan-700 dark:text-cyan-400'
    case 'warning':
      return 'text-yellow-700 dark:text-yellow-400'
    case 'error':
    case 'failed':
      return 'text-red-700 dark:text-red-400'
    case 'removed':
      return 'text-purple-700 dark:text-purple-400'
    default:
      return 'text-gray-700 dark:text-gray-400'
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'installed':
    case 'success':
    case 'completed':
    case 'up to date':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'pending':
    case 'pending update':
    case 'available':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'error':
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'removed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

interface LastRunSummaryProps {
  payload: any
}

export const LastRunSummary: React.FC<LastRunSummaryProps> = ({ payload }) => {
  const data = parseInstallsEventPayload(payload)
  if (!data) return null

  const hasItems = data.items.length > 0
  const hasCounts = data.successCount !== undefined || data.errorCount !== undefined

  if (!hasItems && !hasCounts) return null

  // Determine if these are warning/error items or general last-run items
  const hasIssues = data.items.some(item => {
    const s = item.status.toLowerCase()
    return s === 'warning' || s === 'error' || s === 'failed' || s === 'pending' || s === 'removed'
  })
  const title = hasIssues ? 'Packages with Issues' : 'Last Run Summary'

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h4>
        {data.runType && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
            {data.runType}
          </span>
        )}
        {hasCounts && (
          <div className="flex items-center gap-2 ml-auto text-xs">
            {data.successCount !== undefined && data.successCount > 0 && (
              <span className="text-green-700 dark:text-green-400">{data.successCount} succeeded</span>
            )}
            {data.errorCount !== undefined && data.errorCount > 0 && (
              <span className="text-red-700 dark:text-red-400">{data.errorCount} failed</span>
            )}
          </div>
        )}
      </div>

      {hasItems ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Package</th>
              <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <td className="py-1.5 px-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-gray-900 dark:text-white font-medium">{item.name}</td>
                <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{item.version || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : hasCounts ? (
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          No individual package details available in this event payload.
        </p>
      ) : null}
    </div>
  )
}

export default LastRunSummary
