import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      API_BASE_URL: process.env.API_BASE_URL,
      // Only server-side API_BASE_URL is used - no client-side API URL needed
    },
    timestamp: new Date().toISOString()
  })
}
