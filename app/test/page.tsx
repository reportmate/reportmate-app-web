"use client"

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>This is a simple test page to verify localhost access works.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  )
}
