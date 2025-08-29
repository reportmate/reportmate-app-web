// Quick test to debug network data processing
const { processNetworkData } = require('./src/lib/data-processing/component-data.ts');

// Test with sample device data structure
const testDevice = {
  serialNumber: 'TEST123',
  modules: {
    network: {
      interfaces: [
        {
          name: 'Ethernet',
          type: 'Ethernet',
          status: 'Active',
          ipAddress: '192.168.1.100',
          macAddress: '00:11:22:33:44:55'
        }
      ],
      hostname: 'TestDevice',
      gateway: '192.168.1.1',
      dns: '8.8.8.8'
    }
  }
};

console.log('Testing network data processing...');
try {
  const result = processNetworkData(testDevice);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error);
}
