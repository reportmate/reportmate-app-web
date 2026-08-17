/**
 * GenericModulePanel
 *
 * Default renderer for an extension module that does not ship a custom
 * component. Turns an arbitrary module JSONB payload into a readable card:
 * scalars become labelled rows, nested objects become subsections, and arrays
 * of objects become compact tables. This is what makes a new module usable the
 * day its data lands — a bespoke component is an optional upgrade, not a
 * prerequisite.
 */

import React from 'react'

interface GenericModulePanelProps {
  moduleId: string
  data: any
  title?: string
}

const humanize = (key: string): string =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

const isScalar = (v: any): boolean =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v)

const renderScalar = (v: any): string => {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

const DetailRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-gray-900 dark:text-gray-100 text-right break-words">
      {renderScalar(value)}
    </span>
  </div>
)

const ScalarTable: React.FC<{ rows: Record<string, any>[] }> = ({ rows }) => {
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row || {}).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  ).slice(0, 8)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400">
            {columns.map((c) => (
              <th key={c} className="font-medium py-1 pr-3 whitespace-nowrap">{humanize(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, i) => (
            <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
              {columns.map((c) => (
                <td key={c} className="py-1 pr-3 align-top text-gray-900 dark:text-gray-100">
                  {isScalar(row?.[c]) ? renderScalar(row?.[c]) : JSON.stringify(row?.[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 && (
        <div className="text-xs text-gray-400 mt-1">+{rows.length - 100} more rows</div>
      )}
    </div>
  )
}

const Section: React.FC<{ label: string; value: any }> = ({ label, value }) => {
  if (isScalar(value)) return <DetailRow label={label} value={value} />

  if (Array.isArray(value)) {
    if (value.length === 0) return <DetailRow label={label} value="—" />
    if (value.every(isScalar)) {
      return <DetailRow label={label} value={value.map(renderScalar).join(', ')} />
    }
    return (
      <div className="py-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</div>
        <ScalarTable rows={value.filter((v) => v && typeof v === 'object')} />
      </div>
    )
  }

  // Nested object → subsection
  const entries = Object.entries(value || {})
  if (entries.length === 0) return <DetailRow label={label} value="—" />
  return (
    <div className="py-2">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</div>
      <div className="pl-3 border-l border-gray-200 dark:border-gray-700">
        {entries.map(([k, v]) => (
          <Section key={k} label={humanize(k)} value={v} />
        ))}
      </div>
    </div>
  )
}

export const GenericModulePanel: React.FC<GenericModulePanelProps> = ({ moduleId, data, title }) => {
  // Some modules store a single-element array; unwrap for display.
  const payload = Array.isArray(data) && data.length === 1 ? data[0] : data
  const entries = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.entries(payload)
    : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {title || humanize(moduleId)}
        </h3>
      </div>
      <div className="space-y-1">
        {entries
          ? entries.map(([k, v]) => <Section key={k} label={humanize(k)} value={v} />)
          : <Section label={humanize(moduleId)} value={payload} />}
      </div>
    </div>
  )
}

export default GenericModulePanel
