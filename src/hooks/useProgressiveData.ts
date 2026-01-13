import { useState, useEffect } from 'react'

interface OSVersion {
  version: string
  count: number
}

interface Platform {
  platform: string
  count: number
}

interface ChartData {
  totalDevices: number
  sampledDevices: number
  charts: {
    osVersions: OSVersion[]
    platforms: Platform[]
  }
}

export const useDevicesList = () => {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/modules/devices-list', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        })

        if (!response.ok) {
          throw new Error(`Devices API returned ${response.status}`)
        }

        const data = await response.json()
        setDevices(data)
      } catch (error) {
        console.error('[useDevicesList] Error:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchDevices, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { devices, loading, error }
}

export const useChartData = () => {
  const [chartData, setChartData] = useState<ChartData>({
    totalDevices: 0,
    sampledDevices: 0,
    charts: { osVersions: [], platforms: [] }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/modules/chart-data', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        })

        if (!response.ok) {
          throw new Error(`Chart API returned ${response.status}`)
        }

        const data = await response.json()
        setChartData(data)
      } catch (error) {
        console.error('[useChartData] Error:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchChartData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { chartData, loading, error }
}