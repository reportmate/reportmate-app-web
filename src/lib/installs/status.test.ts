import {
  isErrorItem,
  isWarningItem,
  isPendingItem,
  isSuccessItem,
  getItemMessage,
  aggregateStatusMessages,
  categorizeDevicesByInstallStatus,
} from './status'

// Item shapes copied from live payloads: a Munki item keeps its status factual
// and carries the run's text in lastError/lastWarning, while Cimian puts the
// state in currentStatus and leaves installedVersion empty.
const munkiWarning = { name: 'Chrome', status: 'installed', lastWarning: 'Could not process item Chrome for install.' }
const munkiError = { name: 'ReportMate', status: 'install_failed', lastError: 'Integrity check failed' }
const munkiSuccess = { name: 'ReportMate', status: 'install_succeeded', version: '2026.08.26.0251', installedVersion: '2026.08.26.0251', endTime: '2026-08-26T10:13:30.000Z' }
const munkiPending = { name: 'IINA', status: 'pending_install', version: '1.4.3', pendingReason: 'Not yet installed' }
const munkiInstalled = { name: 'Firefox', status: 'installed', installedVersion: '141.0' }
const cimianWarning = { itemName: 'Cimian', currentStatus: 'Warning', lastWarning: 'Install loop detected' }
const cimianSuccess = { itemName: 'DisableWidgets', currentStatus: 'completed', latestVersion: '2026.04.15.1032' }
const cimianPending = { itemName: 'Firefox', currentStatus: 'Pending Install', latestVersion: '2.89.1' }

function macDevice(serialNumber: string, deviceName: string, items: any[]) {
  return { serialNumber, lastSeen: '2026-08-26T10:13:30.000Z', modules: { inventory: { deviceName }, installs: { munki: { items } } } }
}

describe('install item status predicates', () => {
  it('classifies a Munki warning that keeps a factual installed status', () => {
    // The whole reason ?filter=warnings&platform=mac came up empty: Munki never
    // writes a 'warning' status, it only attaches lastWarning.
    expect(isWarningItem(munkiWarning)).toBe(true)
    expect(isErrorItem(munkiWarning)).toBe(false)
  })

  it('classifies errors from status and from lastError alike', () => {
    expect(isErrorItem(munkiError)).toBe(true)
    expect(isErrorItem({ name: 'X', status: 'installed', lastError: 'Download failed' })).toBe(true)
  })

  it('keeps a Cimian item classified by its status, not by leftover message text', () => {
    // A status that already says 'Warning' must stay a warning even if the item
    // also carries a stale lastError, or Windows counts would move silently.
    expect(isWarningItem({ ...cimianWarning, lastError: 'old failure' })).toBe(true)
    expect(isErrorItem({ ...cimianWarning, lastError: 'old failure' })).toBe(false)
  })

  it('separates a completed install from a package that is merely installed', () => {
    expect(isSuccessItem(munkiSuccess)).toBe(true)
    expect(isSuccessItem(cimianSuccess)).toBe(true)
    expect(isSuccessItem(munkiInstalled)).toBe(false)
  })

  it('classifies pending items on both platforms', () => {
    expect(isPendingItem(munkiPending)).toBe(true)
    expect(isPendingItem(cimianPending)).toBe(true)
  })
})

describe('getItemMessage', () => {
  it('returns the reported text for errors and warnings', () => {
    expect(getItemMessage(munkiError, 'errors')).toBe('Integrity check failed')
    expect(getItemMessage(munkiWarning, 'warnings')).toBe('Could not process item Chrome for install.')
  })

  it('uses the version as the success message on both platforms', () => {
    expect(getItemMessage(munkiSuccess, 'success')).toBe('Installed 2026.08.26.0251')
    // Cimian leaves installedVersion empty and reports latestVersion instead
    expect(getItemMessage(cimianSuccess, 'success')).toBe('Installed 2026.04.15.1032')
  })

  it('prefers a pending reason and falls back to the target version', () => {
    expect(getItemMessage(munkiPending, 'pending')).toBe('Not yet installed')
    expect(getItemMessage(cimianPending, 'pending')).toBe('Waiting to install 2.89.1')
  })

  it('invents nothing when the item carries no detail', () => {
    expect(getItemMessage({ name: 'X', status: 'install_succeeded' }, 'success')).toBe('')
  })
})

describe('aggregateStatusMessages', () => {
  const devices = [
    macDevice('AAA', 'Leslie', [
      { name: 'Teams', status: 'install_failed', lastError: 'Download failed: The network connection was lost.' },
      { name: 'Excel', status: 'install_failed', lastError: 'Download failed: The network connection was lost.' },
    ]),
    macDevice('BBB', 'Rebecca', [
      { name: 'ReportMate', status: 'install_failed', lastError: 'Integrity check failed' },
    ]),
    macDevice('CCC', 'Petey', [
      { name: 'Word', status: 'install_failed', lastError: 'Download failed: The network connection was lost.' },
      { name: 'Defender', status: 'install_failed' },
    ]),
  ]

  it('counts a device once no matter how many of its packages share the message', () => {
    const groups = aggregateStatusMessages(devices, 'errors')
    const network = groups.find(g => g.message.includes('network connection'))!
    expect(network.deviceCount).toBe(2)
    expect(network.occurrences).toHaveLength(3)
    expect(network.devices.find(d => d.serialNumber === 'AAA')!.itemNames).toEqual(['Teams', 'Excel'])
  })

  it('orders by how many devices are affected and pins the no-message bucket last', () => {
    const groups = aggregateStatusMessages(devices, 'errors')
    expect(groups.map(g => g.message)).toEqual([
      'Download failed: The network connection was lost.',
      'Integrity check failed',
      '',
    ])
  })

  it('filters to a single package when one is selected', () => {
    const groups = aggregateStatusMessages(devices, 'errors', { itemNameFilter: 'ReportMate' })
    expect(groups).toHaveLength(1)
    expect(groups[0].message).toBe('Integrity check failed')
  })
})

describe('categorizeDevicesByInstallStatus', () => {
  it('surfaces a macOS device whose only signal is lastWarning', () => {
    const { devicesWithWarnings, devicesWithSuccess } = categorizeDevicesByInstallStatus([
      macDevice('AAA', 'Leslie', [munkiWarning]),
      macDevice('BBB', 'Rebecca', [munkiSuccess]),
      macDevice('CCC', 'Petey', [munkiInstalled]),
    ])
    expect(devicesWithWarnings.map(d => d.serialNumber)).toEqual(['AAA'])
    expect(devicesWithSuccess.map(d => d.serialNumber)).toEqual(['BBB'])
  })
})
