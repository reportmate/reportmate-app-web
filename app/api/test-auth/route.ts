import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  console.log('[TEST-AUTH] Environment check...')
  
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID ? 'SET' : 'MISSING',
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ? 'SET' : 'MISSING',
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID ? 'SET' : 'MISSING',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST
  }
  
  console.log('[TEST-AUTH] Environment variables:', envCheck)
  
  // Try to import and check the auth configuration
  try {
    const { authOptions } = await import('@/lib/auth')
    console.log('[TEST-AUTH] Auth options loaded successfully')
    
    // Check if providers are available
    const providers = authOptions.providers
    console.log('[TEST-AUTH] Providers count:', providers?.length || 0)
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      providersCount: providers?.length || 0,
      message: 'Auth configuration loaded successfully'
    })
  } catch (error) {
    console.error('[TEST-AUTH] Error loading auth configuration:', error)
    return NextResponse.json({
      success: false,
      environment: envCheck,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to load auth configuration'
    }, { status: 500 })
  }
}