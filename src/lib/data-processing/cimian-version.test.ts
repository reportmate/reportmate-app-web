import {
  normalizeCimianVersion,
  compareCimianVersion,
  isCimianVersionOlder,
} from './cimian-version'

describe('normalizeCimianVersion', () => {
  it('decodes the canonical YYYY.MM.DD.HHMM stamp', () => {
    const v = normalizeCimianVersion('2026.07.20.0632')
    expect(v).not.toBeNull()
    expect(v!.canonical).toBe('2026.07.20.0632')
    expect(v!.sortKey).toBe(202607200632)
    expect([v!.year, v!.month, v!.day, v!.hour, v!.minute]).toEqual([2026, 7, 20, 6, 32])
  })

  it('decodes the legacy 3-component YYYY.M.DDHH stamp (day+hour merged, no minutes)', () => {
    // '2026.7.2006' is the same build day as '2026.07.20.06xx', rendered lossily.
    expect(normalizeCimianVersion('2026.7.2006')!.canonical).toBe('2026.07.20.0600')
    expect(normalizeCimianVersion('2026.6.2418')!.canonical).toBe('2026.06.24.1800')
    expect(normalizeCimianVersion('2026.6.2405')!.canonical).toBe('2026.06.24.0500')
    expect(normalizeCimianVersion('2026.6.511')!.canonical).toBe('2026.06.05.1100')
  })

  it('decodes a plain YYYY.M.D calendar version (day <= 31, no time)', () => {
    expect(normalizeCimianVersion('2026.7.5')!.canonical).toBe('2026.07.05.0000')
    expect(normalizeCimianVersion('2026.12.31')!.canonical).toBe('2026.12.31.0000')
  })

  it('canonicalizes the entire real fleet spread without error', () => {
    // Every distinct reported cimian.version observed across 388 Windows devices
    // (2026-07-21 ReportMate snapshot). Every one must normalize.
    const fleet = [
      '2026.07.20.0632', '2026.06.24.0519', '2026.06.05.0221', '2026.04.26.2107',
      '2026.04.13.2237', '2026.01.20.1609', '2026.05.11.0458', '2026.07.19.0009',
      '2025.12.17.2120', '2026.03.20.1254', '2025.12.02.1418', '2026.06.11.0805',
      '2026.06.23.1256', '2026.7.2006', '2026.03.04.1302', '2026.02.09.1654',
      '2025.09.13.2245', '2026.06.04.1224', '2026.06.10.0143', '2026.04.28.2228',
      '2026.6.2418', '2026.04.29.1322', '2026.04.30.0957', '2025.11.28.1730',
      '2026.05.05.2058', '2025.11.24.1307', '2026.6.2405', '2026.02.23.2113',
      '2026.04.28.1256', '2026.04.28.1037', '2026.6.511', '2026.06.20.0050',
    ]
    for (const v of fleet) {
      const n = normalizeCimianVersion(v)
      expect(n).not.toBeNull()
      // canonical round-trips: re-normalizing the canonical form is stable.
      expect(normalizeCimianVersion(n!.canonical)!.sortKey).toBe(n!.sortKey)
    }
  })

  it('rejects non-Cimian version shapes (returns null so callers can fall back)', () => {
    expect(normalizeCimianVersion('1.2.3')).toBeNull()          // semver
    expect(normalizeCimianVersion('10.0.22621')).toBeNull()     // Windows build
    expect(normalizeCimianVersion('139.0.7258.139')).toBeNull() // Chrome
    expect(normalizeCimianVersion('26.7.2118')).toBeNull()      // MSI YY form (out of scope)
    expect(normalizeCimianVersion('2.55.0.windows.1')).toBeNull()
    expect(normalizeCimianVersion('2026.07.20.0632-beta1')).toBeNull()
  })

  it('rejects empty / null / malformed input', () => {
    expect(normalizeCimianVersion(null)).toBeNull()
    expect(normalizeCimianVersion(undefined)).toBeNull()
    expect(normalizeCimianVersion('')).toBeNull()
    expect(normalizeCimianVersion('   ')).toBeNull()
    expect(normalizeCimianVersion('?')).toBeNull()
    expect(normalizeCimianVersion('2026')).toBeNull()          // too few components
    expect(normalizeCimianVersion('2026.7')).toBeNull()        // too few components
    expect(normalizeCimianVersion('2026.13.01.0000')).toBeNull() // month out of range
    expect(normalizeCimianVersion('2026.7.99')).toBeNull()     // 32..99: neither day nor DDHH
    expect(normalizeCimianVersion('2099.07.20.0632')).not.toBeNull()
    expect(normalizeCimianVersion('2101.07.20.0632')).toBeNull() // year out of range
    expect(normalizeCimianVersion('2026.07.20.2560')).toBeNull() // minute 60 invalid
    expect(normalizeCimianVersion('2026.07.20.2400')).toBeNull() // hour 24 invalid
  })
})

describe('compareCimianVersion', () => {
  it('orders the merged 3-component form correctly against the 4-component form', () => {
    // The bug this fixes: naive element-wise compare judges 2026.7.2006 as NEWER.
    // 2026.7.2006 -> 06:00 that day; 2026.07.20.0632 -> 06:32 same day -> older.
    expect(compareCimianVersion('2026.7.2006', '2026.07.20.0632')).toBe(-1)
    expect(isCimianVersionOlder('2026.7.2006', '2026.07.20.0632')).toBe(true)
  })

  it('sorts the whole fleet chronologically', () => {
    const fleet = [
      '2026.07.20.0632', '2026.06.24.0519', '2025.09.13.2245', '2026.7.2006',
      '2026.6.511', '2026.01.20.1609', '2026.06.20.0050', '2026.6.2418',
    ]
    const sorted = [...fleet].sort(compareCimianVersion)
    expect(sorted).toEqual([
      '2025.09.13.2245', // 2025-09-13
      '2026.01.20.1609', // 2026-01-20
      '2026.6.511',      // 2026-06-05 11:00
      '2026.06.20.0050', // 2026-06-20 00:50
      '2026.06.24.0519', // 2026-06-24 05:19  (earlier hour, so precedes 2418)
      '2026.6.2418',     // 2026-06-24 18:00
      '2026.7.2006',     // 2026-07-20 06:00
      '2026.07.20.0632', // 2026-07-20 06:32  (newest)
    ])
  })

  it('treats equal builds as equal and is symmetric', () => {
    expect(compareCimianVersion('2026.07.20.0632', '2026.07.20.0632')).toBe(0)
    expect(compareCimianVersion('2026.06.24.0519', '2026.07.20.0632')).toBe(-1)
    expect(compareCimianVersion('2026.07.20.0632', '2026.06.24.0519')).toBe(1)
  })

  it('sorts unparseable values below any parseable one', () => {
    expect(compareCimianVersion(null, '2026.07.20.0632')).toBe(-1)
    expect(compareCimianVersion('2026.07.20.0632', null)).toBe(1)
    expect(compareCimianVersion(null, undefined)).toBe(0)
    expect(compareCimianVersion('garbage', '2026.07.20.0632')).toBe(-1)
  })
})
