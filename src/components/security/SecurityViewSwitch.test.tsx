import React from 'react'
import { render, screen } from '@testing-library/react'
import { SECURITY_REPORTS, SecurityViewSwitch, VulnerabilitiesViewSwitch } from './SecurityViewSwitch'

let mockParams = new URLSearchParams('platform=mac')
jest.mock('next/navigation', () => ({ useSearchParams: () => mockParams }))

describe('SecurityViewSwitch (the Security header)', () => {
  it('links all eight reports and carries only the platform across', () => {
    mockParams = new URLSearchParams('platform=mac&tab=vulnerabilities&cves=%5B%22CVE-2026-1000%22%5D')
    render(<SecurityViewSwitch current="vulnerabilities" />)
    const vulns = screen.getByRole('link', { name: 'Vulnerabilities' })
    expect(vulns.getAttribute('href')).toBe('/security?tab=vulnerabilities&platform=mac')
    expect(vulns.getAttribute('aria-current')).toBe('page')
    for (const [key, name] of Object.entries(SECURITY_REPORTS)) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(`/security?tab=${key}&platform=mac`)
    }
    expect(screen.queryByRole('link', { name: 'Threat Detections' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('href')).toBe('/security?platform=mac')
  })

  it('navigates between CVEs and threat detections inside Vulnerabilities', () => {
    mockParams = new URLSearchParams('platform=win&tab=vulnerabilities&view=threats&days=7')
    render(<VulnerabilitiesViewSwitch threats />)
    const threats = screen.getByRole('link', { name: 'Threat Detections' })
    expect(threats.getAttribute('href')).toBe('/security?tab=vulnerabilities&view=threats&platform=win')
    expect(threats.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'CVEs' }).getAttribute('href')).toBe('/security?tab=vulnerabilities&platform=win')
  })

  it('links the posture tab to the bare page', () => {
    mockParams = new URLSearchParams()
    render(<SecurityViewSwitch current="posture" />)
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('href')).toBe('/security')
    expect(screen.getByRole('link', { name: 'Security' }).getAttribute('aria-current')).toBe('page')
  })
})
