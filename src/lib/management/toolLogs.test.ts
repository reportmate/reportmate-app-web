import fixture from './__fixtures__/tool-logs.json'
import {
  deviceLogHref,
  filterToolLogs,
  hourOrIso,
  isExcludedTool,
  isMessageId,
  matchMessage,
  parseToolLogsParams,
  parseToolLogsReport,
  reportError,
  toolLogsApiQuery,
  toolLogsDevicesCsv,
  trendBuckets,
  writeToolLogsParams,
  EMPTY_TOOL_LOG_FILTERS,
} from './toolLogs'

const report = parseToolLogsReport(fixture)

describe('parseToolLogsReport', () => {
  it('reads the window and generation time', () => {
    expect(report.windowHours).toBe(24)
    expect(report.generatedAt).toBe('2026-10-22T18:00:00+00:00')
    expect(report.devicesTruncated).toBe(false)
    expect(parseToolLogsReport({ ...fixture, devicesTruncated: true }).devicesTruncated).toBe(true)
  })

  it('treats an {error} answer as a failure', () => {
    expect(reportError({ hours: 24, error: 'statement timeout' })).toBe('statement timeout')
    expect(reportError(fixture)).toBeNull()
  })

  it('drops the MDM agent root from tools, messages, devices and trend', () => {
    expect(isExcludedTool('mdm')).toBe(true)
    expect(isExcludedTool(' MDM ')).toBe(true)
    expect(report.tools.map(t => t.tool)).not.toContain('mdm')
    expect(report.messages.map(m => m.tool)).not.toContain('mdm')
    expect(report.devices.map(d => d.tool)).not.toContain('mdm')
    expect(report.devices.map(d => d.serialNumber)).not.toContain('SAMPLE-WIN-0003')
  })

  it('reads the API tool rows, with platform null for tools that are the same on both', () => {
    const reports = report.tools.find(t => t.tool === 'reports')!
    expect(reports).toMatchObject({ name: 'ReportMate', platform: null, devicesWithErrors: 1, errorLines: 3, lastSeen: '2026-10-22T11:00:00Z' })
    const cimian = report.tools.find(t => t.tool === 'installs' && t.platform === 'Windows')!
    expect(cimian).toMatchObject({ name: 'Cimian', lastSeen: '2026-10-22T16:00:00Z' })
    expect(cimian.trend).toEqual([
      { hour: '2026-10-22T10', errors: 4, warnings: 1 },
      { hour: '2026-10-22T16', errors: 5, warnings: 1 },
    ])
  })

  it('reads messages with their API ids', () => {
    expect(report.messages[0]).toMatchObject({
      id: 'a1b2c3d4e5f6', message: 'Failed to download catalog production', tool: 'installs', name: 'Munki',
      devices: 3, lines: 8, level: 'error', lastSeen: '2026-10-22T17:00:00Z',
    })
    expect(report.messages.map(m => m.id)).toEqual(['a1b2c3d4e5f6', '112233445566', '0f9e8d7c6b5a'])
  })

  it('reads devices', () => {
    expect(report.devices.find(d => d.serialNumber === 'SAMPLE-WIN-0001')).toMatchObject({
      deviceName: 'Sample PC 1', platform: 'Windows', tool: 'installs', name: 'Cimian', errors: 9, warnings: 2, lastAt: '2026-10-22T16:00:00Z',
    })
    expect(report.devices).toHaveLength(5)
  })

  it('still reads snake_case, hour keys, a separate trend list and messages without ids', () => {
    const r = parseToolLogsReport({
      windowHours: 168,
      tools: [{ tool: 'installs', platform: 'Windows', devices_with_errors: 2, error_lines: 9, last_hour: '2026-10-22T16' }],
      trend: [{ tool: 'installs', platform: 'Windows', hour: '2026-10-22T10', errors: 4, warnings: 1 }, { tool: 'mdm', hour: '2026-10-22T10', errors: 9 }],
      messages: [
        { message: '2026-10-22 13:04:11 -07:00 [ERR] Failed to download catalog production', tool: 'installs', devices: 2, lines: 6 },
        { message: '[ERR] Failed to download catalog production', tool: 'installs', devices: 1, lines: 2 },
        { message: 'WARN: Package hash mismatch', tool: 'installs', level: 'warning', devices: 1, lines: 1 },
      ],
      devices: [{ serial: 'SAMPLE-X', name: 'X', tool: 'installs', errors: 1, messages: ['[ERR] Failed to download catalog production'] }],
    })
    expect(r.windowHours).toBe(168)
    expect(r.tools[0]).toMatchObject({ name: 'Cimian', devicesWithErrors: 2, errorLines: 9, lastSeen: '2026-10-22T16:00:00Z' })
    expect(r.tools[0].trend).toEqual([{ hour: '2026-10-22T10', errors: 4, warnings: 1 }])
    expect(r.messages[0]).toMatchObject({ id: 'Failed to download catalog production', devices: 3, lines: 8 })
    expect(r.messages[1].level).toBe('warning')
    expect(r.devices[0]).toMatchObject({ serialNumber: 'SAMPLE-X', deviceName: 'X', messages: ['Failed to download catalog production'] })
  })

  it('reads the existing sweep shape (results, counts, patterns)', () => {
    const r = parseToolLogsReport({
      results: [{ serialNumber: 'SAMPLE-X', tool: 'state', counts: { error: 2, warning: 1 } }],
      patterns: [{ message: 'E: thing broke', tool: 'state', level: 'error', devices: 1, lines: 2 }],
    })
    expect(r.devices[0]).toMatchObject({ errors: 2, warnings: 1, name: 'Outset / StartSet' })
    expect(r.messages[0].id).toBe('thing broke')
  })

  it('yields an empty report for nonsense instead of throwing', () => {
    for (const bad of [null, 'x', 42, [], { tools: 'no' }]) {
      expect(parseToolLogsReport(bad)).toEqual({ windowHours: 24, generatedAt: null, tools: [], messages: [], devices: [], devicesTruncated: false })
    }
  })

  it('reads hour keys and ISO times', () => {
    expect(hourOrIso('2026-10-22T05')).toBe('2026-10-22T05:00:00Z')
    expect(hourOrIso('2026-10-22T05:30:00Z')).toBe('2026-10-22T05:30:00Z')
    expect(hourOrIso('nope')).toBeNull()
    expect(hourOrIso(undefined)).toBeNull()
  })
})

