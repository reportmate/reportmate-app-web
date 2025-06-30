/**
 * Health Check API Endpoint
 * Used by Azure Front Door health probes
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check - ensure the app is running
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'reportmate-frontend',
      version: process.env.npm_package_version || '1.0.0'
    }

    return NextResponse.json(healthStatus, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'reportmate-frontend',
      error: 'Internal server error'
    }
    
    return NextResponse.json(errorStatus, { status: 503 })
  }
}

// Support HEAD requests for health probes
export async function HEAD() {
  try {
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)
    return new NextResponse(null, { status: 503 })
  }
}
