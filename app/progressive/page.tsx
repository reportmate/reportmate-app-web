import ProgressiveDashboard from '../dashboard/progressive'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Progressive',
  description: 'Progressive loading dashboard',
}

export default function ProgressivePage() {
  return <ProgressiveDashboard />
}