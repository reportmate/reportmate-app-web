import { Metadata } from 'next'
import ClientDeviceDetailPage from './ClientDeviceDetailPage'

// Force dynamic rendering as we depend on route params
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ deviceId: string }>
}

async function getDevice(deviceId: string) {
  // Use env var for API URL
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io'
  
  try {
    const res = await fetch(`${baseUrl}/api/device/${deviceId}`, {
      next: { revalidate: 60 } // Cache for 60s
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
 
  if (device && device.name) {
    return {
        title: device.name,
    }
  }

  return {
    title: `Device ${id}`,
  }
}

export default function Page() {
  return <ClientDeviceDetailPage />
}
