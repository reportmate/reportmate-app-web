import React from 'react'
import { render, screen } from '@testing-library/react'
import { SecurityViewSwitch } from './SecurityViewSwitch'

let mockParams = new URLSearchParams('platform=mac')
jest.mock('next/navigation', () => ({ useSearchParams: () => mockParams }))

describe('SecurityViewSwitch (the Security header)', () => {
  it('is the title: three tabs, with only the platform carried across', () => {
    mockParams = new URLSearchParams('platform=mac&tab=vulnerabilities&cves=%5B%22CVE-2026-1000%22%5D')
    render(<SecurityViewSwitch current="vulnerabilities" />)
    const vulns = screen.getByRole('link', { name: 'Vulnerabilities' })
    expect(vulns.getAttribute('href')).toBe('/security?tab=vulnerabilities&platform=mac')
    expect(vulns.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Threat Detections' }).getAttribute('href')).toBe('/security?tab=threats&platform=mac')
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('href')).toBe('/security?platform=mac')
  })

  it('links the posture tab to the bare page', () => {
    mockParams = new URLSearchParams()
    render(<SecurityViewSwitch current="posture" />)
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('href')).toBe('/security')
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('aria-current')).toBe('page')
  })
})
