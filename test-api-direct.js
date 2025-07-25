const http = require('http');

// Test the API endpoint directly
const testData = {
  device: {
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    serialNumber: "TEST-12345",
    hostname: "test-machine",
    osVersion: "Windows 11",
    architecture: "x64",
    lastBootTime: "2025-01-24T01:00:00Z",
    uptime: 3600,
    timezone: "UTC"
  },
  collector: {
    version: "1.0.0",
    timestamp: "2025-01-24T01:00:00Z",
    executionTime: 1500
  },
  modules: {
    system: {
      cpu: { name: "Intel Core i7", cores: 8 },
      memory: { total: 16384, available: 8192 }
    },
    hardware: {
      disks: [{ name: "C:", size: 500000, free: 250000 }]
    }
  },
  events: [
    {
      timestamp: "2025-01-24T01:00:00Z",
      level: "success",
      module: "system",
      message: "Test event"
    }
  ]
};

// Test GET endpoint first
console.log('Testing GET /api/events...');
const getOptions = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/events',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const getReq = http.request(getOptions, (res) => {
  console.log(`GET Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('GET Response:', data);
    
    // Now test POST endpoint
    console.log('\nTesting POST /api/events...');
    const postData = JSON.stringify(testData);
    const postOptions = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const postReq = http.request(postOptions, (res) => {
      console.log(`POST Status: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('POST Response:', data);
      });
    });

    postReq.on('error', (err) => {
      console.error('POST Error:', err.message);
    });

    postReq.write(postData);
    postReq.end();
  });
});

getReq.on('error', (err) => {
  console.error('GET Error:', err.message);
  console.log('Server might not be running on port 3002. Let\'s try a simple connection test...');
});

getReq.end();
