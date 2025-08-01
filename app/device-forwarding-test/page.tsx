import Link from 'next/link'

export default function DeviceForwardingTestPage() {
  const testDeviceIdentifiers = [
    {
      type: 'Serial Number',
      value: '0F33V9G25083HJ',
      description: 'Direct serial number access (no forwarding needed)'
    },
    {
      type: 'UUID',
      value: '79349310-287D-8166-52FC-0644E27378F7',
      description: 'UUID that should forward to serial number'
    },
    {
      type: 'Asset Tag',
      value: 'A004733',
      description: 'Asset tag that should forward to serial number'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            ReportMate Device Forwarding Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Test the new device identifier forwarding system
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            How it works
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              The new forwarding system allows you to access device pages using any of these identifiers:
            </p>
            <ul>
              <li><strong>Serial Number</strong> - Direct access (no forwarding)</li>
              <li><strong>UUID</strong> - Automatically forwards to the serial number-based URL</li>
              <li><strong>Asset Tag</strong> - Automatically forwards to the serial number-based URL</li>
            </ul>
            <p>
              When you visit <code>/device/UUID</code> or <code>/device/ASSET_TAG</code>, 
              the system will automatically resolve the identifier and redirect you to 
              <code>/device/SERIAL_NUMBER</code>.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Links
          </h2>
          
          {testDeviceIdentifiers.map((identifier, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {identifier.type}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {identifier.description}
                  </p>
                  <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {identifier.value}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/device/${encodeURIComponent(identifier.value)}`}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Test Device Page
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                  <Link
                    href={`/api/device/resolve/${encodeURIComponent(identifier.value)}`}
                    className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Test API
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Testing Notes
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc list-inside space-y-1">
                  <li>Serial number links should load directly without redirection</li>
                  <li>UUID and Asset Tag links should automatically redirect to the serial number URL</li>
                  <li>The API endpoints return JSON with resolution information</li>
                  <li>Check the browser's network tab to see the redirect behavior</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
