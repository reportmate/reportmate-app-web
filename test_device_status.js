async function testDeviceStatus() {
  try {
    console.log('Testing device API endpoint...');
    
    const response = await fetch('http://localhost:3004/api/devices', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const devices = await response.json();
    console.log(`✅ API returned ${devices.length} devices`);
    
    const testDevice = devices.find(d => d.serialNumber === 'TESTSERIAL0001');
    
    if (testDevice) {
      console.log('\n✅ Found test device:');
      console.log(`Name: ${testDevice.name}`);
      console.log(`Status: ${testDevice.status}`);
      console.log(`Serial: ${testDevice.serialNumber}`);
      console.log(`Last Seen: ${testDevice.lastSeen}`);
      
      // Calculate expected status
      const lastSeen = new Date(testDevice.lastSeen);
      const now = new Date();
      const hours = (now - lastSeen) / (1000 * 60 * 60);
      console.log(`\nHours since last seen: ${hours.toFixed(2)}`);
      console.log(`Expected status: ${hours <= 24 ? 'active' : hours <= 168 ? 'stale' : 'missing'}`);
      console.log(`✅ Status matches expected: ${testDevice.status === (hours <= 24 ? 'active' : hours <= 168 ? 'stale' : 'missing')}`);
      
      if (testDevice.status === 'active' && hours <= 24) {
        console.log('\n🎉 SUCCESS: Device status is correctly calculated as "active"!');
      } else {
        console.log('\n❌ ISSUE: Device status calculation is incorrect');
      }
    } else {
      console.log('\n❌ Test device not found in API response');
      console.log('Available devices:', devices.map(d => ({ name: d.name, serial: d.serialNumber, status: d.status })));
    }
    
  } catch (error) {
    console.error('❌ Error testing device status:', error.message);
  }
}

testDeviceStatus();
