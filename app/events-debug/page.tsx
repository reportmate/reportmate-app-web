'use client'

import { useEffect, useState } from "react"

export default function EventsDebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAndDebug = async () => {
      try {
        // Test the API directly
        const response = await fetch('/api/events')
        const data = await response.json()
        
        setDebugData({
          responseOk: response.ok,
          status: response.status,
          data: data,
          eventsSample: data.events?.slice(0, 2),
          eventTimestamps: data.events?.map((e: any) => ({
            id: e.id,
            ts: e.ts,
            timestamp: e.timestamp,
            device: e.device,
            device_id: e.device_id
          })).slice(0, 3)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    fetchAndDebug()
  }, [])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Events API Debug</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {debugData && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">Response Status</h2>
            <p>OK: {debugData.responseOk ? 'Yes' : 'No'}</p>
            <p>Status: {debugData.status}</p>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">Data Structure</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-96">
              {JSON.stringify(debugData.data, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">Sample Events</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-96">
              {JSON.stringify(debugData.eventsSample, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">Timestamp Analysis</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(debugData.eventTimestamps, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
