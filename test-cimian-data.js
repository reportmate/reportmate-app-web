console.log('Testing Cimian data structure for version and duration fields...')

// Simulated device data based on the attachment JSON structure
const deviceData = {
  modules: {
    installs: {
      cimian: {
        config: {
          version: "25.8.26.2231",
          SoftwareRepoURL: "https://cimian.ecuad.ca/deployment",
          ClientIdentifier: "Assigned/Staff/IT/B1115/RodChristiansen"
        },
        items: [
          {
            id: "ArticWolf",
            itemName: "ArticWolf",
            displayName: "ArticWolf",
            currentStatus: "Error",
            latestVersion: "1.2.3",
            installedVersion: "1.2.2",
            installCount: 5,
            failureCount: 3,
            recentAttempts: [
              {
                timestamp: "2025-08-26T22:01:19+00:00",
                status: "Failed",
                duration: "45s"
              }
            ]
          }
        ],
        pendingPackages: [
          "Chrome",
          "Cimian", 
          "CimianAuth",
          "CimianPreflight",
          "FortiClient-VPN",
          "Zoom"
        ],
        sessions: [
          {
            startTime: "2025-08-26T22:58:00+00:00",
            endTime: "2025-08-26T23:01:19+00:00",
            duration: "3m 19s",
            status: "Manual"
          }
        ],
        recentEvents: [
          {
            timestamp: "2025-08-26T23:01:19+00:00",
            level: "ERROR",
            package: "ArticWolf", 
            message: "Installation failed: Invalid certificate"
          }
        ],
        version: "25.8.26.2231",
        lastCheckIn: "2025-08-26T23:01:19+00:00"
      }
    }
  }
}

// Import the processing function (simulate it)
function processInstallsData(rawDevice) {
  const cimianData = rawDevice?.modules?.installs?.cimian || {}
  const cimianConfig = cimianData.config || {}
  
  console.log('🔍 Cimian Config Structure:', JSON.stringify(cimianConfig, null, 2))
  console.log('🔍 Cimian Sessions:', JSON.stringify(cimianData.sessions, null, 2))
  
  // Extract version from config or root
  const version = cimianData.version || cimianConfig.version || '1.0.0'
  console.log('📦 Extracted Version:', version)
  
  // Calculate duration from sessions
  let duration = 'Unknown'
  const sessions = cimianData.sessions || []
  if (sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1]
    console.log('⏱️ Last Session:', JSON.stringify(lastSession, null, 2))
    
    if (lastSession.duration) {
      duration = lastSession.duration
    } else if (lastSession.startTime && lastSession.endTime) {
      const start = new Date(lastSession.startTime)
      const end = new Date(lastSession.endTime)
      const durationMs = end.getTime() - start.getTime()
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      duration = `${minutes}m ${seconds}s`
    }
  }
  console.log('⏱️ Calculated Duration:', duration)
  
  // Process packages to check version extraction
  const cimianItems = cimianData.items || []
  console.log('\n📦 Package Version Analysis:')
  cimianItems.forEach(item => {
    console.log(`- ${item.itemName || item.displayName}:`)
    console.log(`  latestVersion: ${item.latestVersion || 'Not found'}`)
    console.log(`  installedVersion: ${item.installedVersion || 'Not found'}`)
    console.log(`  currentStatus: ${item.currentStatus}`)
  })
  
  return {
    version: version,
    duration: duration,
    packages: cimianItems
  }
}

console.log('\n=== PROCESSING CIMIAN DATA ===')
const result = processInstallsData(deviceData)
console.log('\n=== FINAL RESULTS ===')
console.log('Version:', result.version)
console.log('Duration:', result.duration)
console.log('Package count:', result.packages.length)
