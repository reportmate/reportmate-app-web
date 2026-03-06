import { test, expect } from '@playwright/test'

/**
 * API Endpoint Tests - Next.js Proxy Layer
 *
 * Tests that the Next.js API routes correctly proxy to the FastAPI backend.
 * These run against the frontend (localhost or production domain) and verify
 * every /api/* route returns a valid response through the proxy.
 *
 * Usage:
 *   npx playwright test --project=api-endpoints
 *   TEST_ENV=production npx playwright test --project=api-endpoints
 */

const KNOWN_SERIAL = process.env.TEST_DEVICE_SERIAL || '0F33V9G25083HJ'

test.describe('Next.js Health & Metadata Routes', () => {

  test('GET /api/healthz - frontend health check', async ({ request }) => {
    const res = await request.get('/api/healthz')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('status')
  })

  test('GET /api/version - returns build info', async ({ request }) => {
    const res = await request.get('/api/version')
    expect(res.status()).toBe(200)
  })
})

test.describe('Next.js Dashboard & Device Routes', () => {

  test('GET /api/dashboard - returns consolidated dashboard data', async ({ request }) => {
    const res = await request.get('/api/dashboard')
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('devices')
    expect(json).toHaveProperty('totalDevices')
  })

  test('GET /api/devices - returns device list', async ({ request }) => {
    const res = await request.get('/api/devices')
    expect(res.status()).toBe(200)
    const json = await res.json()
    // Could be { devices: [...] } or just an array
    expect(json).toBeTruthy()
  })

  test('GET /api/device/:serial - returns single device', async ({ request }) => {
    const res = await request.get(`/api/device/${KNOWN_SERIAL}`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toBeTruthy()
  })

  test('GET /api/device/:serial/events - returns device events', async ({ request }) => {
    const res = await request.get(`/api/device/${KNOWN_SERIAL}/events`)
    expect(res.status()).toBe(200)
  })

  test('GET /api/device/:serial/installs/log - returns install log', async ({ request }) => {
    const res = await request.get(`/api/device/${KNOWN_SERIAL}/installs/log`)
    expect(res.status()).toBe(200)
  })

  test('GET /api/device/:serial/info - returns device info', async ({ request }) => {
    const res = await request.get(`/api/device/${KNOWN_SERIAL}/info`)
    expect(res.status()).toBe(200)
  })

  test('GET /api/device-names - returns name list', async ({ request }) => {
    const res = await request.get('/api/device-names')
    expect(res.status()).toBe(200)
  })
})

test.describe('Next.js Events Routes', () => {

  test('GET /api/events - returns events list', async ({ request }) => {
    const res = await request.get('/api/events')
    expect(res.status()).toBe(200)
  })
})

test.describe('Next.js Fleet Module Routes', () => {

  const moduleRoutes = [
    '/api/applications',
    '/api/hardware',
    '/api/network',
    '/api/security',
    '/api/system',
    '/api/peripherals',
  ]

  for (const route of moduleRoutes) {
    test(`GET ${route} - responds 200`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
    })
  }
})

test.describe('Next.js /api/modules/* Routes', () => {

  const modulesRoutes = [
    '/api/modules/applications',
    '/api/modules/hardware',
    '/api/modules/installs',
    '/api/modules/inventory',
    '/api/modules/management',
    '/api/modules/network',
    '/api/modules/security',
    '/api/modules/system',
    '/api/modules/peripherals',
    '/api/modules/identity',
    '/api/modules/devices-list',
    '/api/modules/chart-data',
    '/api/modules/security/certificates',
  ]

  for (const route of modulesRoutes) {
    test(`GET ${route} - responds 200`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
    })
  }
})

test.describe('Next.js /api/devices/* Sub-Routes', () => {

  const devicesSubRoutes = [
    '/api/devices/applications',
    '/api/devices/applications/usage',
    '/api/devices/applications/filters',
    '/api/devices/hardware',
    '/api/devices/installs',
    '/api/devices/installs/data',
    '/api/devices/installs/filters',
    '/api/devices/installs/progress',
    '/api/devices/events',
    '/api/devices/management',
  ]

  for (const route of devicesSubRoutes) {
    test(`GET ${route} - responds 200`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
    })
  }
})

test.describe('Next.js Stats Routes', () => {

  test('GET /api/stats - responds 200', async ({ request }) => {
    const res = await request.get('/api/stats')
    expect(res.status()).toBe(200)
  })

  test('GET /api/stats/installs - responds 200', async ({ request }) => {
    const res = await request.get('/api/stats/installs')
    expect(res.status()).toBe(200)
  })
})

test.describe('Next.js Device Module Sub-Routes', () => {

  const moduleNames = [
    'applications',
    'hardware',
    'installs',
    'inventory',
    'management',
    'network',
    'security',
    'system',
  ]

  for (const mod of moduleNames) {
    test(`GET /api/device/:serial/modules/${mod} - responds 200`, async ({ request }) => {
      const res = await request.get(`/api/device/${KNOWN_SERIAL}/modules/${mod}`)
      expect(res.status()).toBe(200)
    })
  }
})

test.describe('Next.js Cache Routes', () => {

  test('GET /api/cache/status - responds 200', async ({ request }) => {
    const res = await request.get('/api/cache/status')
    expect(res.status()).toBe(200)
  })
})
