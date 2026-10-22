import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { RefreshErrorBanner } from './RefreshErrorBanner'

describe('RefreshErrorBanner', () => {
  it('renders nothing without an error', () => {
    const { container } = render(<RefreshErrorBanner error={null} />)
    expect(container.textContent).toBe('')
  })

  it("says the refresh failed, offers Retry and shows when the data is from", () => {
    const onRetry = jest.fn()
    render(<RefreshErrorBanner error="HTTP 503" updatedAt={new Date(2026, 9, 22, 14, 5)} onRetry={onRetry} />)
    expect(screen.getByText("Couldn't refresh")).toBeTruthy()
    expect(screen.getByText(/Last updated/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
