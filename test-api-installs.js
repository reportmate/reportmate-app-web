// Test to inspect the actual API response structure for Cimian installs
console.log('🔍 Testing API response structure for Cimian installs data...')

fetch('http://localhost:3000/api/device/0F33V9G25083HJ')
  .then(response => response.json())
  .then(data => {
    console.log('✅ API Response received')
    const device = data.device || data
    const installsModule = device?.modules?.installs
    const cimianData = installsModule?.cimian
    
    console.log('\n🔍 INSTALLS MODULE STRUCTURE:')
    console.log('- Has installs module:', !!installsModule)
    if (installsModule) {
      console.log('- Installs module keys:', Object.keys(installsModule))
    }
    
    console.log('\n🔍 CIMIAN DATA STRUCTURE:')
    console.log('- Has cimian data:', !!cimianData)
    if (cimianData) {
      console.log('- Cimian keys:', Object.keys(cimianData))
      console.log('- Cimian data sample:', JSON.stringify(cimianData, null, 2).substring(0, 1500))
      
      console.log('\n🔍 VERSION AND DURATION ANALYSIS:')
      console.log('- Cimian version:', cimianData.version)
      console.log('- Config version:', cimianData.config?.version)
      console.log('- Has sessions:', !!cimianData.sessions)
      console.log('- Sessions count:', cimianData.sessions?.length || 0)
      
      if (cimianData.sessions && cimianData.sessions.length > 0) {
        console.log('- First session:', JSON.stringify(cimianData.sessions[0], null, 2))
        console.log('- Last session:', JSON.stringify(cimianData.sessions[cimianData.sessions.length - 1], null, 2))
      }
      
      console.log('\n🔍 ITEMS ANALYSIS (for package versions):')
      console.log('- Has items:', !!cimianData.items)
      console.log('- Items count:', cimianData.items?.length || 0)
      
      if (cimianData.items && cimianData.items.length > 0) {
        cimianData.items.forEach((item, index) => {
          console.log(`- Item ${index + 1}: ${item.itemName || item.displayName}`)
          console.log(`  - latestVersion: ${item.latestVersion}`)
          console.log(`  - installedVersion: ${item.installedVersion}`)
          console.log(`  - version: ${item.version}`)
          console.log(`  - currentStatus: ${item.currentStatus}`)
        })
      }
    } else {
      console.log('❌ No Cimian data found')
      
      // Check if it's in a different location
      console.log('\n🔍 CHECKING ALTERNATE LOCATIONS:')
      console.log('- device.installs:', !!device.installs)
      if (device.installs) {
        console.log('- device.installs keys:', Object.keys(device.installs))
      }
      console.log('- installsModule full:', installsModule)
    }
  })
  .catch(error => {
    console.error('❌ Error fetching data:', error)
  })
