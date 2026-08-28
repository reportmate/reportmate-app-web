import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ManagedInstallsTable } from './ManagedInstallsTable'

const pkg = (over: Record<string, unknown> = {}) => ({
  id: 'staffsso',
  name: 'StaffSingleSignOnPrefs',
  displayName: 'StaffSingleSignOnPrefs',
  version: '14.3.2',
  status: 'Warning',
  type: 'munki',
  category: 'Preferences',
  lastUpdate: '2026-08-28T20:47:54.000Z',
  warnings: [{ id: 'w1', message: 'Will not attempt to remove StaffSingleSignOnPrefs', timestamp: '2026-08-28T20:47:54.000Z', code: 'MUNKI_WARNING', package: 'StaffSingleSignOnPrefs' }],
  errors: [],
  ...over,
})

const data = (packages: unknown[]) => ({
  totalPackages: packages.length,
  packages,
  config: { type: 'munki' },
  systemName: 'Munki',
}) as never

// Static rendering does not run effects, so these cover the component's top level and
// the row markup, not the expanded detail panel (which only mounts once the auto-expand
// effect has run). An undefined identifier inside that panel is caught by `tsc`, which
// needs tsconfig's `ignoreDeprecations` to run at all — without it tsc aborts on the
// baseUrl deprecation before checking a single file.
describe('ManagedInstallsTable rendering', () => {
  it('renders a warning row with its detail panel under an active filter', () => {
    const html = renderToStaticMarkup(
      <ManagedInstallsTable data={data([pkg()])} initialStatusFilter={['warning']} />
    )
    expect(html).toContain('StaffSingleSignOnPrefs')
  })

  it('renders a pending row carrying a pending reason', () => {
    const html = renderToStaticMarkup(
      <ManagedInstallsTable
        data={data([pkg({ id: 'p', name: 'Pending Thing', displayName: 'Pending Thing', status: 'Pending', warnings: [], pendingReason: 'Update available: 1.0 to 2.0' })])}
        initialStatusFilter={['pending']}
      />
    )
    expect(html).toContain('Pending Thing')
  })

  it('renders with no filter applied', () => {
    const html = renderToStaticMarkup(<ManagedInstallsTable data={data([pkg()])} />)
    expect(html).toContain('StaffSingleSignOnPrefs')
  })
})
