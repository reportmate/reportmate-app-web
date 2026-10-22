import { barWidth, compactHours, countOf, fmtBytes, fmtCount, fmtNumber, fmtPercent, fmtPercentOf, fmtPlural, MISSING } from './format'

const BAD: unknown[] = [NaN, Infinity, -Infinity, -1, '12', null, undefined, {}, [], true]

describe('dashboard number formatting', () => {
  it('shows a dash for NaN, Infinity, negatives and non-numbers', () => {
    for (const v of BAD) {
      expect(countOf(v)).toBeNull()
      expect(fmtCount(v)).toBe(MISSING)
      expect(fmtNumber(v)).toBe(MISSING)
      expect(fmtPercent(v)).toBe(MISSING)
      expect(compactHours(v)).toBe(MISSING)
      expect(fmtBytes(v)).toBe(MISSING)
      expect(fmtPlural(v, 'device')).toBe(`${MISSING} devices`)
      expect(barWidth(v, 10)).toBe(0)
      expect(barWidth(5, v)).toBe(0)
      expect(fmtPercentOf(v, 10)).toBe('')
      expect(fmtPercentOf(5, v)).toBe('')
    }
  })

  it('formats real numbers', () => {
    expect(fmtCount(0)).toBe('0')
    expect(fmtCount(1234.4)).toBe('1,234')
    expect(fmtNumber(1.25)).toBe('1.3')
    expect(fmtPercent(79.4)).toBe('79%')
    expect(fmtPlural(1, 'device')).toBe('1 device')
    expect(fmtPlural(2500, 'device')).toBe('2,500 devices')
    expect(compactHours(328_025)).toBe('328k h')
    expect(fmtBytes(250e9)).toBe('250 GB')
    expect(fmtBytes(2e12)).toBe('2.0 TB')
    expect(barWidth(5, 10)).toBe(50)
    expect(barWidth(50, 10)).toBe(100)
    expect(fmtPercentOf(1, 4)).toBe('25%')
    expect(fmtPercentOf(1, 0)).toBe('')
  })
})
