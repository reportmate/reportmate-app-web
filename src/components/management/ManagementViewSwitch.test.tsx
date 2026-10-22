import React from 'react'
import { render, screen } from '@testing-library/react'
import { ManagementViewSwitch } from './ManagementViewSwitch'

let mockSearch = new URLSearchParams()
jest.mock('next/navigation', () => ({ useSearchParams: () => mockSearch }))

describe('ManagementViewSwitch', () => {
  it('links both views and keeps platform', () => {
    mockSearch = new URLSearchParams('platform=mac&provider=Apple')
    render(<ManagementViewSwitch current="logs" />)
    expect(screen.getByRole('link', { name: 'Enrollment' }).getAttribute('href')).toBe('/management?platform=mac')
    const logs = screen.getByRole('link', { name: 'Tools Logs' })
    expect(logs.getAttribute('href')).toBe('/management/logs?platform=mac')
    expect(logs.getAttribute('aria-current')).toBe('page')
  })

  it('links bare paths without a platform', () => {
    mockSearch = new URLSearchParams('')
    render(<ManagementViewSwitch current="enrollment" />)
    expect(screen.getByRole('link', { name: 'Tools Logs' }).getAttribute('href')).toBe('/management/logs')
    expect(screen.getByRole('link', { name: 'Enrollment' }).getAttribute('aria-current')).toBe('page')
  })
})
