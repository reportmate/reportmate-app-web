import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProfilesTable } from './ProfilesTable'
import { EnrollmentHealthCells } from './EnrollmentHealth'
import type { ProfileRow } from '../../lib/management/profiles'

const base: ProfileRow = {
  serialNumber: 'TESTSERIAL01', deviceName: 'Device A', platform: 'macOS', assetTag: null, usage: null, catalog: null,
  area: null, fleet: null, location: null, room: null, archived: false, inventoryState: null, lastSeen: null,
  collectedAt: null, freshness: 'unknown', inventoryCount: 0, state: 'unknown', identifier: 'com.example.wifi', name: 'Wifi', scope: null,
}

describe('ProfilesTable', () => {
  it('links devices by serial and shows unknown rows honestly', () => {
    render(<ProfilesTable kind="profile" view={{ sort: 'deviceName', direction: 'asc' }} onSort={() => {}} pending={false}
      rows={[base, { ...base, serialNumber: 'TESTSERIAL02', state: 'installed', scope: 'system', installDate: '2026-01-01 10:00:00 +0000', freshness: 'fresh', inventoryCount: 4 }]} />)
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/device/TESTSERIAL01#management')
    expect(screen.getByText('No management inventory reported')).toBeTruthy()
    expect(screen.getAllByText('Installed')).toHaveLength(2)
    expect(screen.getByText('System')).toBeTruthy()
  })

  it('shows preference values and settings for the preference report', () => {
    render(<ProfilesTable kind="preference" view={{ sort: 'deviceName', direction: 'asc' }} onSort={() => {}} pending={false}
      rows={[{ ...base, state: 'installed', scope: 'system', settingCount: 3, values: [{ scope: 'System Level', value: '7' }] }]} />)
    expect(screen.getByRole('button', { name: /Domain/ })).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
  })
})

describe('EnrollmentHealthCells', () => {
  const renderRow = (device: object) => render(<table><tbody><tr><EnrollmentHealthCells device={device} now={Date.parse('2026-01-15T12:00:00Z')} /></tr></tbody></table>)

  it('reads unknown for uncollected macOS fields and not applicable for Apple flags on Windows', () => {
    renderRow({ platform: 'Windows', complianceState: null, lastMdmSync: null, mdmCertificateExpires: null })
    expect(screen.getAllByText('Unknown')).toHaveLength(3)
    expect(screen.getByText('Not applicable')).toBeTruthy()
  })

  it('flags an expired certificate and a non-compliant device', () => {
    renderRow({ platform: 'macOS', complianceState: 'non_compliant', mdmCertificateExpires: '2026-01-10T12:00:00Z', userApprovedMdm: true, installedFromDep: null, depCapable: false })
    expect(screen.getByText('Not compliant')).toBeTruthy()
    expect(screen.getByText('Expired 5 days ago')).toBeTruthy()
    expect(screen.getByText('User approved: Yes')).toBeTruthy()
    expect(screen.getByText('ADE installed: Unknown')).toBeTruthy()
  })
})
