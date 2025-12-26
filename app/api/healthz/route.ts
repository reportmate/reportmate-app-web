import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reportmate-frontend-dev',
    version: '1.0.0',
    api_base_url: process.env.API_BASE_URL || 'Not configured',
    has_internal_secret: !!process.env.API_INTERNAL_SECRET,
    node_env: process.env.NODE_ENV
  }, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
