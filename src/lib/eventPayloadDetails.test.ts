import { summarizeEventPayload } from './eventPayloadDetails'

describe('summarizeEventPayload', () => {
  it('expands a comma-joined module string', () => {
    const s = summarizeEventPayload({ modules: 'security, network, management, hardware', moduleCount: '4' })
    expect(s.modules).toEqual(['security', 'network', 'management', 'hardware'])
  })

  it('reads a module array', () => {
    const s = summarizeEventPayload({ modules: ['security', 'network'], collectionType: 'Full' })
    expect(s.modules).toEqual(['security', 'network'])
    expect(s.context).toContainEqual({ label: 'Collection', value: 'Full' })
  })

  it('lists installed items with versions and run context', () => {
    const s = summarizeEventPayload({
      count: 3,
      action: 'update',
      run_type: 'auto',
      session_id: '2026-08-28-0949',
      duration_seconds: 117,
      items: [
        { name: 'TaskbarUtil', version: '2026.08.27.1927' },
        { name: 'DisableWidgets', version: '2026.08.27.1701' },
      ],
    })
    expect(s.groups).toHaveLength(1)
    expect(s.groups[0].items[0]).toEqual({ name: 'TaskbarUtil', version: '2026.08.27.1927', detail: undefined })
    expect(s.context).toContainEqual({ label: 'Duration', value: '1m 57s' })
  })

  it('lists the packages a removal run names, and does not call them installs', () => {
    // Munki reports no version for a removal, so its packages arrive as "Name": "".
    const s = summarizeEventPayload({ FleetMate: '', MunkiReport: '' })
    expect(s.groups.map(g => [g.label, g.tone])).toEqual([['Removed', 'neutral']])
    expect(s.groups[0].items.map(i => i.name)).toEqual(['FleetMate', 'MunkiReport'])
  })

  it('lists removed_items under Removed', () => {
    const s = summarizeEventPayload({
      action: 'remove',
      count: 2,
      removed_items: [{ name: 'FleetMate', version: '2026.07.18.1820' }, { name: 'MunkiReport' }],
    })
    expect(s.groups.map(g => [g.label, g.tone])).toEqual([['Removed', 'neutral']])
    expect(s.groups[0].items).toHaveLength(2)
  })

  it('still reads a flat install map, and ignores a blank field beside real versions', () => {
    const s = summarizeEventPayload({ Teams: '26213.1006.5011.1671', BBEdit: '16.0.3', clientIdentifier: '' })
    expect(s.groups.map(g => [g.label, g.tone])).toEqual([['Installed', 'success']])
    expect(s.groups[0].items.map(i => i.name)).toEqual(['Teams', 'BBEdit'])
  })

  it('separates failed and warning items by tone', () => {
    const s = summarizeEventPayload({
      failed_items: [{ name: 'RenderingManager', version: '2026.08.27.1706' }],
      warning_items: [{ name: 'AmdAdrenalinDriver', version: '26.3.1.0' }],
    })
    expect(s.groups.map(g => [g.label, g.tone])).toEqual([['Warnings', 'warning'], ['Failed', 'error']])
  })

  it('drops installer progress ticks from a semicolon-joined errors string', () => {
    const s = summarizeEventPayload({
      errors: [
        '------------------------------------------------------------------------------',
        'installer: Package name is Microsoft Defender',
        'installer:PHASE:Preparing for installation',
        'installer:%3.726477',
        'installer:%84.876000',
      ].join('; '),
    })
    expect(s.messages.map(m => m.text)).toEqual(['installer: Package name is Microsoft Defender'])
    expect(s.suppressedMessageCount).toBe(4)
  })

  it('keeps a line when the output was nothing but progress', () => {
    const s = summarizeEventPayload({ errors: 'installer:%12.0; installer:%99.0' })
    expect(s.messages).toHaveLength(1)
    expect(s.suppressedMessageCount).toBe(1)
  })

  it('keeps genuine multi-part error text intact', () => {
    const s = summarizeEventPayload({
      errors: 'HTTP Error downloading CSV: 000 (all sources tried); This could be a network connectivity issue',
    })
    expect(s.messages).toHaveLength(2)
    expect(s.suppressedMessageCount).toBe(0)
  })

  it('reports an empty summary for a payload with nothing to show', () => {
    expect(summarizeEventPayload(null).isEmpty).toBe(true)
    expect(summarizeEventPayload({ moduleData: { inventory: {} } }).isEmpty).toBe(true)
  })
})
