import { Metadata } from 'next'
import ClientDeviceDetailPage from './ClientDeviceDetailPage'
import { getInternalApiHeaders } from '@/lib/api-auth'

// Force dynamic rendering as we depend on route params
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ deviceId: string }>
}

async function getDevice(deviceId: string) {
  // Use internal API URL for server-side fetch (avoids Front Door round trip)
  const baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
  if (!baseUrl) {
    console.error('API_BASE_URL is not configured; cannot fetch device metadata')
    return null
  }
  
  try {
    const res = await fetch(`${baseUrl}/api/v1/device/${encodeURIComponent(deviceId)}`, {
      headers: getInternalApiHeaders(),
      next: { revalidate: 30 }
    })
    
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error("Failed to fetch device for metadata", error)
    return null
  }
}

export async function generateMetadata(
  props: Props
): Promise<Metadata> {
  const params = await props.params
  const id = params.deviceId
 
  // fetch data
  const device = await getDevice(id)
 
  const name = device?.device?.name
  if (name) {
    return {
        title: name,
    }
  }

  return {
    title: `Device ${id}`,
  }
}

export default function Page() {
  return <ClientDeviceDetailPage />
}
