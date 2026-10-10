import { isDemoMode } from './demo-mode'

describe('isDemoMode', () => {
  it('is off when neither variable is set', () => {
    expect(isDemoMode({})).toBe(false)
  })

  it('is on with DEMO_MODE=true', () => {
    expect(isDemoMode({ DEMO_MODE: 'true' })).toBe(true)
  })

  it('is on with NEXT_PUBLIC_DEMO_MODE=true', () => {
    expect(isDemoMode({ NEXT_PUBLIC_DEMO_MODE: 'true' })).toBe(true)
  })

  it('stays off for any value other than the string true', () => {
    for (const value of ['false', '1', 'TRUE', 'yes', '']) {
      expect(isDemoMode({ DEMO_MODE: value, NEXT_PUBLIC_DEMO_MODE: value })).toBe(false)
    }
  })

  it('reads the live environment by default', () => {
    const saved = process.env.DEMO_MODE
    try {
      process.env.DEMO_MODE = 'true'
      expect(isDemoMode()).toBe(true)
      process.env.DEMO_MODE = 'false'
      expect(isDemoMode()).toBe(false)
    } finally {
      if (saved === undefined) delete process.env.DEMO_MODE
      else process.env.DEMO_MODE = saved
    }
  })
})
