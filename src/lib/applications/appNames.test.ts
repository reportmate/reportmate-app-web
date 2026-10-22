import { MAX_APP_NAME_LENGTH, normalizeAppNameForFilters, normalizeAppNameForReport } from './appNames'

const normalisers = { normalizeAppNameForReport, normalizeAppNameForFilters }

describe.each(Object.entries(normalisers))('%s', (_name, normalize) => {
  it('strips trailing versions as before', () => {
    expect(normalize('Blender 4.2.1')).toBe('Blender')
    expect(normalize('Sample Editor v2.10.3')).toBe('Sample Editor')
    expect(normalize('Sample Editor (12.3.4)')).toBe('Sample Editor')
  })

  it('finishes quickly on long adversarial input', () => {
    const inputs = [
      'App ' + '1.'.repeat(20_000) + 'x',
      'App 1' + '.1'.repeat(20_000) + '!',
      'App' + ' '.repeat(50_000) + 'x',
      'App (' + '1.1 '.repeat(10_000),
    ]
    for (const input of inputs) {
      const start = Date.now()
      normalize(input)
      expect(Date.now() - start).toBeLessThan(100)
    }
  })

  it(`caps input at ${MAX_APP_NAME_LENGTH} characters`, () => {
    expect(normalize('A'.repeat(10_000)).length).toBeLessThanOrEqual(MAX_APP_NAME_LENGTH)
  })
})