describe('URL parameters', () => {
  it('reads tool, level, hours and message, dropping mdm and bad values', () => {
    const f = parseToolLogsParams(new URLSearchParams('tool=installs,MDM,Reports&level=Error&hours=168&message=Failed%20to%20download&platform=mac'))
    expect(f).toEqual({ tools: ['installs', 'reports'], level: 'error', hours: 168, message: 'Failed to download' })
    expect(parseToolLogsParams(new URLSearchParams('level=info&hours=12'))).toEqual(EMPTY_TOOL_LOG_FILTERS)
  })

  it('writes non-defaults only and keeps other params such as platform', () => {
    expect(writeToolLogsParams('platform=mac&from=%2Fdashboard', EMPTY_TOOL_LOG_FILTERS)).toBe('platform=mac&from=%2Fdashboard')
    expect(writeToolLogsParams('platform=win&hours=168&tool=state', { tools: ['installs', 'reports'], level: 'warning', hours: 24, message: '' }))
      .toBe('platform=win&tool=installs,reports&level=warning')
    expect(writeToolLogsParams('', { tools: [], level: null, hours: 168, message: 'a b,c' })).toBe('hours=168&message=a+b,c')
  })

  it('round-trips', () => {
    const f = { tools: ['installs'], level: 'error' as const, hours: 168 as const, message: 'Failed to download catalog production' }
    expect(parseToolLogsParams(new URLSearchParams(writeToolLogsParams('', f)))).toEqual(f)
  })

  it('builds the API query with platform in API form', () => {
    expect(toolLogsApiQuery(EMPTY_TOOL_LOG_FILTERS, 'all')).toBe('hours=24')
    expect(toolLogsApiQuery({ tools: ['installs'], level: 'error', hours: 168, message: 'a1b2c3d4e5f6' }, 'macOS'))
      .toBe('hours=168&tool=installs&level=error&message=a1b2c3d4e5f6&platform=macOS')
  })

  it('sends the API one tool and only a message id', () => {
    expect(toolLogsApiQuery({ tools: ['installs', 'reports'], level: null, hours: 24, message: 'Some text' }, 'all')).toBe('hours=24')
    expect(isMessageId('a1b2c3d4e5f6')).toBe(true)
    expect(isMessageId('A1B2C3D4E5F6')).toBe(false)
    expect(isMessageId('Failed to download')).toBe(false)
  })

  it('reads the card\'s links, hours=24 included', () => {
    expect(parseToolLogsParams(new URLSearchParams('hours=24&tool=installs&level=error&platform=macOS&message=a1b2c3d4e5f6')))
      .toEqual({ tools: ['installs'], level: 'error', hours: 24, message: 'a1b2c3d4e5f6' })
  })
})

