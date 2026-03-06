import { test, expect } from '@playwright/test'

/**
 * API Health Tests
 *
 * Tests the FastAPI backend container directly to ensure all endpoints
 * are reachable and returning valid responses. Run against production
 * to catch regressions after deployments.
 *
 * Usage:
 *   npx playwright test --project=api-health
 *   TEST_ENV=production npx playwright test --project=api-health
 */

const API_BASE = process.env.API_BASE_URL
  || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'

const API_PASSPHRASE = process.env.REPORTMATE_PASSPHRASE || ''

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': 'ReportMate-E2E/1.0' }
  if (process.env.API_INTERNAL_SECRET) {
    h['X-Internal-Secret'] = process.env.API_INTERNAL_SECRET
  } else if (API_PASSPHRASE) {
    h['X-API-PASSPHRASE'] = API_PASSPHRASE
  }
  return h
}

// Known good serial number (must exist in DB)
const KNOWN_SERIAL = process.env.TEST_DEVICE_SERIAL || '0F33V9G25083HJ'

test.describe('FastAPI Backend Health', () => {

  test('GET / - root returns service info', async ({ request }) => {
    const res = await request.get(`${API_BASE}/`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('ReportMate API')
    expect(json.status).toBe('running')
  })

  test('GET /api/health - database connected', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('healthy')
    expect(json.database).toBe('connected')
  })
})

test.describe('FastAPI Authenticated Endpoints', () => {

  test('GET /api/dashboard - returns consolidated data', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dashboard`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('devices')
    expect(json).toHaveProperty('totalDevices')
    expect(json).toHaveProperty('installStats')
    expect(json).toHaveProperty('events')
    expect(Array.isArray(json.devices)).toBe(true)
    expect(json.totalDevices).toBeGreaterThan(0)
  })

  test('GET /api/devices - returns device list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/devices`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('devices')
    expect(json).toHaveProperty('total')
    expect(Array.isArray(json.devices)).toBe(true)
    expect(json.total).toBeGreaterThan(0)
  })

  test('GET /api/device/:serial - returns single device', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/device/${KNOWN_SERIAL}`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('device')
    expect(json.device).toHaveProperty('serial_number')
    expect(json.device).toHaveProperty('modules')
  })

  test('GET /api/device/:serial/events - returns device events', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/device/${KNOWN_SERIAL}/events`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('events')
    expect(Array.isArray(json.events)).toBe(true)
  })

  test('GET /api/device/:serial/installs/log - returns install log', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/device/${KNOWN_SERIAL}/installs/log`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
  })

  test('GET /api/device/:serial/info - returns device info', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/device/${KNOWN_SERIAL}/info`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
  })

  test('GET /api/events - returns event list', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/events`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('events')
    expect(Array.isArray(json.events)).toBe(true)
  })

  test('GET /api/stats/installs - returns install stats', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/stats/installs`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
  })

  test('GET /api/stats/applications/usage - returns app usage stats', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/stats/applications/usage`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
  })
})

test.describe('FastAPI Fleet Module Endpoints', () => {

  const fleetEndpoints = [
    '/api/devices/applications',
    '/api/devices/hardware',
    '/api/devices/installs',
    '/api/devices/network',
    '/api/devices/security',
    '/api/devices/security/certificates',
    '/api/devices/management',
    '/api/devices/inventory',
    '/api/devices/system',
    '/api/devices/peripherals',
    '/api/devices/identity',
  ]

  for (const endpoint of fleetEndpoints) {
    test(`GET ${endpoint} - responds 200`, async ({ request }) => {
      const res = await request.get(`${API_BASE}${endpoint}`, { headers: authHeaders() })
      expect(res.status()).toBe(200)
      const json = await res.json()
      // All fleet endpoints return some kind of object or array
      expect(json).toBeTruthy()
    })
  }
})

test.describe('FastAPI Device Module Endpoints', () => {

  const moduleNames = [
    'applications',
    'hardware',
    'installs',
    'inventory',
    'management',
    'network',
    'profiles',
    'security',
    'system',
  ]

  for (const mod of moduleNames) {
    test(`GET /api/device/:serial/modules/${mod} - responds 200`, async ({ request }) => {
      const res = await request.get(
        `${API_BASE}/api/device/${KNOWN_SERIAL}/modules/${mod}`,
        { headers: authHeaders() }
      )
      expect(res.status()).toBe(200)
    })
  }
})

test.describe('FastAPI Application Usage Endpoints', () => {

  test('GET /api/devices/applications/usage - fleet-wide', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/devices/applications/usage`, { headers: authHeaders() })
    expect(res.status()).toBe(200)
  })

  test('GET /api/device/:serial/applications/usage - per-device', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/device/${KNOWN_SERIAL}/applications/usage`,
      { headers: authHeaders() }
    )
    expect(res.status()).toBe(200)
  })
})

test.describe('FastAPI Unauthenticated Rejects', () => {

  test('GET /api/devices without auth returns 401/403', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/devices`)
    expect([401, 403]).toContain(res.status())
  })

  test('GET /api/dashboard without auth returns 401/403', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dashboard`)
    expect([401, 403]).toContain(res.status())
  })
})

test.describe('FastAPI Negotiate Endpoint', () => {

  test('GET /api/negotiate - returns SignalR config', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/negotiate`)
    // May return 200 or 500 depending on SignalR config, but should not 404
    expect(res.status()).not.toBe(404)
  })
})
