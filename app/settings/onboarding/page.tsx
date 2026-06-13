import type { Metadata } from "next"
import { OnboardingWizard } from "../../../src/components/settings/OnboardingWizard"

export const metadata: Metadata = {
  title: "Setup",
  description: "First-time ReportMate setup",
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <OnboardingWizard />
    </div>
  )
}
