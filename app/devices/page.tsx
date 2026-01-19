// Force dynamic rendering and disable caching for devices page
export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import ClientDevicesPage from './ClientDevicesPage'

export const metadata: Metadata = {
  title: 'Devices',
  description: 'View all managed devices in fleet',
}

export default function DevicesPage() {
  return <ClientDevicesPage />
}
