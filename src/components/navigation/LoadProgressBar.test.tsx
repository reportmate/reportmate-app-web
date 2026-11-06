import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { LoadProgressBar } from './LoadProgressBar'
import { trackedFetch } from '../../lib/data-cache'

describe('LoadProgressBar', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('counts sources loaded out of total, then hides', async () => {
    const resolvers: Array<() => void> = []
    global.fetch = jest.fn(() => new Promise<Response>(resolve => {
      resolvers.push(() => resolve({ ok: true } as Response))
    })) as unknown as typeof fetch
    render(<LoadProgressBar />)
    expect(screen.queryByTestId('load-progress')).toBeNull()

    let a: Promise<Response>, b: Promise<Response>
    act(() => { a = trackedFetch('/a'); b = trackedFetch('/b') })
    expect(screen.getByTestId('load-progress').getAttribute('aria-label')).toBe('Loading 0 of 2')

    await act(async () => { resolvers[0](); await a })
    expect(screen.getByTestId('load-progress').getAttribute('aria-label')).toBe('Loading 1 of 2')

    await act(async () => { resolvers[1](); await b })
    expect(screen.queryByTestId('load-progress')).toBeNull()
  })

  it('shows a background refresh as updating, without the count', async () => {
    let resolve!: () => void
    global.fetch = jest.fn(() => new Promise<Response>(r => { resolve = () => r({ ok: true } as Response) })) as unknown as typeof fetch
    render(<LoadProgressBar />)
    let p: Promise<Response>
    act(() => { p = trackedFetch('/c', undefined, { background: true }) })
    expect(screen.getByTestId('load-progress').getAttribute('aria-label')).toBe('Updating')
    expect(screen.queryByText(/Loading/)).toBeNull()
    await act(async () => { resolve(); await p })
  })
})

describe('LoadProgressBar text', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('draws only the bar, with no floating loading pill', () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch
    const { container } = render(<LoadProgressBar />)
    act(() => { void trackedFetch('/slow') })
    expect(screen.getByTestId('load-progress')).toBeTruthy()
    expect(container.textContent).toBe('')
  })
})
