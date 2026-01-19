import { Metadata } from 'next'
import ClientDashboard from './ClientDashboard'

// Force dynamic rendering and disable caching for Dashboard
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function Page() {
  return <ClientDashboard />
}
