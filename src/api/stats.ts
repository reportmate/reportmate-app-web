/**
 * Statistics API Client
 * Provides aggregated statistics for dashboard widgets
 */

export interface InstallStats {
  devicesWithErrors: number
  devicesWithWarnings: number
  totalFailedInstalls: number
  totalWarnings: number
  lastUpdated: string
}

/**
 * Fetch aggregated install statistics from the API.
 * Returns pre-computed counts without transferring full installs data.
 * 
 * @returns Promise<InstallStats> - Aggregated statistics
 * @throws Error if the API request fails
 */
export async function getInstallStats(): Promise<InstallStats> {
  const response = await fetch('/api/stats/installs', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Always get fresh stats
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch install stats: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch install statistics with error handling and fallback.
 * Returns zero counts if the API fails.
 * 
 * @returns Promise<InstallStats> - Statistics or fallback values
 */
export async function getInstallStatsSafe(): Promise<InstallStats> {
  try {
    return await getInstallStats()
  } catch (error) {
    console.error('Failed to fetch install stats:', error)
    // Return zero counts as fallback
    return {
      devicesWithErrors: 0,
      devicesWithWarnings: 0,
      totalFailedInstalls: 0,
      totalWarnings: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}
