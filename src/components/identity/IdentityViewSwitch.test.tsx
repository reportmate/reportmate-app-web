import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { IdentityViewSwitch } from './IdentityViewSwitch'

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('platform=mac&tab=admins&search=admin'),
}))

it('links to the selected Admins Report as the third Identity tab', () => {
  render(<IdentityViewSwitch current="admins" />)
  const tabs = within(screen.getByRole('navigation', { name: 'Identity tabs' })).getAllByRole('link')
  expect(tabs.map(tab => tab.textContent)).toEqual(['Identity & Users', 'Sign-in & Recovery Posture', 'Admins Report'])
  expect(tabs[2].getAttribute('href')).toBe('/identity?tab=admins&platform=mac')
  expect(tabs[2].getAttribute('aria-current')).toBe('page')
})
