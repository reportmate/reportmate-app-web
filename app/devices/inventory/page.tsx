"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InventoryRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main devices page which now includes inventory functionality
    router.replace('/devices')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a7.646 7.646 0 100 15.292M12 4.354v15.292m0-15.292a7.646 7.646 0 010 15.292m0-15.292V19.646" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Redirecting to Devices...
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          The inventory is now integrated into the main devices page.
        </p>
      </div>
    </div>
  )
}
