import { getEventDeviceHrefSuffix, getEventModuleId } from './eventLinks'

const event = (kind: string, message: string) => ({ kind, message })

describe('getEventDeviceHrefSuffix', () => {
  it('lands a Munki warning on the installs tab filtered to warnings', () => {
    expect(getEventDeviceHrefSuffix(event('warning', '2 Munki warnings'))).toBe('?filter=warning#installs')
  })

  it('lands a Munki error on the error filter', () => {
    expect(getEventDeviceHrefSuffix(event('error', '44 Munki errors'))).toBe('?filter=error#installs')
  })

  it('lands a failed install on the error filter', () => {
    expect(getEventDeviceHrefSuffix(event('error', 'RenderingManager 2026.08.27.1706 failed to install')))
      .toBe('?filter=error#installs')
  })

  it('lands a success on Last Run rather than the whole installed inventory', () => {
    expect(getEventDeviceHrefSuffix(event('success', '2 packages installed'))).toBe('?filter=last_run#installs')
    expect(getEventDeviceHrefSuffix(event('success', '3 packages updated'))).toBe('?filter=last_run#installs')
  })

  it('routes non-installs modules to their tab with no filter', () => {
    expect(getEventDeviceHrefSuffix(event('info', 'Hardware data reported'))).toBe('#hardware')
    expect(getEventDeviceHrefSuffix(event('info', 'Inventory data reported'))).toBe('#inventory')
    expect(getEventDeviceHrefSuffix(event('info', 'System module data reported'))).toBe('#system')
  })

  it('prefers an explicit module_id over the message', () => {
    expect(getEventModuleId({ kind: 'info', message: 'Hardware data reported', payload: { module_id: 'network' } }))
      .toBe('network')
  })

  it('treats an unmatched run-level warning as installs', () => {
    expect(getEventDeviceHrefSuffix(event('warning', 'AmdAdrenalinDriver warning'))).toBe('?filter=warning#installs')
    expect(getEventDeviceHrefSuffix(event('warning', '2 warnings'))).toBe('?filter=warning#installs')
  })

  it('gives info events no installs fallback', () => {
    expect(getEventDeviceHrefSuffix(event('info', '4 modules reported'))).toBe('')
  })

  it('lets a named module win over the installs fallback', () => {
    expect(getEventDeviceHrefSuffix(event('warning', 'Firewall is disabled'))).toBe('#security')
  })

  it('returns no suffix when the module cannot be identified', () => {
    expect(getEventDeviceHrefSuffix(event('info', '4 modules reported'))).toBe('')
  })
})
