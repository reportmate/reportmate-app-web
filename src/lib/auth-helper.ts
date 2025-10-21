import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

/**
 * Check if the current request is authenticated
 * Returns the session if authenticated, or a 401 response if not
 */
export async function requireAuth() {
  const session = await getServerSession()
  
  if (!session) {
    return {
      session: null,
      unauthorizedResponse: NextResponse.json({
        error: 'Unauthorized',
        details: 'Authentication required',
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }
  }
  
  return {
    session,
    unauthorizedResponse: null
  }
}
