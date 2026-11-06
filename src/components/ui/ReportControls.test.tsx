import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ExportCsvButton } from './ExportCsvButton'
import { LoadingProgress, ReportLoading } from './LoadingProgress'
import { SystemViewSwitch } from '../system/SystemViewSwitch'

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))

describe('ExportCsvButton', () => {
  it('describes the file in a tooltip, not in visible text beside the button', () => {
    const onClick = jest.fn()
    render(<ExportCsvButton onClick={onClick} details="Every field, filtered rows." />)
    const button = screen.getByRole('button', { name: 'Export CSV' })
    const tip = screen.getByRole('tooltip', { hidden: true })
    expect(button.getAttribute('aria-describedby')).toBe(tip.id)
    expect(tip.className).toContain('invisible')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('LoadingProgress', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows an exact count when the total is known', () => {
    render(<ReportLoading message="Loading report…" count={{ loaded: 50, total: 200, unit: 'rows' }} />)
    expect(screen.getByText('50 of 200 rows')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25')
  })

  it('creeps without a total, then says Still loading with Retry in place', () => {
    const onRetry = jest.fn()
    render(<LoadingProgress message="Loading report…" onRetry={onRetry} />)
    act(() => { jest.advanceTimersByTime(2_000) })
    expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeGreaterThan(0)
    act(() => { jest.advanceTimersByTime(8_000) })
    expect(screen.getByText('Still loading…')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Loading report…')).toBeTruthy()
  })
})

describe('SystemViewSwitch', () => {
  it('labels the tabs System and Background, keeping the tab keys', () => {
    render(<SystemViewSwitch current="os" />)
    expect(screen.getByRole('link', { name: 'System' }).getAttribute('href')).toBe('/system')
    expect(screen.getByRole('link', { name: 'Background' }).getAttribute('href')).toBe('/system?tab=background')
  })
})
