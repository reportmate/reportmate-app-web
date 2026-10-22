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
    expect(screen.getByText('Loading 0 of 2')).toBeTruthy()

    await act(async () => { resolvers[0](); await a })
    expect(screen.getByText('Loading 1 of 2')).toBeTruthy()

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
