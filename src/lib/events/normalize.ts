export type EventSeverity = 'success' | 'warning' | 'error' | 'info'

export function normalizeEventKind(kind: string): EventSeverity {
  const k = (kind || '').toLowerCase()

  // Check for exact matches first (for ReportMate client events)
  if (k === 'success') return 'success'
  if (k === 'warning') return 'warning'
  if (k === 'error') return 'error'
  
  // Check for install-specific patterns
  if (k === 'install_success' || k === 'package_install_success') return 'success'
  if (k === 'install_warning' || k === 'package_install_warning') return 'warning'
  if (k === 'install_error' || k === 'package_install_error') return 'error'

  // Check for suffix/prefix patterns
  if (k.endsWith('_error')) return 'error'
  if (k.endsWith('_warning') || k.startsWith('warn_')) return 'warning'
  if (k.endsWith('_success') || k.startsWith('success_')) return 'success'

  return 'info'
}

export function severityToBadgeClasses(sev: EventSeverity): string {
  if (sev === 'success') return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
  if (sev === 'warning') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
  if (sev === 'error') return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
  return 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800'
}
