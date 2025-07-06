'use client'

import { useState, useEffect } from 'react'

export default function ApiTestPage() {
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState<string>('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchTime = new Date().toISOString()
      setTimestamp(fetchTime)
      
      console.log(`${fetchTime} - Testing API endpoint`)
      
      const response = await fetch('/api/devices', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      console.log(`${fetchTime} - Response status:`, response.status)
      console.log(`${fetchTime} - Response headers:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`${fetchTime} - Raw data:`, data)
      
      setApiResponse({
        data,
        metadata: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          isArray: Array.isArray(data),
          dataType: typeof data,
          length: Array.isArray(data) ? data.length : 'N/A',
          fetchedAt: response.headers.get('X-Fetched-At'),
          timestamp: fetchTime
        }
      })
    } catch (err) {
      console.error('API test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            API Test Page
          </h1>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh API'}
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            /api/devices Response Test
          </h2>
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Testing API endpoint...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {apiResponse && (
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Metadata:</h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(apiResponse.metadata, null, 2)}
                </pre>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data Summary:</h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p>Type: {apiResponse.metadata.dataType}</p>
                  <p>Is Array: {String(apiResponse.metadata.isArray)}</p>
                  <p>Length: {apiResponse.metadata.length}</p>
                  <p>Fetched At: {apiResponse.metadata.fetchedAt}</p>
                  <p>Test Timestamp: {apiResponse.metadata.timestamp}</p>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Raw Data:</h3>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-96">
                  {JSON.stringify(apiResponse.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
