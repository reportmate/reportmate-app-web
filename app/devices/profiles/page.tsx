/**
 * @deprecated This page has been deprecated.
 * Profiles module has been integrated into the Management module.
 * Configuration profiles are now displayed in the Management tab of each device.
 */

import { redirect } from 'next/navigation'

export default function ProfilesPage() {
  // Redirect to the main devices page - profiles are now viewed per-device in Management tab
  redirect('/devices')
}
