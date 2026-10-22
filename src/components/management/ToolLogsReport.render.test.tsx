import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import fixture from '../../lib/management/__fixtures__/tool-logs.json'
import { clearCache } from '../../lib/data-cache'
import { NOT_DEPLOYED, ToolLogsReport } from './ToolLogsReport'

let mockSearch = new URLSearchParams()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => '/management',
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearch,
}))

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response)

const setUrl = (qs: string) => {
  mockSearch = new URLSearchParams(qs)
  window.history.replaceState(null, '', qs ? `/management?${qs}` : '/management')
}

beforeEach(() => {
  clearCache()
  mockReplace.mockReset()
  setUrl('')
  global.fetch = jest.fn(() => json(200, fixture)) as jest.Mock
})

const lastReplace = () => mockReplace.mock.calls.at(-1)?.[0] as string | undefined

describe('ToolLogsReport', () => {
  it('renders the tools, messages and devices from the fixture without the MDM agent', async () => {
    render(<ToolLogsReport />)
    expect(screen.getByTestId('tool-logs-skeleton')).toBeTruthy()
    await screen.findByText('Sample Mac 1')
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/management/logs/fleet?hours=24', expect.anything())
    expect(screen.getByRole('link', { name: 'Management Tools Logs' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Munki' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cimian' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'MDM' })).toBeNull()
    expect(screen.queryByText('Sample PC 3')).toBeNull()
    expect(screen.queryByText('Enrollment session failed')).toBeNull()
    expect(screen.getAllByTestId('tool-trend').length).toBe(3)
    expect(screen.getAllByText('Failed to download catalog production')).toHaveLength(1)
    expect(screen.queryByTestId('devices-truncated')).toBeNull()
  })

  it('notes when the API stopped at its device limit', async () => {
    global.fetch = jest.fn(() => json(200, { ...fixture, devicesTruncated: true })) as jest.Mock
    render(<ToolLogsReport />)
    expect((await screen.findByTestId('devices-truncated')).textContent).toMatch(/Showing the first 5 devices/)
  })

  it('reads the card link, passes the message id to the API and shows its text in the pill', async () => {
    setUrl('hours=24&tool=installs&level=error&platform=macOS&message=a1b2c3d4e5f6')
    render(<ToolLogsReport />)
    await screen.findByText('Sample Mac 1')
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/management/logs/fleet?hours=24&tool=installs&level=error&message=a1b2c3d4e5f6', expect.anything())
    expect(screen.getByText('Message: Failed to download catalog production')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Devices that logged this message' })).toBeTruthy()
    // hours=24 is the default, so writing the URL back drops it.
    await waitFor(() => expect(lastReplace()).toBe('/management?platform=macOS&tool=installs&level=error&message=a1b2c3d4e5f6'))
  })

  it('turns a message given as text into its id', async () => {
    setUrl('tool=installs&message=Failed%20to%20download%20catalog%20production')
    render(<ToolLogsReport />)
    await screen.findByText('Sample Mac 1')
    await waitFor(() => expect(lastReplace()).toBe('/management?tool=installs&message=a1b2c3d4e5f6'))
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/v1/management/logs/fleet?hours=24&tool=installs&message=a1b2c3d4e5f6', expect.anything()))
  })

  it('shows an {error} answer with Retry', async () => {
    global.fetch = jest.fn(() => json(200, { hours: 24, error: 'statement timeout' })) as jest.Mock
    render(<ToolLogsReport />)
    expect(await screen.findByText("Couldn't load: statement timeout")).toBeTruthy()
  })

  it('links each device to its Management tab on the tool and level', async () => {
    render(<ToolLogsReport />)
    const link = (await screen.findByText('Sample Mac 1')).closest('a')!
    expect(link.getAttribute('href')).toBe('/device/SAMPLE-MAC-0001?tab=management&tool=installs&level=error')
  })

  it('reads filters from the URL, shows them as pills and clears them', async () => {
    setUrl('tool=installs&level=error&hours=168&platform=mac')
    render(<ToolLogsReport />)
    await screen.findByText('Sample Mac 1')
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/management/logs/fleet?hours=168&tool=installs&level=error', expect.anything())
    expect(screen.getByText('Filters Active')).toBeTruthy()
    expect(screen.getByText('Errors only')).toBeTruthy()
    expect(screen.getByText('Last 7 days')).toBeTruthy()
    // level=error drops the warnings-only device and the reports tool.
    expect(screen.queryByText('Sample Mac 3')).toBeNull()
    expect(screen.queryByText('Sample PC 2')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Errors only' }))
    await waitFor(() => expect(lastReplace()).toBe('/management?platform=mac&tool=installs&hours=168'))

    fireEvent.click(screen.getByRole('button', { name: /Clear all/ }))
    await waitFor(() => expect(lastReplace()).toBe('/management?platform=mac'))
    expect(screen.queryByText('Filters Active')).toBeNull()
  })

  it('clicking a message filters to it and lists the devices that logged it', async () => {
    render(<ToolLogsReport />)
    const narrowed = { ...fixture, devices: fixture.devices.filter(d => d.serialNumber === 'SAMPLE-WIN-0001') }
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => json(200, url.includes('message=') ? narrowed : fixture))
    fireEvent.click(await screen.findByRole('button', { name: /Package hash mismatch for Firefox/ }))
    await waitFor(() => expect(lastReplace()).toBe('/management?tool=installs&message=0f9e8d7c6b5a'))
    expect(global.fetch).toHaveBeenLastCalledWith('/api/v1/management/logs/fleet?hours=24&tool=installs&message=0f9e8d7c6b5a', expect.anything())
    expect(screen.getByRole('heading', { name: 'Devices that logged this message' })).toBeTruthy()
    expect(screen.getByText('Message: Package hash mismatch for Firefox')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Sample Mac 1')).toBeNull())
    expect(screen.getByText('Sample PC 1')).toBeTruthy()
  })

  it('follows outside URL changes', async () => {
    const { rerender } = render(<ToolLogsReport />)
    await screen.findByText('Sample PC 2')
    act(() => setUrl('tool=reports'))
    rerender(<ToolLogsReport />)
    await waitFor(() => expect(screen.queryByText('Sample Mac 1')).toBeNull())
    expect(screen.getByText('Sample PC 2')).toBeTruthy()
  })

  it('sorts the devices table', async () => {
    render(<ToolLogsReport />)
    await screen.findByText('Sample Mac 1')
    const devicesTable = () => screen.getByRole('heading', { name: 'Devices' }).closest('section')!
    const names = () => within(devicesTable()).getAllByRole('link').filter(a => a.querySelector('div')).map(a => a.getAttribute('title'))
    expect(names()[0]).toBe('Sample PC 1')
    fireEvent.click(within(devicesTable()).getByRole('button', { name: 'Device' }))
    expect(names()).toEqual(['Sample Mac 1', 'Sample Mac 2', 'Sample Mac 3', 'Sample PC 1', 'Sample PC 2'])
  })

  it('shows "Not available on this server yet" with Retry on a 404', async () => {
    global.fetch = jest.fn(() => json(404, { error: 'not found' })) as jest.Mock
    render(<ToolLogsReport />)
    expect(await screen.findByText(`Couldn't load: ${NOT_DEPLOYED}`)).toBeTruthy()
    ;(global.fetch as jest.Mock).mockImplementation(() => json(200, fixture))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByText('Sample Mac 1')
  })

  it('shows the cached answer at once on return', async () => {
    const first = render(<ToolLogsReport />)
    await screen.findByText('Sample Mac 1')
    first.unmount()
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as jest.Mock
    render(<ToolLogsReport />)
    expect(screen.getByText('Sample Mac 1')).toBeTruthy()
    expect(screen.queryByTestId('tool-logs-skeleton')).toBeNull()
  })
})
