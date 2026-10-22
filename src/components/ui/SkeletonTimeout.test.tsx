import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SkeletonTimeout } from './SkeletonTimeout'

describe('SkeletonTimeout', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows the skeleton for ten seconds, then Still loading with Retry', () => {
    const onRetry = jest.fn()
    render(<SkeletonTimeout onRetry={onRetry}><div>skeleton</div></SkeletonTimeout>)
    act(() => { jest.advanceTimersByTime(9_999) })
    expect(screen.getByText('skeleton')).toBeTruthy()
    act(() => { jest.advanceTimersByTime(1) })
    expect(screen.queryByText('skeleton')).toBeNull()
    expect(screen.getByText('Still loading…')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('skeleton')).toBeTruthy()
    act(() => { jest.advanceTimersByTime(10_000) })
    expect(screen.getByText('Still loading…')).toBeTruthy()
  })

  it('shows an error that came back straight away', () => {
    render(<SkeletonTimeout page error="HTTP 404"><div>skeleton</div></SkeletonTimeout>)
    expect(screen.queryByText('skeleton')).toBeNull()
    expect(screen.getByText("Couldn't load: HTTP 404")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
