import { csvCell, csvRow } from './csv'

describe('csvCell', () => {
  it('neutralises cells a spreadsheet would run as a formula', () => {
    expect(csvCell('=SUM(1,2)')).toBe(`"'=SUM(1,2)"`)
    expect(csvCell('+1+1')).toBe(`"'+1+1"`)
    expect(csvCell('-2+3')).toBe(`"'-2+3"`)
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
    expect(csvCell('\tcmd')).toBe(`"'\tcmd"`)
    expect(csvCell('\rcmd')).toBe(`"'\rcmd"`)
  })

  it('quotes everything and doubles inner quotes', () => {
    expect(csvCell('SAMPLE1')).toBe('"SAMPLE1"')
    expect(csvCell('a "quoted", value')).toBe('"a ""quoted"", value"')
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"')
    expect(csvCell(12)).toBe('"12"')
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
    expect(csvCell('mid=dle')).toBe('"mid=dle"')
  })

  it('builds a row', () => {
    expect(csvRow(['SAMPLE1', '=1+1', 3])).toBe(`"SAMPLE1","'=1+1","3"`)
  })
})
