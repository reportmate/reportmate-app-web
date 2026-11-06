import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SkeletonTimeout } from './SkeletonTimeout'

describe('SkeletonTimeout', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('keeps the skeleton and adds Still loading with Retry after ten seconds', () => {
    const onRetry = jest.fn()
    render(<SkeletonTimeout onRetry={onRetry}><div>skeleton</div></SkeletonTimeout>)
    act(() => { jest.advanceTimersByTime(9_999) })
    expect(screen.queryByText('Still loading…')).toBeNull()
    act(() => { jest.advanceTimersByTime(1) })
    expect(screen.getByText('skeleton')).toBeTruthy()
    expect(screen.getByText('Still loading…')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Still loading…')).toBeNull()
    act(() => { jest.advanceTimersByTime(10_000) })
    expect(screen.getByText('Still loading…')).toBeTruthy()
  })

  it('never replaces a page skeleton: the inline bar turns into Still loading in place', () => {
    render(<SkeletonTimeout page><div>page frame</div></SkeletonTimeout>)
    expect(screen.getByTestId('loading-progress')).toBeTruthy()
    expect(screen.getByText('Loading report data…')).toBeTruthy()
    act(() => { jest.advanceTimersByTime(10_000) })
    expect(screen.getByText('page frame')).toBeTruthy()
    expect(screen.getByText('Still loading…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('shows an error that came back straight away, keeping the frame', () => {
    render(<SkeletonTimeout page error="HTTP 404"><div>skeleton</div></SkeletonTimeout>)
    expect(screen.getByText('skeleton')).toBeTruthy()
    expect(screen.getByText("Couldn't load: HTTP 404")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
