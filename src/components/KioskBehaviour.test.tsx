import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { KioskBehaviour } from './KioskBehaviour'
import { useInsightLayout } from '../lib/modules/widgets/InsightWidgets'
import { DEFAULT_KIOSK_SETTINGS } from '../lib/settings/defaults'
import type { KioskSettings } from '../lib/settings/types'

let mockRole = 'viewer'
let mockPathname = '/dashboard'
let mockKiosk: Partial<KioskSettings> = {}
const mockSetTheme = jest.fn()

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { role: mockRole } }) }))
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('../providers/SettingsProvider', () => ({
  useSettingsOptional: () => ({ settings: { kiosk: mockKiosk } }),
}))
jest.mock('./theme-provider', () => ({ useTheme: () => ({ setTheme: mockSetTheme }) }))

function DashboardLayout() {
  return <output data-testid="layout">{useInsightLayout()}</output>
}

describe('kiosk dashboard fitting', () => {
  beforeEach(() => {
    mockRole = 'viewer'
    mockPathname = '/dashboard'
    mockKiosk = { idleMinutes: 0 }
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true })
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('1680'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))
  })

  it('defaults a 1920px display to the four-column layout', () => {
    render(<><DashboardLayout /><KioskBehaviour /></>)
    expect(DEFAULT_KIOSK_SETTINGS.fitDashboard).toBe(true)
    expect(Number(document.documentElement.dataset.kioskZoom)).toBeCloseTo(1920 / 2208)
    expect(screen.getByTestId('layout')).toHaveTextContent('wide')
  })

  it('allows subsequent browser zoom without refitting against the user', () => {
    render(<><DashboardLayout /><KioskBehaviour /></>)
    const initialZoom = document.documentElement.dataset.kioskZoom
    act(() => {
      window.innerWidth = 1600
      window.dispatchEvent(new Event('resize'))
    })
    expect(document.documentElement.dataset.kioskZoom).toBe(initialZoom)
    expect(screen.getByTestId('layout')).toHaveTextContent('desktop')
  })

  it('honors an explicitly selected percentage instead of fitting', () => {
    mockKiosk = { idleMinutes: 0, fitDashboard: false, zoom: 1.1 }
    render(<><DashboardLayout /><KioskBehaviour /></>)
    expect(document.documentElement.dataset.kioskZoom).toBe('1.1')
    expect(screen.getByTestId('layout')).toHaveTextContent('desktop')
  })

  it('keeps the configured scale on other kiosk pages', () => {
    mockPathname = '/events'
    render(<KioskBehaviour />)
    expect(document.documentElement.dataset.kioskZoom).toBe('1.25')
  })

  it('does not scale a signed-in staff session', () => {
    mockRole = 'admin'
    render(<KioskBehaviour />)
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('')
    expect(document.documentElement.dataset.kioskZoom).toBeUndefined()
  })

  it('removes kiosk scaling when the component unmounts', () => {
    const { unmount } = render(<KioskBehaviour />)
    unmount()
    expect(document.documentElement.style.getPropertyValue('zoom')).toBe('')
    expect(document.documentElement.dataset.kioskZoom).toBeUndefined()
  })
})
