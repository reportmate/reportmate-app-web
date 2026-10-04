import { calculateDeviceStatus, isStored, reportDeviceStatus } from './device-status'

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

describe('calculateDeviceStatus with an inventory state', () => {
  it('reports a stored device as storage however long it has been silent', () => {
    expect(calculateDeviceStatus(daysAgo(40), {}, false, { state: 'storage' })).toBe('storage')
    expect(calculateDeviceStatus(null, {}, false, { state: 'storage' })).toBe('storage')
  })

  it('keeps stale and missing for devices that are checked out', () => {
    expect(calculateDeviceStatus(daysAgo(3), {}, false, { state: 'checked_out' })).toBe('stale')
    expect(calculateDeviceStatus(daysAgo(40), {}, false, { state: 'checked_out' })).toBe('missing')
  })

  it('lets archived win over storage', () => {
    expect(calculateDeviceStatus(daysAgo(40), {}, true, { state: 'storage' })).toBe('archived')
  })

  it('behaves as before without an inventory state', () => {
    expect(calculateDeviceStatus(daysAgo(0.1))).toBe('active')
    expect(calculateDeviceStatus(daysAgo(40))).toBe('missing')
  })
})

describe('isStored', () => {
  it('is true only for the storage state', () => {
    expect(isStored({ state: 'storage' })).toBe(true)
    expect(isStored({ state: 'decommissioning' })).toBe(false)
    expect(isStored(null)).toBe(false)
  })
})

describe('reportDeviceStatus', () => {
  it('puts a stored device in the storage bucket, never stale or missing', () => {
    expect(reportDeviceStatus({ lastSeen: daysAgo(3), inventoryState: { state: 'storage' } })).toBe('storage')
    expect(reportDeviceStatus({ lastSeen: null, inventoryState: { state: 'storage' } })).toBe('storage')
  })

  it('buckets every other device by last seen', () => {
    expect(reportDeviceStatus({ lastSeen: daysAgo(0.1) })).toBe('active')
    expect(reportDeviceStatus({ lastSeen: daysAgo(3), inventoryState: { state: 'checked_out' } })).toBe('stale')
    expect(reportDeviceStatus({ lastSeen: daysAgo(40) })).toBe('missing')
    expect(reportDeviceStatus({ lastSeen: null })).toBe('missing')
  })
})
