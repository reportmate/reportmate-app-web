import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PlatformFilterProvider, usePlatformFilter } from './PlatformFilterProvider'

const mockReplace = jest.fn()
let mockPathname = '/dashboard'
let mockSearchParams = new URLSearchParams('platform=mac')

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

function FilterControls() {
  const { platformFilter, setPlatformFilter } = usePlatformFilter()

  return (
    <>
      <output>{platformFilter}</output>
      <button onClick={() => setPlatformFilter('macOS')}>macOS</button>
      <button onClick={() => setPlatformFilter('Windows')}>Windows</button>
      <button onClick={() => setPlatformFilter('all')}>All</button>
    </>
  )
}

function renderProvider() {
  return render(
    <PlatformFilterProvider>
      <FilterControls />
    </PlatformFilterProvider>
  )
}

describe('PlatformFilterProvider URL synchronization', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    localStorage.clear()
    mockPathname = '/dashboard'
    mockSearchParams = new URLSearchParams('platform=mac')
  })

  it('settles on a user-selected platform without restoring the stale URL value', () => {
    const view = renderProvider()
    expect(screen.getByText('macOS', { selector: 'output' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Windows' }))
    expect(mockReplace).toHaveBeenLastCalledWith('/dashboard?platform=win')

    act(() => {
      mockSearchParams = new URLSearchParams('platform=win')
      view.rerender(
        <PlatformFilterProvider>
          <FilterControls />
        </PlatformFilterProvider>
      )
    })

    expect(screen.getByText('Windows', { selector: 'output' })).toBeTruthy()
    expect(mockReplace).toHaveBeenCalledTimes(1)
  })

  it('accepts a browser-driven URL change without rewriting it to stale state', () => {
    const view = renderProvider()
    mockReplace.mockClear()

    act(() => {
      mockSearchParams = new URLSearchParams('platform=win')
      view.rerender(
        <PlatformFilterProvider>
          <FilterControls />
        </PlatformFilterProvider>
      )
    })

    expect(screen.getByText('Windows', { selector: 'output' })).toBeTruthy()
    expect(localStorage.getItem('reportmate-platform-filter')).toBe('Windows')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('restores the persisted platform when navigation omits the parameter', () => {
    localStorage.setItem('reportmate-platform-filter', 'Windows')
    mockSearchParams = new URLSearchParams()

    renderProvider()

    expect(screen.getByText('Windows', { selector: 'output' })).toBeTruthy()
    expect(mockReplace).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/dashboard?platform=win')
  })
})
