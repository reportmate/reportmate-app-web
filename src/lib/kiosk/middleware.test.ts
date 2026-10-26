/** @jest-environment node */

import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import middleware from '../../../middleware'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
  encode: jest.fn().mockResolvedValue('renewed-viewer-jwt'),
}))

const paths = [
  '/api/v1/dashboard/insights',
  '/api/v1/dashboard/insights/osCurrency?platform=macOS',
  '/api/v1/dashboard/insights/appUsage?platform=all&days=30',
]

function request(path: string, method = 'GET', cookie?: string) {
  return new NextRequest(`https://display.example${path}`, {
    method,
    headers: cookie ? { cookie } : undefined,
  })
}

describe('kiosk dashboard insight access', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NEXTAUTH_SECRET: 'test-session-secret',
      KIOSK_TOKENS: 'screen:test-kiosk-token-for-renewal',
    }
    jest.mocked(getToken).mockResolvedValue({ role: 'viewer' })
  })

  afterEach(() => {
    process.env = originalEnv
    jest.clearAllMocks()
  })

  it.each(paths)('lets an authenticated viewer read %s', async path => {
    for (const method of ['GET', 'HEAD']) {
      const response = await middleware(request(path, method))
      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    }
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('refuses viewer %s requests', async method => {
    for (const path of paths) {
      const response = await middleware(request(path, method))
      expect(response.status).toBe(403)
    }
  })

  it.each([
    '/api/v1/dashboard',
    '/api/v1/dashboard/admin',
    '/api/v1/dashboard/insights-admin',
    '/api/admin/devices/bulk-delete',
  ])('does not grant access to %s', async path => {
    expect((await middleware(request(path))).status).toBe(403)
  })

  it.each(paths)('refuses an anonymous read of %s', async path => {
    jest.mocked(getToken).mockResolvedValue(null)
    expect((await middleware(request(path))).status).toBe(401)
  })

  it('renews an expired viewer session for an insight read using a valid kiosk cookie', async () => {
    jest.mocked(getToken).mockResolvedValue(null)
    const response = await middleware(request(paths[1], 'GET', 'reportmate-kiosk=test-kiosk-token-for-renewal'))
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.cookies.get('next-auth.session-token')?.value).toBe('renewed-viewer-jwt')
  })

  it('refuses mutations even when a valid kiosk cookie can renew the session', async () => {
    jest.mocked(getToken).mockResolvedValue(null)
    const response = await middleware(request(paths[1], 'POST', 'reportmate-kiosk=test-kiosk-token-for-renewal'))
    expect(response.status).toBe(403)
    expect(response.cookies.get('next-auth.session-token')).toBeUndefined()
  })
})
