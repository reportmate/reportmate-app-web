import { NextRequest } from 'next/server'
import { signIn } from 'next-auth/react'

export default async function handler(req: NextRequest) {
  // Automatically trigger Entra ID sign-in
  return signIn('azure-ad', { 
    callbackUrl: req.nextUrl.searchParams.get('callbackUrl') || '/dashboard',
    redirect: true 
  })
}
