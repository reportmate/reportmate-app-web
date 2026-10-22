import React from 'react'
import { render, screen } from '@testing-library/react'
import { ManagementViewSwitch } from './ManagementViewSwitch'

let params = new URLSearchParams('platform=mac')
jest.mock('next/navigation', () => ({ useSearchParams: () => params }))

describe('ManagementViewSwitch (the Management header)', () => {
  it('is the title: two tabs, with the platform carried across', () => {
    params = new URLSearchParams('platform=mac')
    render(<ManagementViewSwitch current="logs" />)
    const logs = screen.getByRole('link', { name: 'Management Tools Logs' })
    expect(logs.getAttribute('href')).toBe('/management?tab=logs&platform=mac')
    expect(logs.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Device Management Service' }).getAttribute('href')).toBe('/management?platform=mac')
    expect(screen.queryByText('Enrollment')).toBeNull()
  })

  it('marks Device Management Service current on the enrollment tab', () => {
    params = new URLSearchParams()
    render(<ManagementViewSwitch current="enrollment" />)
    expect(screen.getByRole('link', { name: 'Device Management Service' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Management Tools Logs' }).getAttribute('href')).toBe('/management?tab=logs')
  })
})
