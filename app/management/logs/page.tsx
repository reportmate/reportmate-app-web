"use client"

export const dynamic = 'force-dynamic'

import { Suspense } from "react"
import { ToolLogsReport } from "@/src/components/management/ToolLogsReport"

export default function ManagementToolLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <ToolLogsReport />
    </Suspense>
  )
}
