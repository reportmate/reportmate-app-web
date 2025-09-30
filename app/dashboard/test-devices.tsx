"use client"

import { useEffect, useState } from "react"

export default function TestDevices() {
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState("Starting...")

  useEffect(() => {
    console.log('[TEST] useEffect is running!')
    setStatus("useEffect ran!")
    
    // Simple test without fetch
    setTimeout(() => {
      setCount(42)
      setStatus("Timer completed!")
      console.log('[TEST] Timer completed, count set to 42')
    }, 1000)
  }, [])

  return (
    <div>
      <h1>Simple Test</h1>
      <p>Count: {count}</p>
      <p>Status: {status}</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  )
}