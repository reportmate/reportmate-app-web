import {
  installedUpdateCoverage,
  matchesSystemSearch,
  matchingInstalledUpdates,
  updatesToDisplay,
} from './installedUpdates'

const device = {
  deviceName: 'LAB-PC-042',
  serialNumber: 'ABC123',
  assetTag: 'A0042',
  operatingSystem: 'Windows 11 Enterprise',
  osVersion: '10.0.26100',
  buildNumber: '9457',
  installedUpdates: [
    { id: 'KB5129195', title: 'Security Update', installedOn: '2026-09-15' },
    { id: 'KB5000001', title: 'Servicing Stack', installedOn: '2026-08-01' },
  ],
}

describe('system fleet update search', () => {
  it('finds devices by KB regardless of case', () => {
    expect(matchesSystemSearch(device, 'kb5129195')).toBe(true)
    expect(matchingInstalledUpdates(device, 'KB5129195')).toEqual([device.installedUpdates[0]])
  })

  it('finds update titles and OS builds as well as device identity', () => {
    expect(matchesSystemSearch(device, 'servicing stack')).toBe(true)
    expect(matchesSystemSearch(device, '9457')).toBe(true)
    expect(matchesSystemSearch(device, 'lab-pc')).toBe(true)
  })

  it('does not turn an unknown KB into a match', () => {
    expect(matchesSystemSearch(device, 'KB9999999')).toBe(false)
  })

  it('shows matching updates first and otherwise shows the newest installed update', () => {
    expect(updatesToDisplay(device, 'servicing')).toEqual([device.installedUpdates[1]])
    expect(updatesToDisplay(device, '')).toEqual([device.installedUpdates[0]])
  })

  it('counts KB coverage once per device and sorts the most common update first', () => {
    expect(installedUpdateCoverage([
      device,
      {
        installedUpdates: [
          device.installedUpdates[0],
          device.installedUpdates[0],
          { id: 'KB5000002', title: 'Older Update', installedOn: '2026-07-01' },
        ],
      },
    ])).toEqual([
      { ...device.installedUpdates[0], key: 'KB5129195', deviceCount: 2 },
      { ...device.installedUpdates[1], key: 'KB5000001', deviceCount: 1 },
      { id: 'KB5000002', title: 'Older Update', installedOn: '2026-07-01', key: 'KB5000002', deviceCount: 1 },
    ])
  })
})
