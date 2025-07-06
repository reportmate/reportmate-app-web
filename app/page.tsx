"use client"

// Force dynamic rendering and disable caching for main page
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard')
}
