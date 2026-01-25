#!/usr/bin/env node

const https = require('https');

const API_URL = 'https://reportmate-functions-api.blackdune-79551938.canadacentral.azurecontainerapps.io/api/devices/system?limit=5';
const API_PASSPHRASE = 'XmZ8Kp3NwQ7YtR9vC2LzH6FgDj4BlMnE';

console.log('Testing System API endpoint...');
console.log(`URL: ${API_URL}\n`);

const startTime = Date.now();

const options = {
  headers: {
    'X-API-PASSPHRASE': API_PASSPHRASE,
    'Content-Type': 'application/json'
  }
};

https.get(API_URL, options, (res) => {
  const elapsed = (Date.now() - startTime);
  console.log(`Response status: ${res.statusCode} (${elapsed}ms)`);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    console.log(`Received chunk: ${chunk.length} bytes`);
  });
  
  res.on('end', () => {
    const totalTime = Date.now() - startTime;
    console.log(`\nTotal time: ${totalTime}ms`);
    console.log(`Total data size: ${data.length} bytes`);
    
    try {
      const json = JSON.parse(data);
      console.log(`\nParsed JSON: ${Array.isArray(json) ? json.length : 'not an array'} items`);
      if (Array.isArray(json) && json.length > 0) {
        console.log('\nFirst item:', JSON.stringify(json[0], null, 2));
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error(`Request failed: ${e.message}`);
  process.exit(1);
}).on('timeout', () => {
  console.error('Request timed out after 30 seconds');
  process.exit(1);
}).setTimeout(30000);
