// Test what the API is actually returning for installs data
const fetch = require('node-fetch');

async function testAPIResponse() {
  try {
    console.log('🔍 Testing API response...');
    
    // This is the Azure API URL that the frontend uses
    const apiUrl = 'https://reportmate-api.azurewebsites.net/api/device/0F33V9G25083HJ';
    
    console.log('🌐 Fetching from:', apiUrl);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received');
    console.log('📊 Top-level structure:', {
      hasSuccess: !!data.success,
      hasDevice: !!data.device,
      deviceKeys: data.device ? Object.keys(data.device) : []
    });
    
    if (data.device && data.device.modules) {
      console.log('📦 Modules available:', Object.keys(data.device.modules));
      
      if (data.device.modules.installs) {
        console.log('🎯 Installs module found!');
        console.log('🔍 Installs module structure:', {
          installsKeys: Object.keys(data.device.modules.installs),
          installsType: typeof data.device.modules.installs,
          installsStringified: JSON.stringify(data.device.modules.installs).substring(0, 1000) + '...'
        });
        
        // Check if it has Cimian data
        if (data.device.modules.installs.cimian) {
          console.log('🎯 Cimian data found in API response!');
          console.log('🔍 Cimian structure:', {
            cimianKeys: Object.keys(data.device.modules.installs.cimian),
            hasItems: !!data.device.modules.installs.cimian.items,
            itemsCount: data.device.modules.installs.cimian.items?.length || 0,
            hasConfig: !!data.device.modules.installs.cimian.config,
            hasPendingPackages: !!data.device.modules.installs.cimian.pendingPackages,
            pendingCount: data.device.modules.installs.cimian.pendingPackages?.length || 0
          });
          
          if (data.device.modules.installs.cimian.items) {
            console.log('📦 Sample Cimian items:');
            data.device.modules.installs.cimian.items.slice(0, 3).forEach((item, index) => {
              console.log(`   ${index + 1}. ${item.itemName || item.displayName} (${item.currentStatus})`);
            });
          }
          
          if (data.device.modules.installs.cimian.pendingPackages) {
            console.log('⏳ Pending packages:', data.device.modules.installs.cimian.pendingPackages.slice(0, 5));
          }
        } else {
          console.log('❌ No Cimian data in installs module');
          console.log('🔍 Full installs data (first 500 chars):', JSON.stringify(data.device.modules.installs).substring(0, 500));
        }
      } else {
        console.log('❌ No installs module found in API response');
      }
    } else {
      console.log('❌ No modules found in device data');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run the test
testAPIResponse();