describe('filters and links', () => {
  it('matches a message by id, then by exact text, then case-insensitively', () => {
    expect(matchMessage(report.messages, 'a1b2c3d4e5f6')?.message).toBe('Failed to download catalog production')
    expect(matchMessage(report.messages, 'Failed to download catalog production')?.id).toBe('a1b2c3d4e5f6')
    expect(matchMessage(report.messages, 'failed TO download catalog PRODUCTION')?.id).toBe('a1b2c3d4e5f6')
    expect(matchMessage(report.messages, '2026-10-22 09:00:00 [ERR] Failed to download catalog production')?.id).toBe('a1b2c3d4e5f6')
    expect(matchMessage(report.messages, 'a1b2c3d4e5f6', ['reports'])).toBeUndefined()
    expect(matchMessage(report.messages, '')).toBeUndefined()
  })

  it('filters by tool, level, platform and message', () => {
    const byTool = filterToolLogs(report, { ...EMPTY_TOOL_LOG_FILTERS, tools: ['reports'] }, 'all')
    expect(byTool.tools.map(t => t.tool)).toEqual(['reports'])
    expect(byTool.devices.map(d => d.serialNumber)).toEqual(['SAMPLE-WIN-0002'])

    const warnings = filterToolLogs(report, { ...EMPTY_TOOL_LOG_FILTERS, level: 'warning' }, 'all')
    expect(warnings.devices.every(d => d.warnings > 0)).toBe(true)
    expect(warnings.tools.map(t => t.tool)).not.toContain('reports')

    const mac = filterToolLogs(report, EMPTY_TOOL_LOG_FILTERS, 'macOS')
    expect(mac.devices.every(d => d.platform === 'macOS')).toBe(true)
    // A tool the same on both platforms (platform null) stays in either view.
    expect(mac.tools.map(t => t.name)).toEqual(['Munki', 'ReportMate'])

    const byId = filterToolLogs(report, { ...EMPTY_TOOL_LOG_FILTERS, message: 'a1b2c3d4e5f6' }, 'all')
    expect(byId.messages.map(m => m.id)).toEqual(['a1b2c3d4e5f6'])
    // Devices carry no message list, so the API's narrowing stands.
    expect(byId.devices).toHaveLength(5)
    const byText = filterToolLogs(report, { ...EMPTY_TOOL_LOG_FILTERS, message: 'failed to download catalog production' }, 'all')
    expect(byText.messages.map(m => m.id)).toEqual(['a1b2c3d4e5f6'])
  })

  it('links a device to its Management tab on the tool and level', () => {
    expect(deviceLogHref({ serialNumber: 'SAMPLE-MAC-0001', tool: 'installs', errors: 3 }, null))
      .toBe('/device/SAMPLE-MAC-0001?tab=management&tool=installs&level=error')
    expect(deviceLogHref({ serialNumber: 'SAMPLE-MAC-0003', tool: 'installs', errors: 0 }, null))
      .toBe('/device/SAMPLE-MAC-0003?tab=management&tool=installs&level=warning')
    expect(deviceLogHref({ serialNumber: 'S', tool: 'state', errors: 5 }, 'warning')).toContain('level=warning')
  })

  it('buckets the trend hourly for a day and six-hourly for a week', () => {
    const end = Date.parse('2026-10-22T18:00:00Z')
    const trend = [{ hour: '2026-10-22T17', errors: 2, warnings: 1 }, { hour: '2026-10-20T00', errors: 9, warnings: 9 }]
    const day = trendBuckets(trend, 24, end)
    expect(day).toHaveLength(24)
    expect(day[22]).toEqual({ errors: 2, warnings: 1 })
    expect(day.reduce((s, b) => s + b.errors, 0)).toBe(2)
    const week = trendBuckets(trend, 168, end)
    expect(week).toHaveLength(28)
    expect(week.reduce((s, b) => s + b.errors, 0)).toBe(11)
  })

  it('exports devices to CSV with quoting', () => {
    const csv = toolLogsDevicesCsv([{ serialNumber: 'S1', deviceName: 'A "quoted" name', platform: 'macOS', tool: 'installs', name: 'Munki', errors: 1, warnings: 0, lastAt: null }])
    expect(csv.split('\n')[0]).toBe('Device Name,Serial Number,Platform,Tool,Tool Key,Errors,Warnings,Last At')
    expect(csv.split('\n')[1]).toBe('"A ""quoted"" name","S1","macOS","Munki","installs","1","0",""')
  })
})
