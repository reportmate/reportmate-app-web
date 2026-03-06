import { test, expect } from '@playwright/test'

/**
 * Frontend Route Smoke Tests
 *
 * Verifies every page in the Next.js app loads without crashing.
 * These catch broken imports, missing components, and server-side
 * rendering errors that silently break pages after code changes.
 *
 * Usage:
 *   npx playwright test --project=frontend-routes
 *   TEST_ENV=production npx playwright test --project=frontend-routes
 */

const KNOWN_SERIAL = process.env.TEST_DEVICE_SERIAL || '0F33V9G25083HJ'

test.describe('Core Pages', () => {

  test('/ - homepage loads', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBeLessThan(500)
    await expect(page).toHaveTitle(/ReportMate/i)
  })

  test('/dashboard - dashboard loads', async ({ page }) => {
    const res = await page.goto('/dashboard')
    expect(res?.status()).toBeLessThan(500)
  })

  test('/events - events page loads', async ({ page }) => {
    const res = await page.goto('/events')
    expect(res?.status()).toBeLessThan(500)
  })

  test('/settings - settings page loads', async ({ page }) => {
    const res = await page.goto('/settings')
    expect(res?.status()).toBeLessThan(500)
  })
})

test.describe('Device Detail Page', () => {

  test('/device/:serial - device detail loads', async ({ page }) => {
    const res = await page.goto(`/device/${KNOWN_SERIAL}`)
    expect(res?.status()).toBeLessThan(500)
    // Page should show something device-related, not an error page
    await page.waitForLoadState('networkidle')
  })
})

test.describe('Fleet Pages - /devices/*', () => {

  const fleetPages = [
    '/devices',
    '/devices/applications',
    '/devices/hardware',
    '/devices/installs',
    '/devices/inventory',
    '/devices/management',
    '/devices/network',
    '/devices/peripherals',
    '/devices/profiles',
    '/devices/security',
    '/devices/system',
    '/devices/identity',
  ]

  for (const route of fleetPages) {
    test(`${route} - loads without error`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(500)
    })
  }
})

test.describe('No Console Errors on Key Pages', () => {

  test('dashboard has no uncaught JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Filter out known benign errors (e.g. SignalR connection failures)
    const realErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('SignalR') && !e.includes('negotiate')
    )
    expect(realErrors).toEqual([])
  })

  test('device page has no uncaught JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`/device/${KNOWN_SERIAL}`)
    await page.waitForLoadState('networkidle')

    const realErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('SignalR') && !e.includes('negotiate')
    )
    expect(realErrors).toEqual([])
  })
})

test.describe('API Routes Return Valid JSON (via browser)', () => {

  test('/api/healthz returns JSON', async ({ page }) => {
    const res = await page.goto('/api/healthz')
    expect(res?.status()).toBe(200)
    const body = await page.textContent('body')
    expect(() => JSON.parse(body || '')).not.toThrow()
  })

  test('/api/dashboard returns JSON', async ({ page }) => {
    const res = await page.goto('/api/dashboard')
    expect(res?.status()).toBe(200)
    const body = await page.textContent('body')
    expect(() => JSON.parse(body || '')).not.toThrow()
  })

  test('/api/devices returns JSON', async ({ page }) => {
    const res = await page.goto('/api/devices')
    expect(res?.status()).toBe(200)
    const body = await page.textContent('body')
    expect(() => JSON.parse(body || '')).not.toThrow()
  })
})
