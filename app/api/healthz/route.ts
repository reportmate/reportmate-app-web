import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reportmate-frontend-dev',
    version: '1.0.0',
    api_proxy: process.env.API_BASE_URL || 'Not configured'
  }, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
